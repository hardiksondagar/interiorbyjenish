import fs from 'node:fs'
import fsp from 'node:fs/promises'
import crypto from 'node:crypto'
import path from 'node:path'

export const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png'])
export const VIDEO_EXT = new Set(['.mp4', '.mov', '.m4v'])
export const PDF_EXT = new Set(['.pdf'])

/** Slugify a messy source folder name.
 *  Source paths carry trailing spaces, double spaces and mixed case
 *  ("SP NIRWANA SHELA  B-1102", "Bakrol Aegis Stee Cast "), so every
 *  segment is trimmed before it is collapsed. */
export function slugify(s) {
  return s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Filenames that are near-duplicates by convention rather than by content.
 *  Deliberately does NOT match a trailing "(n)": verified against
 *  AMOGHA ADANI SHANTIGRAM and RR GANDHINAGAR B-703, where "2 (2).jpg",
 *  "2 (3).jpg" etc. are genuinely different renders with different hashes and
 *  dimensions. Only "- Copy" / "Copy of" are reliable duplicate markers here;
 *  everything else is left to SHA-256 content dedupe. */
export function isNameDuplicate(name) {
  return /\s-\s*copy\b|\bcopy of\b/i.test(path.parse(name).name)
}

export async function sha256(file) {
  const h = crypto.createHash('sha256')
  for await (const chunk of fs.createReadStream(file)) h.update(chunk)
  return h.digest('hex')
}

/** Recursive readdir. Uses fs, never shell globbing — the source tree has
 *  spaces and trailing spaces in directory names that break word splitting. */
export async function walk(dir, out = []) {
  let entries
  try { entries = await fsp.readdir(dir, { withFileTypes: true }) }
  catch { return out }
  for (const e of entries) {
    if (e.name === '.DS_Store' || e.name.startsWith('._')) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) await walk(full, out)
    else if (e.isFile()) out.push(full)
  }
  return out
}

export const ensure = (d) => fsp.mkdir(d, { recursive: true })
export const readJson = async (f, fallback = null) => {
  try { return JSON.parse(await fsp.readFile(f, 'utf8')) } catch { return fallback }
}
export const writeJson = async (f, data) => {
  await ensure(path.dirname(f))
  await fsp.writeFile(f, JSON.stringify(data, null, 2) + '\n')
}
export const exists = async (f) => { try { await fsp.access(f); return true } catch { return false } }
export const mb = (b) => (b / 1048576).toFixed(1) + ' MB'
