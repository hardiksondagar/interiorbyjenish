import { fileURLToPath } from 'node:url'
import path from 'node:path'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const P = {
  root: ROOT,
  source: path.join(ROOT, 'portfolio'),
  work: path.join(ROOT, '.work'),
  raster: path.join(ROOT, '.work/raster'),
  preview: path.join(ROOT, '.work/preview'),
  probe: path.join(ROOT, '.work/probe'),
  index: path.join(ROOT, '.work/index.json'),
  candidates: path.join(ROOT, '.work/candidates.json'),
  curation: path.join(ROOT, 'curation.json'),
  curationDoc: path.join(ROOT, 'CURATION.md'),
  masters: path.join(ROOT, 'src/assets/projects'),
  video: path.join(ROOT, 'public/media/video'),
  manifest: path.join(ROOT, 'src/data/manifest.json'),
}

/** Tools we shell out to. Pinned to the Homebrew prefix so a bare PATH can't
 *  silently pick up a different (or missing) build. */
export const BIN = {
  pdftoppm: '/opt/homebrew/bin/pdftoppm',
  pdfimages: '/opt/homebrew/bin/pdfimages',
  pdfinfo: '/opt/homebrew/bin/pdfinfo',
  ffmpeg: '/opt/homebrew/bin/ffmpeg',
  ffprobe: '/opt/homebrew/bin/ffprobe',
}
