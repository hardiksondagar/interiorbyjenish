/** Stage 02 - probe.
 *  ffprobe every video and pdfinfo every PDF before anything expensive runs.
 *  This answers two questions the pipeline cannot guess:
 *    - video orientation + duration -> is there a landscape hero walkthrough?
 *    - PDF page count -> how many rasters stage 03 will produce.
 */
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { P, BIN } from './lib/paths.mjs'
import { readJson, writeJson } from './lib/util.mjs'

const run = promisify(execFile)
const index = await readJson(P.index)
if (!index) { console.error('Run 01-ingest.mjs first.'); process.exit(1) }

const videos = [], pdfs = []

for (const p of Object.values(index.projects)) {
  for (const v of p.videos) videos.push({ slug: p.slug, ...v })
  for (const d of p.pdfs) pdfs.push({ slug: p.slug, ...d })
}

// ---- videos ----
const vOut = []
for (const v of videos) {
  const abs = path.join(P.source, v.path)
  try {
    const { stdout } = await run(BIN.ffprobe, [
      '-v', 'error', '-print_format', 'json',
      '-show_entries', 'format=duration,bit_rate:stream=codec_type,codec_name,width,height,r_frame_rate,side_data_list',
      abs,
    ], { maxBuffer: 1 << 24 })
    const j = JSON.parse(stdout)
    const vs = (j.streams || []).find((s) => s.codec_type === 'video') || {}
    const as = (j.streams || []).find((s) => s.codec_type === 'audio')
    // A rotation side-data entry means stored dimensions are pre-rotation.
    const rot = Math.abs(Number(vs.side_data_list?.[0]?.rotation ?? 0)) % 180
    const w = rot === 90 ? vs.height : vs.width
    const h = rot === 90 ? vs.width : vs.height
    vOut.push({
      slug: v.slug, path: v.path, bytes: v.bytes,
      duration: Number(j.format?.duration ?? 0),
      width: w, height: h,
      aspect: w && h ? +(w / h).toFixed(3) : null,
      orientation: !w || !h ? 'unknown' : w / h > 1.2 ? 'landscape' : w / h < 0.85 ? 'portrait' : 'square',
      codec: vs.codec_name, hasAudio: !!as, rotation: rot,
    })
  } catch (e) { vOut.push({ slug: v.slug, path: v.path, error: String(e.message).slice(0, 160) }) }
}

// ---- pdfs ----
const pOut = []
for (const d of pdfs) {
  const abs = path.join(P.source, d.path)
  try {
    const { stdout } = await run(BIN.pdfinfo, [abs], { maxBuffer: 1 << 22 })
    const get = (k) => stdout.match(new RegExp('^' + k + ':\\s*(.+)$', 'm'))?.[1]?.trim()
    const size = get('Page size') || ''
    pOut.push({
      slug: d.slug, path: d.path, bytes: d.bytes,
      pages: Number(get('Pages') ?? 0),
      pageSize: size,
      producer: get('Producer') || get('Creator') || null,
    })
  } catch (e) { pOut.push({ slug: d.slug, path: d.path, error: String(e.message).slice(0, 160) }) }
}

await writeJson(path.join(P.probe, 'videos.json'), vOut)
await writeJson(path.join(P.probe, 'pdfs.json'), pOut)

// ---- report ----
console.log('\nVIDEOS')
console.log('  ' + 'slug'.padEnd(24) + 'dur'.padStart(7) + '  ' + 'WxH'.padEnd(12) + 'orient'.padEnd(11) + 'aud  codec')
console.log('  ' + '-'.repeat(72))
for (const v of vOut.sort((a, b) => a.slug.localeCompare(b.slug))) {
  if (v.error) { console.log(`  ${v.slug.padEnd(24)} ERROR ${v.error}`); continue }
  const d = `${Math.floor(v.duration / 60)}:${String(Math.round(v.duration % 60)).padStart(2, '0')}`
  console.log(`  ${v.slug.padEnd(24)}${d.padStart(7)}  ${`${v.width}x${v.height}`.padEnd(12)}${v.orientation.padEnd(11)}${(v.hasAudio ? 'yes' : 'no ').padEnd(5)}${v.codec}`)
}

const totalPages = pOut.reduce((n, p) => n + (p.pages || 0), 0)
console.log('\nPDFS  (' + pOut.length + ' files, ' + totalPages + ' pages total -> stage 03 raster count)')
console.log('  ' + 'slug'.padEnd(24) + 'pages'.padStart(6) + '  file')
console.log('  ' + '-'.repeat(72))
for (const d of pOut.sort((a, b) => a.slug.localeCompare(b.slug) || a.path.localeCompare(b.path))) {
  if (d.error) { console.log(`  ${d.slug.padEnd(24)} ERROR ${d.error}`); continue }
  console.log(`  ${d.slug.padEnd(24)}${String(d.pages).padStart(6)}  ${path.basename(d.path)}`)
}

const land = vOut.filter((v) => v.orientation === 'landscape')
console.log(`\nHero candidates (landscape): ${land.length ? land.map((v) => v.slug).join(', ') : 'NONE - hero must use a still render'}`)
