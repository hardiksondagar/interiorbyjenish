/** Stage 04 - candidate previews + curation sheet.
 *
 *  Emits a browsable JPEG preview of every candidate image (source photos and
 *  rasterized PDF pages) so Jenish can flip through them in Finder and send
 *  back a keeper list. Also scores each candidate so the obvious non-renders
 *  are pre-flagged rather than left for a human to notice 380 times.
 *
 *  Confirmed by inspection of the source: the numbered JPGs are exported deck
 *  slides, so the pool contains title cards ("A-501 - SKYLON RESIDENCY"),
 *  section dividers and AR/VR QR-code pages alongside the actual renders.
 */
import path from 'node:path'
import fsp from 'node:fs/promises'
import os from 'node:os'
import sharp from 'sharp'
import { P } from './lib/paths.mjs'
import { readJson, writeJson, walk, ensure, exists } from './lib/util.mjs'

const force = process.argv.includes('--force')
const PREVIEW_W = 1400

const index = await readJson(P.index)
if (!index) { console.error('Run 01-ingest.mjs first.'); process.exit(1) }

const natural = (a, b) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' })

/** Perceptual stats used to pre-flag non-renders. */
async function analyse(buf) {
  const img = sharp(buf, { failOn: 'none' })
  const meta = await img.metadata()
  const small = sharp(buf, { failOn: 'none' }).resize(64, 64, { fit: 'fill' })
  const { data } = await small.clone().removeAlpha().raw().toBuffer({ resolveWithObject: true })
  let nearWhite = 0, sumSat = 0
  const n = 64 * 64
  for (let i = 0; i < n; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2]
    if (r > 236 && g > 236 && b > 236) nearWhite++
    sumSat += Math.max(r, g, b) - Math.min(r, g, b)
  }
  // dHash: 9x8 greyscale, compare each pixel to its right neighbour.
  const gray = await sharp(buf, { failOn: 'none' }).greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer()
  let hash = 0n
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    hash = (hash << 1n) | (gray[y * 9 + x] > gray[y * 9 + x + 1] ? 1n : 0n)
  }
  return {
    width: meta.width, height: meta.height,
    aspect: meta.width && meta.height ? +(meta.width / meta.height).toFixed(3) : null,
    nearWhite: +(nearWhite / n).toFixed(3),
    saturation: Math.round(sumSat / n),
    dhash: hash.toString(16).padStart(16, '0'),
  }
}

const popcount = (x) => { let c = 0; while (x) { x &= x - 1n; c++ } return c }
const hamming = (a, b) => popcount(BigInt('0x' + a) ^ BigInt('0x' + b))

/** A candidate is flagged when it almost certainly isn't a render. */
function flag(s) {
  if (s.nearWhite >= 0.72) return 'mostly-blank'          // title card / QR page / divider
  if (s.saturation <= 8 && s.nearWhite >= 0.45) return 'line-drawing'
  if (s.aspect && (s.aspect < 0.45 || s.aspect > 3.2)) return 'odd-aspect'
  if (s.width < 900) return 'low-res'
  return null
}

// ---- collect candidates per project ----
const projects = []
for (const p of Object.values(index.projects)) {
  const items = []
  for (const im of [...p.images].sort((a, b) => natural(a.path, b.path))) {
    items.push({ kind: 'source', src: path.join(P.source, im.path), rel: im.path, room: im.room })
  }
  const rdir = path.join(P.raster, p.slug)
  if (await exists(rdir)) {
    const pages = (await walk(rdir)).filter((f) => f.endsWith('.png')).sort(natural)
    for (const f of pages) {
      items.push({ kind: 'raster', src: f, rel: path.relative(P.root, f), room: path.basename(path.dirname(f)) })
    }
  }
  if (items.length) projects.push({ ...p, items })
}

const CONC = Math.max(2, Math.min(8, os.cpus().length - 2))
let made = 0, skipped = 0, total = projects.reduce((n, p) => n + p.items.length, 0)
const failures = []

