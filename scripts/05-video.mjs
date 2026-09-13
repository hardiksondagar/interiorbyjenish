/** Stage 05 - video transcode.
 *  Emits, per project: a 1080p H.264 MP4, a VP9 WebM, and a poster frame.
 *  Plus one silent hero loop. Outputs land in public/media/video/ which is
 *  gitignored - hosting for these is still undecided.
 */
import path from 'node:path'
import fsp from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import sharp from 'sharp'
import { P, BIN } from './lib/paths.mjs'
import { TRIMS, HERO } from './lib/video-trims.mjs'
import { readJson, writeJson, ensure, exists, mb } from './lib/util.mjs'

const run = promisify(execFile)
const force = process.argv.includes('--force')
const skipWebm = process.argv.includes('--no-webm')   // VP9 is slow; allow opting out

const probe = await readJson(path.join(P.probe, 'videos.json'), [])
if (!probe.length) { console.error('Run 02-probe.mjs first.'); process.exit(1) }

await ensure(P.video)
await ensure(path.join(P.raster, '_posters'))

// Prune stale outputs: a project excluded in registry.mjs after an earlier run
// would otherwise leave orphaned MP4/WebM/poster files behind.
{
  const live = new Set(probe.filter((v) => !v.error).map((v) => v.slug))
  for (const f of await fsp.readdir(P.video)) {
    const m = f.match(/^(.+)-1080\.(mp4|webm)$/)
    if (m && !live.has(m[1])) {
      await fsp.unlink(path.join(P.video, f))
      console.log(`  pruned stale ${f}`)
    }
  }
  const pdir = path.join(P.raster, '_posters')
  for (const f of await fsp.readdir(pdir)) {
    if (!f.endsWith('.png')) continue
    if (!live.has(f.replace(/\.png$/, ''))) {
      await fsp.unlink(path.join(pdir, f))
      console.log(`  pruned stale poster ${f}`)
    }
  }
}

const trimArgs = (t) => (t ? ['-ss', String(t.start), '-t', String(t.duration)] : [])
const out = []

for (const v of probe.filter((x) => !x.error)) {
  const src = path.join(P.source, v.path)
  const t = TRIMS[v.slug]
  const mp4 = path.join(P.video, `${v.slug}-1080.mp4`)
  const webm = path.join(P.video, `${v.slug}-1080.webm`)
  const posterPng = path.join(P.raster, '_posters', `${v.slug}.png`)

  // --- MP4 (H.264). yuv420p + faststart are required for Safari/iOS and
  //     for playback to start before the whole file has downloaded. ---
  if (force || !(await exists(mp4))) {
    process.stdout.write(`  ${v.slug} mp4 ... `)
    await run(BIN.ffmpeg, ['-y', ...trimArgs(t), '-i', src,
      '-vf', "scale='min(1920,iw)':-2:flags=lanczos",
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p',
      '-profile:v', 'high', '-level', '4.0', '-g', '60',
      '-movflags', '+faststart',
      ...(v.hasAudio ? ['-c:a', 'aac', '-b:a', '128k', '-ac', '2'] : ['-an']),
      mp4], { maxBuffer: 1 << 26 })
    console.log(mb((await fsp.stat(mp4)).size))
  }

  // --- WebM (VP9) ---
  if (!skipWebm && (force || !(await exists(webm)))) {
    process.stdout.write(`  ${v.slug} webm ... `)
    await run(BIN.ffmpeg, ['-y', ...trimArgs(t), '-i', src,
      '-vf', "scale='min(1920,iw)':-2",
      '-c:v', 'libvpx-vp9', '-crf', '34', '-b:v', '0',
      '-row-mt', '1', '-cpu-used', '3', '-tile-columns', '2',
      ...(v.hasAudio ? ['-c:a', 'libopus', '-b:a', '96k'] : ['-an']),
      webm], { maxBuffer: 1 << 26 })
    console.log(mb((await fsp.stat(webm)).size))
  }

  // --- poster: sample across the trimmed range and keep the frame that most
  //     looks like a ROOM rather than a detail shot.
  //     A fixed offset gave a near-black poster for anusthan-harmony, and
  //     scoring on colourfulness swung the other way - it picked chandelier
  //     and diya close-ups, which are saturated but spatially empty.
  //     So: reward evenly-exposed frames with lots of spread-out edge detail
  //     (walls, ceilings, joinery) and penalise spotlit close-ups, which show
  //     a bright centre against dark surroundings. ---
  if (force || !(await exists(posterPng))) {
    const base = t?.start ?? 0
    const span = t?.duration ?? v.duration
    const fracs = [0.08, 0.18, 0.28, 0.38, 0.48, 0.58, 0.68, 0.78, 0.88]
    const tmpDir = path.join(P.raster, '_posters', '.cand')
    await ensure(tmpDir)
    let best = null
    for (const [i, f] of fracs.entries()) {
      const cand = path.join(tmpDir, `${v.slug}-${i}.png`)
      try {
        await run(BIN.ffmpeg, ['-y', '-ss', String(base + span * f), '-i', src,
          '-frames:v', '1', '-vf', "scale='min(1920,iw)':-2", '-q:v', '2', cand],
          { maxBuffer: 1 << 26 })

        const S = 64
        const g = await sharp(cand).greyscale().resize(S, S, { fit: 'fill' }).raw().toBuffer()

        // mean luminance, and how evenly it is spread over a 4x4 grid
        let mean = 0
        for (let k = 0; k < S * S; k++) mean += g[k]
        mean /= S * S

        const cells = new Array(16).fill(0)
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
          cells[Math.floor(y / (S / 4)) * 4 + Math.floor(x / (S / 4))] += g[y * S + x]
        }
        const per = (S / 4) * (S / 4)
        const cellMeans = cells.map((c) => c / per)
        const cellAvg = cellMeans.reduce((a, b) => a + b, 0) / 16
        const unevenness = Math.sqrt(cellMeans.reduce((a, m) => a + (m - cellAvg) ** 2, 0) / 16)

        // edge density: mean gradient magnitude, and the share of cells that
        // actually carry edges (a room has detail everywhere, a close-up does not)
        let grad = 0
        const cellEdge = new Array(16).fill(0)
        for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) {
          const gx = g[y * S + x + 1] - g[y * S + x - 1]
          const gy = g[(y + 1) * S + x] - g[(y - 1) * S + x]
          const m = Math.abs(gx) + Math.abs(gy)
          grad += m
          cellEdge[Math.floor(y / (S / 4)) * 4 + Math.floor(x / (S / 4))] += m
        }
        grad /= (S - 2) * (S - 2)
        const activeCells = cellEdge.filter((e) => e / per > 6).length

        const blownOrBlack = mean > 232 || mean < 48
        const score = blownOrBlack ? -1e6
          : grad * 6 + activeCells * 14 - unevenness * 1.4 - Math.abs(mean - 140) * 0.5

        if (!best || score > best.score) best = { score, cand, mean, grad, activeCells }
      } catch { /* a bad seek is not fatal; other offsets still apply */ }
    }
    if (best) {
      await fsp.copyFile(best.cand, posterPng)
    } else {
      await run(BIN.ffmpeg, ['-y', '-ss', String(base + span * 0.12), '-i', src,
        '-frames:v', '1', '-vf', "scale='min(1920,iw)':-2", '-q:v', '2', posterPng],
        { maxBuffer: 1 << 26 })
    }
  }

  // Drop a WebM that lost to H.264 on size - it would otherwise be served
  // preferentially and cost more bytes than the MP4 it replaces.
  if (await exists(webm)) {
    const [wb, mb4] = [(await fsp.stat(webm)).size, (await fsp.stat(mp4)).size]
    if (wb >= mb4) {
      await fsp.unlink(webm)
      console.log(`  ${v.slug}: webm (${mb(wb)}) >= mp4 (${mb(mb4)}), dropped`)
    }
  }

  const rec = { slug: v.slug, mp4: `/media/video/${path.basename(mp4)}`, poster: null,
    duration: t?.duration ?? v.duration, width: v.width, height: v.height,
    aspect: v.aspect, orientation: v.orientation,
    bytes: { mp4: (await fsp.stat(mp4)).size } }
  if (await exists(webm)) { rec.webm = `/media/video/${path.basename(webm)}`; rec.bytes.webm = (await fsp.stat(webm)).size }
  out.push(rec)
}

