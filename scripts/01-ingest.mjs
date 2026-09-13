/** Stage 01 - ingest.
 *  Walks portfolio/, groups every source file under a canonical project slug,
 *  drops excluded + duplicate files, and writes .work/index.json.
 *
 *  Deliberately does NOT copy anything: the source tree is 5.3 GB and every
 *  later stage can read it in place. The index is the contract.
 */
import path from 'node:path'
import fsp from 'node:fs/promises'
import { P } from './lib/paths.mjs'
import { REGISTRY, LOOSE_MAP, SKIP_PROJECTS, isExcluded } from './lib/registry.mjs'
import {
  walk, slugify, isNameDuplicate, sha256, writeJson, mb,
  IMAGE_EXT, VIDEO_EXT, PDF_EXT,
} from './lib/util.mjs'

const kind = (f) => {
  const e = path.extname(f).toLowerCase()
  if (IMAGE_EXT.has(e)) return 'images'
  if (VIDEO_EXT.has(e)) return 'videos'
  if (PDF_EXT.has(e)) return 'pdfs'
  return null
}

const files = await walk(P.source)
if (!files.length) {
  console.error(`No source files under ${P.source}. Unzip the Drive exports there first.`)
  process.exit(1)
}

const projects = new Map()
const stats = { total: files.length, excluded: 0, nameDupe: 0, hashDupe: 0, empty: 0, unknown: 0, kept: 0 }
const seen = new Map()          // sha256 -> first path that claimed it
const unknownKeys = new Set()
const emptyFiles = []

const get = (key) => {
  if (!projects.has(key)) {
    const meta = REGISTRY[key]
    projects.set(key, {
      key,
      slug: meta?.slug ?? key,
      title: meta?.title ?? key,
      category: meta?.category ?? 'residential',
      type: meta?.type ?? '',
      locality: meta?.locality ?? 'Ahmedabad',
      city: meta?.city ?? 'Ahmedabad',
      client: meta?.client ?? null,
      featured: meta?.featured ?? false,
      images: [], pdfs: [], videos: [],
    })
  }
  return projects.get(key)
}

// Sort for deterministic "first wins" on hash collisions.
files.sort((a, b) => a.localeCompare(b, 'en'))

for (const abs of files) {
  const rel = path.relative(P.source, abs)
  const seg = rel.split(path.sep)
  const k = kind(abs)
  if (!k) continue

  // Project key: the folder directly under the part root, or the loose map.
  let key
  if (seg.length > 2) {
    key = slugify(seg[1])
  } else {
    key = LOOSE_MAP[slugify(path.basename(abs)) + path.extname(abs).toLowerCase()]
        ?? LOOSE_MAP[slugify(path.parse(abs).name) + path.extname(abs).toLowerCase()]
    if (!key) { unknownKeys.add(rel); stats.unknown++; continue }
  }

  if (SKIP_PROJECTS.has(key)) continue
  if (key === '_lookbook') { get('_lookbook').title = 'Lookbook (not a project)' }

  if (isExcluded(rel))        { stats.excluded++; continue }
  if (isNameDuplicate(abs))   { stats.nameDupe++; continue }

  const st = await fsp.stat(abs)
  // Zero-byte files are failed uploads, not assets. "K7 4K.pdf" is one, and
  // it makes pdfinfo/pdftoppm fail with "Document stream is empty".
  if (st.size === 0) { stats.empty++; emptyFiles.push(rel); continue }
  const hash = await sha256(abs)
  if (seen.has(hash)) { stats.hashDupe++; continue }
  seen.set(hash, rel)

  // Room / area label from the sub-folder, when the source provides one.
  const room = seg.length > 3 ? seg.slice(2, -1).join(' / ') : null

  get(key)[k].push({ path: rel, bytes: st.size, sha256: hash.slice(0, 16), room })
  stats.kept++
}

const out = {
  generatedAt: new Date().toISOString(),
  sourceRoot: path.relative(P.root, P.source),
  stats,
  projects: Object.fromEntries(
    [...projects.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => [k, v]),
  ),
}
await writeJson(P.index, out)

// ---- report ----
console.log(`\nScanned ${stats.total} files under portfolio/`)
console.log(`  kept ${stats.kept}  ·  excluded ${stats.excluded}  ·  "- Copy" ${stats.nameDupe}  ·  hash-dupes ${stats.hashDupe}  ·  empty ${stats.empty}  ·  unmapped ${stats.unknown}`)
if (emptyFiles.length) console.log('  zero-byte (skipped): ' + emptyFiles.join(', '))
if (unknownKeys.size) {
  console.log('\n  UNMAPPED loose files (add to LOOSE_MAP in scripts/lib/registry.mjs):')
  for (const u of unknownKeys) console.log('    ' + u)
}
console.log('\n  project                        img  pdf  vid   source size')
console.log('  ' + '-'.repeat(62))
let ti = 0, tp = 0, tv = 0
for (const p of projects.values()) {
  const bytes = [...p.images, ...p.pdfs, ...p.videos].reduce((n, f) => n + f.bytes, 0)
  ti += p.images.length; tp += p.pdfs.length; tv += p.videos.length
  console.log(`  ${p.slug.padEnd(28)} ${String(p.images.length).padStart(4)} ${String(p.pdfs.length).padStart(4)} ${String(p.videos.length).padStart(4)}   ${mb(bytes).padStart(9)}`)
}
console.log('  ' + '-'.repeat(62))
console.log(`  ${'TOTAL'.padEnd(28)} ${String(ti).padStart(4)} ${String(tp).padStart(4)} ${String(tv).padStart(4)}`)
console.log(`\n  -> ${path.relative(P.root, P.index)}`)
