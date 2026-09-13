/** Stage 07 - Open Graph images.
 *  One 1200x630 card per project plus a default, composited from the project
 *  cover with a scrim and the project title. Uses fit:'cover' with
 *  position:'attention' so the crop favours the busy part of the render
 *  rather than a blank ceiling.
 */
import path from 'node:path'
import fsp from 'node:fs/promises'
import sharp from 'sharp'
import { P } from './lib/paths.mjs'
import { REGISTRY } from './lib/registry.mjs'
import { readJson, ensure } from './lib/util.mjs'

const OG = path.join(P.root, 'public/og')
const W = 1200, H = 630
const manifest = await readJson(P.manifest)
if (!manifest) { console.error('Run 06-masters.mjs first.'); process.exit(1) }

await ensure(OG)
const META = Object.fromEntries(Object.values(REGISTRY).map((m) => [m.slug, m]))

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function overlay(title, kicker) {
  // Scrim + text as one SVG layer. DM Mono / Fraunces are not available to
  // librsvg, so the overlay uses generic families - it only ever renders as
  // a flat image, never as live text.
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><linearGradient id="s" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#1C1A17" stop-opacity="0.92"/>
      <stop offset="55%" stop-color="#1C1A17" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#1C1A17" stop-opacity="0.12"/>
    </linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#s)"/>
    <text x="64" y="${H - 132}" font-family="monospace" font-size="21"
          letter-spacing="3" fill="#C4AB8E">${esc(kicker.toUpperCase())}</text>
    <text x="60" y="${H - 64}" font-family="Georgia, serif" font-size="62"
          fill="#F5F1EA">${esc(title)}</text>
  </svg>`)
}

let n = 0
for (const [slug, entry] of Object.entries(manifest.projects)) {
  const meta = META[slug]
  const cover = entry.gallery?.[0]
  if (!meta || !cover) continue
  const src = path.join(P.masters, slug, cover.file)
  const locality = meta.locality ?? 'Ahmedabad'
  const city = meta.city ?? 'Ahmedabad'
  const place = locality === city ? city : `${locality}, ${city}`
  await sharp(src)
    .resize(W, H, { fit: 'cover', position: 'attention' })
    .composite([{ input: overlay(meta.title, `Interior by Jenish · ${place}`) }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(OG, `${slug}.jpg`))
  n++
}

// Default card: the strongest featured cover we have.
const firstFeatured = Object.keys(manifest.projects)
  .find((s) => META[s]?.featured && manifest.projects[s].gallery?.length)
  ?? Object.keys(manifest.projects).find((s) => manifest.projects[s].gallery?.length)
if (firstFeatured) {
  const g = manifest.projects[firstFeatured].gallery[0]
  await sharp(path.join(P.masters, firstFeatured, g.file))
    .resize(W, H, { fit: 'cover', position: 'attention' })
    .composite([{ input: overlay('Interior by Jenish', 'Interior Design · Ahmedabad') }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(OG, 'default.jpg'))
  n++
}

const sizes = await Promise.all((await fsp.readdir(OG)).map(async (f) => (await fsp.stat(path.join(OG, f))).size))
console.log(`  ${n} OG cards -> public/og/  (largest ${(Math.max(...sizes) / 1024).toFixed(0)} KB)`)