for (const p of projects) {
  const outDir = path.join(P.preview, p.slug)
  await ensure(outDir)
  p.items.forEach((it, i) => { it.n = i + 1 })
  const queue = [...p.items]   // same object references, so stats land on p.items
  await Promise.all(Array.from({ length: CONC }, async () => {
    for (let it = queue.shift(); it; it = queue.shift()) {
      const id = String(it.n).padStart(3, '0')
      const out = path.join(outDir, `${id}.jpg`)
      try {
        if (force || !(await exists(out))) {
          await sharp(it.src, { failOn: 'none', limitInputPixels: 0 })
            .rotate()
            .resize({ width: PREVIEW_W, withoutEnlargement: true })
            .jpeg({ quality: 76, mozjpeg: true })
            .toFile(out)
          made++
        } else skipped++
        const buf = await fsp.readFile(out)
        Object.assign(it, await analyse(buf), { id, preview: path.relative(P.root, out) })
        it.flag = flag(it)
      } catch (e) {
        failures.push(`${p.slug}/${id} ${it.rel}: ${String(e.message).slice(0, 100)}`)
        it.error = true
      }
      const seen = made + skipped
      if (seen % 25 === 0 || seen === total) process.stdout.write(`\r  previews ${seen}/${total}   `)
    }
  }))
}

// ---- near-duplicate clustering within each project ----
for (const p of projects) {
  const ok = p.items.filter((i) => i.dhash)
  for (const it of ok) it.dupeOf = null
  for (let i = 0; i < ok.length; i++) {
    if (ok[i].dupeOf) continue
    for (let j = i + 1; j < ok.length; j++) {
      if (ok[j].dupeOf) continue
      if (hamming(ok[i].dhash, ok[j].dhash) <= 5) ok[j].dupeOf = ok[i].id
    }
  }
}

await writeJson(P.candidates, {
  generatedAt: new Date().toISOString(),
  previewWidth: PREVIEW_W,
  projects: projects.map((p) => ({
    slug: p.slug, title: p.title, category: p.category, locality: p.locality,
    items: p.items.map(({ src, ...rest }) => rest),
  })),
})

// ---- CURATION.md ----
const L = []
L.push('# Curation sheet', '')
L.push('Generated by `npm run assets`. Browse the preview folders in Finder, then send back a keeper list per project.')
L.push('')
L.push('```')
L.push('anusthan-bungalow: 2,3,5,9,14')
L.push('skylon-residency: 4,6,7,11')
L.push('```')
L.push('')
L.push('Notes on the columns:')
L.push('')
L.push('- **#** matches the preview filename, e.g. `007` is `007.jpg`.')
L.push('- **flag** is a guess, not a verdict. `mostly-blank` is usually a title card or an AR/VR QR page; `line-drawing` is usually a 2D layout. Override freely.')
L.push('- **dupe of** means near-identical to that number (perceptual hash), so you probably want only one of the pair.')
L.push('')
const totals = { flagged: 0, dupes: 0, clean: 0 }
for (const p of projects) {
  const dir = path.relative(P.root, path.join(P.preview, p.slug))
  L.push(`## ${p.title}`)
  L.push('')
  L.push(`\`${p.slug}\` · ${p.category} · ${p.locality} · ${p.items.length} candidates`)
  L.push('')
  L.push(`Previews: \`${dir}/\``)
  L.push('')
  L.push('| # | px | flag | dupe of | source |')
  L.push('|---|---|---|---|---|')
  for (const it of p.items) {
    if (it.error) { L.push(`| ${it.id} | — | READ ERROR | | \`${it.rel}\` |`); continue }
    if (it.flag) totals.flagged++; else if (it.dupeOf) totals.dupes++; else totals.clean++
    const room = it.room && it.kind === 'raster' ? ` _(${it.room})_` : ''
    L.push(`| ${it.id} | ${it.width}×${it.height} | ${it.flag ?? ''} | ${it.dupeOf ?? ''} | \`${path.basename(it.rel)}\`${room} |`)
  }
  L.push('')
  L.push(`**keep:** `)
  L.push('')
}
await fsp.writeFile(P.curationDoc, L.join('\n'))

console.log(`\n\n  ${made} previews written · ${skipped} reused · ${total} candidates`)
console.log(`  clean ${totals.clean} · flagged ${totals.flagged} · near-dupes ${totals.dupes}`)
if (failures.length) { console.log('\n  FAILURES:'); failures.slice(0, 10).forEach((f) => console.log('    ' + f)) }
console.log(`\n  -> CURATION.md`)
console.log(`  -> .work/preview/<slug>/NNN.jpg`)
