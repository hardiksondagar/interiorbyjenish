/** Stage 03 - rasterize PDFs.
 *  The office/commercial work (Aegis Steel Cast, Office 434) and several
 *  residential decks exist ONLY as PDF, so this stage is what makes those
 *  projects showable at all.
 *
 *  Uses -scale-to-x rather than -r: these decks mix page sizes, so a fixed DPI
 *  would produce wildly different pixel widths. Idempotent - skips a PDF whose
 *  output dir already holds the expected page count.
 */
import path from 'node:path'
import fsp from 'node:fs/promises'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { P, BIN } from './lib/paths.mjs'
import { readJson, ensure, exists } from './lib/util.mjs'

const run = promisify(execFile)
const force = process.argv.includes('--force')
const WIDTH = 2560

const index = await readJson(P.index)
const probe = await readJson(path.join(P.probe, 'pdfs.json'), [])
if (!index || !probe.length) { console.error('Run 01-ingest.mjs and 02-probe.mjs first.'); process.exit(1) }

const pageCount = new Map(probe.map((p) => [p.path, p.pages]))

const jobs = []
for (const p of Object.values(index.projects)) {
  for (const d of p.pdfs) {
    const pages = pageCount.get(d.path) ?? 0
    if (!pages) continue
    // Output dir per source doc so pages from different decks never collide.
    const docKey = path.basename(d.path, path.extname(d.path))
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    jobs.push({ slug: p.slug, src: d.path, pages, out: path.join(P.raster, p.slug, docKey), docKey })
  }
}

const CONCURRENCY = Math.max(2, Math.min(6, os.cpus().length - 2))
let done = 0, skipped = 0, produced = 0, failed = []

async function rasterize(job) {
  await ensure(job.out)
  const existing = (await fsp.readdir(job.out)).filter((f) => f.endsWith('.png'))
  if (!force && existing.length >= job.pages) { skipped++; done++; return }
  for (const f of existing) await fsp.unlink(path.join(job.out, f))

  try {
    await run(BIN.pdftoppm, [
      '-png', '-cropbox',
      '-scale-to-x', String(WIDTH), '-scale-to-y', '-1',
      path.join(P.source, job.src),
      path.join(job.out, 'page'),
    ], { maxBuffer: 1 << 26 })
    const made = (await fsp.readdir(job.out)).filter((f) => f.endsWith('.png')).length
    produced += made
    if (!made) failed.push(`${job.slug}/${job.docKey}: produced 0 pages`)
  } catch (e) {
    failed.push(`${job.slug}/${job.docKey}: ${String(e.message).split('\n')[0].slice(0, 120)}`)
  }
  done++
  process.stdout.write(`\r  rasterizing ${done}/${jobs.length}  (${produced} pages)   `)
}

console.log(`\nRasterizing ${jobs.length} PDFs -> ${jobs.reduce((n, j) => n + j.pages, 0)} pages @ ${WIDTH}px wide, ${CONCURRENCY} parallel`)
const queue = [...jobs]
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  for (let j = queue.shift(); j; j = queue.shift()) await rasterize(j)
}))

console.log(`\n\n  ${produced} pages written · ${skipped} PDFs skipped (already rasterized)`)
if (failed.length) { console.log('\n  FAILURES:'); failed.forEach((f) => console.log('    ' + f)) }

// Per-project summary so the office projects can be eyeballed immediately.
console.log('\n  project                      raster pages')
console.log('  ' + '-'.repeat(42))
for (const p of Object.values(index.projects)) {
  const dir = path.join(P.raster, p.slug)
  if (!(await exists(dir))) continue
  let n = 0
  for (const d of await fsp.readdir(dir)) {
    n += (await fsp.readdir(path.join(dir, d))).filter((f) => f.endsWith('.png')).length
  }
  if (n) console.log(`  ${p.slug.padEnd(28)} ${String(n).padStart(5)}`)
}
