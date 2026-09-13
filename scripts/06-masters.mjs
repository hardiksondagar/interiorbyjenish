/** Stage 06 - promote curated picks to committed masters + manifest.
 *
 *  Reads curation.json (Jenish's keeper list) when present. Until it exists,
 *  auto-picks so the site has real content to build against - the auto-pick is
 *  explicitly provisional and reported as such.
 *
 *  curation.json shape - numbers match CURATION.md / preview filenames:
 *    { "skylon-residency": [2,3,4,6,7,9], "corporate-office": [2,3,5] }
 *
 *  Masters are 2400px JPEG in src/assets/projects/ so Astro's <Picture> can
 *  re-encode them to responsive AVIF/WebP at build time.
 */
import path from 'node:path'
import fsp from 'node:fs/promises'
import os from 'node:os'
import sharp from 'sharp'
import { P } from './lib/paths.mjs'
import { LOW_RES_EXCLUDE } from './lib/video-trims.mjs'
import { readJson, writeJson, ensure, exists } from './lib/util.mjs'

const force = process.argv.includes('--force')
const MASTER_W = 2400
const AUTO_MAX = 9            // provisional picks per project

const cand = await readJson(P.candidates)
if (!cand) { console.error('Run 04-previews.mjs first.'); process.exit(1) }
const curation = await readJson(P.curation)
const video = await readJson(path.join(P.work, 'video.json'), { videos: [] })
const videoBySlug = new Map(video.videos.map((v) => [v.slug, v]))

/** Provisional ranking when no human list exists yet. */
function autoPick(items) {
  const usable = items.filter((i) => !i.error && !i.flag && !i.dupeOf && i.width >= 1200)
  const scored = usable.map((i) => {
    let s = 0
    const a = i.aspect ?? 1
    s -= Math.abs(a - 1.777) * 3        // prefer 16:9
    s += Math.min(i.width, 3000) / 2000 // prefer higher resolution
    s += i.saturation / 40              // prefer colourful renders over pale plans
    return { i, s }
  }).sort((x, y) => y.s - x.s)
  return scored.slice(0, AUTO_MAX).map((x) => x.i)
    .sort((a, b) => Number(a.id) - Number(b.id))
}

const CONC = Math.max(2, Math.min(6, os.cpus().length - 2))
const manifest = { generatedAt: new Date().toISOString(), curated: !!curation, projects: {} }
let written = 0, reused = 0
const report = []

// Projects whose only asset is a video: the poster frame stands in as cover.
const videoOnly = video.videos
  .filter((v) => !cand.projects.some((p) => p.slug === v.slug && p.items.length))
  .filter((v) => !LOW_RES_EXCLUDE.has(v.slug))
  .map((v) => ({
    slug: v.slug, items: [{
      id: '001', kind: 'poster', rel: path.relative(P.root, path.join(P.raster, '_posters', `${v.slug}.png`)),
      width: v.width, height: v.height, aspect: v.aspect, saturation: 30, flag: null, dupeOf: null, room: null,
    }],
  }))

for (const p of [...cand.projects, ...videoOnly]) {
  if (p.slug === '_lookbook') continue
  const byId = new Map(p.items.map((i) => [Number(i.id), i]))
  let picks, source
  const list = curation?.[p.slug]
  if (Array.isArray(list) && list.length) {
    picks = list.map((n) => byId.get(Number(n))).filter(Boolean)
    source = 'curated'
  } else {
    picks = autoPick(p.items)
    source = 'auto'
  }
  if (!picks.length) { report.push({ slug: p.slug, n: 0, source: 'EMPTY' }); continue }

  const outDir = path.join(P.masters, p.slug)
  await ensure(outDir)
  const entries = []
  const queue = picks.map((it, idx) => ({ it, idx }))

  await Promise.all(Array.from({ length: CONC }, async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      const { it, idx } = job
      const name = `${String(idx + 1).padStart(2, '0')}.jpg`
      const out = path.join(outDir, name)
      const src = (it.kind === 'raster' || it.kind === 'poster')
        ? path.join(P.root, it.rel)
        : path.join(P.source, it.rel)
      try {
        if (force || !(await exists(out))) {
          await sharp(src, { failOn: 'none', limitInputPixels: 0 })
            .rotate()
            .resize({ width: MASTER_W, height: MASTER_W, fit: 'inside',
                      withoutEnlargement: true, kernel: 'lanczos3' })
            .jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: '4:2:0' })
            .toFile(out)
          written++
        } else reused++
        const meta = await sharp(out).metadata()
        // LQIP: 20px wide WebP, inlined as a data URI in the manifest.
        const blur = await sharp(out).resize({ width: 20 }).webp({ quality: 20 }).toBuffer()
        entries[idx] = {
          file: name,
          width: meta.width, height: meta.height,
          bytes: (await fsp.stat(out)).size,
          blur: `data:image/webp;base64,${blur.toString('base64')}`,
          room: it.kind === 'raster' && it.room && !/^page/.test(it.room) ? it.room : null,
          source: it.rel,
          previewId: it.id,
        }
      } catch (e) {
        report.push({ slug: p.slug, error: `${name}: ${String(e.message).slice(0, 90)}` })
      }
    }
  }))

  const gallery = entries.filter(Boolean)
  const v = videoBySlug.get(p.slug)
  manifest.projects[p.slug] = {
    slug: p.slug, source,
    gallery,
    video: v && !LOW_RES_EXCLUDE.has(p.slug)
      ? { mp4: v.mp4, webm: v.webm ?? null, duration: Math.round(v.duration), aspect: v.aspect }
      : null,
  }
  report.push({ slug: p.slug, n: gallery.length, source, video: !!manifest.projects[p.slug].video })
}

await writeJson(P.manifest, manifest)

console.log(`\n  ${written} masters written · ${reused} reused`)
console.log(`  curation.json: ${curation ? 'FOUND - using Jenish\'s picks' : 'not present - using PROVISIONAL auto-picks'}`)
console.log('\n  project                        imgs  source      video')
console.log('  ' + '-'.repeat(58))
for (const r of report.filter((r) => !r.error)) {
  console.log(`  ${r.slug.padEnd(30)} ${String(r.n).padStart(4)}  ${(r.source ?? '').padEnd(11)} ${r.video ? 'yes' : ''}`)
}
const errs = report.filter((r) => r.error)
if (errs.length) { console.log('\n  ERRORS:'); errs.forEach((e) => console.log(`    ${e.slug} ${e.error}`)) }
const totalBytes = Object.values(manifest.projects).flatMap((p) => p.gallery).reduce((n, g) => n + g.bytes, 0)
const count = Object.values(manifest.projects).flatMap((p) => p.gallery).length
console.log(`\n  ${count} masters · ${(totalBytes / 1048576).toFixed(1)} MB committed to git`)
const big = Object.values(manifest.projects).flatMap((p) => p.gallery).filter((g) => g.bytes > 900_000)
if (big.length) console.log(`  ${big.length} masters over 900 KB (largest ${(Math.max(...big.map((b) => b.bytes)) / 1024).toFixed(0)} KB)`)