// --- silent hero loop ---
const heroSrc = probe.find((v) => v.slug === HERO.slug)
const heroOut = path.join(P.video, 'hero-loop.mp4')
const heroWebm = path.join(P.video, 'hero-loop.webm')
if (heroSrc && (force || !(await exists(heroOut)))) {
  process.stdout.write(`  hero-loop (from ${HERO.slug}) ... `)
  const src = path.join(P.source, heroSrc.path)
  await run(BIN.ffmpeg, ['-y', '-ss', String(HERO.start), '-t', String(HERO.duration), '-i', src,
    '-an', '-vf', "scale='min(1280,iw)':-2,fps=25",
    '-c:v', 'libx264', '-preset', 'veryslow', '-crf', '28', '-pix_fmt', 'yuv420p',
    '-g', '50', '-movflags', '+faststart', heroOut], { maxBuffer: 1 << 26 })
  await run(BIN.ffmpeg, ['-y', '-ss', String(HERO.start), '-t', String(HERO.duration), '-i', src,
    '-an', '-vf', "scale='min(1280,iw)':-2,fps=25",
    '-c:v', 'libvpx-vp9', '-crf', '40', '-b:v', '0', '-row-mt', '1', '-cpu-used', '3', heroWebm],
    { maxBuffer: 1 << 26 })
  console.log(`${mb((await fsp.stat(heroOut)).size)} mp4 / ${mb((await fsp.stat(heroWebm)).size)} webm`)
}

await writeJson(path.join(P.work, 'video.json'), { generatedAt: new Date().toISOString(), hero: HERO, videos: out })

console.log('\n  slug                      mp4        webm       dur')
console.log('  ' + '-'.repeat(56))
for (const v of out) {
  console.log(`  ${v.slug.padEnd(24)} ${mb(v.bytes.mp4).padStart(9)} ${(v.bytes.webm ? mb(v.bytes.webm) : '-').padStart(10)}  ${Math.round(v.duration)}s`)
}
const heavy = out.filter((v) => v.bytes.mp4 > 12 * 1048576)
if (heavy.length) console.log(`\n  WARNING over 12 MB (tighten the trim in scripts/lib/video-trims.mjs): ${heavy.map((v) => v.slug).join(', ')}`)
if (await exists(heroOut)) {
  const hb = (await fsp.stat(heroOut)).size
  console.log(`\n  hero-loop.mp4 ${mb(hb)}${hb > 2.5 * 1048576 ? '  WARNING over the 2.5 MB budget' : '  (within 2.5 MB budget)'}`)
}
