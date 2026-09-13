import manifest from './manifest.json'
import { REGISTRY } from '../../scripts/lib/registry.mjs'

export type Category = 'residential' | 'office' | 'commercial'

export type GalleryImage = {
  src: ImageMetadata
  width: number
  height: number
  blur: string
  room: string | null
  alt: string
}

export type Project = {
  slug: string
  title: string
  category: Category
  categoryLabel: string
  type: string
  locality: string
  city: string
  /** "Gota, Ahmedabad", or just "Ahmedabad" when locality == city. */
  place: string
  client: string | null
  featured: boolean
  /** 'curated' once Jenish's picks are in curation.json, else 'auto'. */
  pickSource: string
  cover: GalleryImage
  gallery: GalleryImage[]
  video: { mp4: string; webm: string | null; duration: number; aspect: number } | null
}

/** Astro needs static knowledge of every image, so the masters are pulled in
 *  with a glob rather than a dynamic import. Keys look like
 *  '/src/assets/projects/<slug>/01.jpg'. */
const FILES = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/projects/**/*.jpg',
  { eager: true },
)

const byPath = new Map(
  Object.entries(FILES).map(([k, v]) => [k.replace(/^.*\/projects\//, ''), v.default]),
)

export const CATEGORY_LABEL: Record<Category, string> = {
  residential: 'Home',
  office: 'Office',
  commercial: 'Commercial',
}

/** Room labels come from PDF filenames, so they arrive as slugs, carry source
 *  typos ("confrance"), and in several cases are document codes rather than
 *  rooms. Anything not a recognised room resolves to null so we never surface
 *  a filename like "document-from-interiorbyjenish" to a visitor or a screen
 *  reader. Client children's names (Jeet, Kushal) become plain "Bedroom". */
const ROOM_LABELS: Record<string, string> = {
  confrance: 'Conference Room',
  'manager-cabin': "Manager's Cabin",
  staff: 'Staff Area',
  'work-station': 'Workstations',
  'jeet-room': 'Bedroom',
  'kushal-room': 'Bedroom',
  'boy-room': "Boy's Room",
  'girl-room': "Girl's Room",
  'guest-room': 'Guest Room',
  'master-bedroom-3': 'Master Bedroom',
  'master-bedroom-104': 'Master Bedroom',
  'kitchen-4': 'Kitchen',
  'kitchen-db-3d': 'Kitchen',
  'kitchen-vb-3d': 'Kitchen',
  'drawing-room': 'Drawing Room',
  entrance: 'Entrance',
  'conference-table': 'Conference Room',
  'main-boss-table': "Director's Cabin",
}

function roomLabel(raw: string | null): string | null {
  if (!raw) return null
  return ROOM_LABELS[raw] ?? null
}

/** Alt text built from the content model, never from a raw filename. */
function altFor(title: string, locality: string, room: string | null, i: number) {
  const where = room ? `${room} — ` : ''
  const n = room ? '' : ` view ${i + 1}`
  return `${where}${title}${n}, interior design by Interior by Jenish, ${locality}`
}

const META = Object.fromEntries(
  Object.values(REGISTRY as Record<string, any>).map((m) => [m.slug, m]),
)

export const PROJECTS: Project[] = Object.values(manifest.projects)
  .map((entry: any) => {
    const meta = META[entry.slug]
    if (!meta) return null

    const images: GalleryImage[] = entry.gallery
      .map((g: any, i: number) => {
        const src = byPath.get(`${entry.slug}/${g.file}`)
        if (!src) return null
        const room = roomLabel(g.room)
        return {
          src,
          width: g.width,
          height: g.height,
          blur: g.blur,
          room,
          alt: altFor(meta.title, meta.locality ?? 'Ahmedabad', room, i),
        }
      })
      .filter(Boolean) as GalleryImage[]

    if (!images.length) return null

    const locality = meta.locality ?? 'Ahmedabad'
    const city = meta.city ?? 'Ahmedabad'

    return {
      slug: entry.slug,
      title: meta.title,
      category: (meta.category ?? 'residential') as Category,
      categoryLabel: CATEGORY_LABEL[(meta.category ?? 'residential') as Category],
      type: meta.type ?? '',
      locality,
      city,
      place: locality === city ? city : `${locality}, ${city}`,
      client: meta.client ?? null,
      featured: !!meta.featured,
      pickSource: entry.source,
      cover: images[0],
      gallery: images,
      video: entry.video,
    } satisfies Project
  })
  .filter(Boolean) as Project[]

/** Order by strength: featured first, then deeper galleries. */
PROJECTS.sort(
  (a, b) =>
    Number(b.featured) - Number(a.featured) ||
    b.gallery.length - a.gallery.length ||
    a.title.localeCompare(b.title),
)

/** WorkGrid gives every 4th card the full-width slot, so interleave the
 *  featured projects onto those positions instead of stacking them all at the
 *  front where only the first would get the wide treatment. */
{
  const featured = PROJECTS.filter((p) => p.featured)
  const rest = PROJECTS.filter((p) => !p.featured)
  const out: Project[] = []
  let fi = 0
  let ri = 0
  for (let i = 0; out.length < PROJECTS.length; i++) {
    const wantFeatured = i % 4 === 0
    if (wantFeatured && fi < featured.length) out.push(featured[fi++])
    else if (ri < rest.length) out.push(rest[ri++])
    else if (fi < featured.length) out.push(featured[fi++])
  }
  PROJECTS.length = 0
  PROJECTS.push(...out)
}

export const FILM_PROJECTS = PROJECTS.filter((p) => p.video)

export const STATS = {
  projects: PROJECTS.length,
  images: PROJECTS.reduce((n, p) => n + p.gallery.length, 0),
  films: FILM_PROJECTS.length,
}

export const CATEGORIES: { key: 'all' | Category; label: string; count: number }[] = [
  { key: 'all', label: 'All Work', count: PROJECTS.length },
  { key: 'residential', label: 'Homes', count: PROJECTS.filter((p) => p.category === 'residential').length },
  { key: 'office', label: 'Offices', count: PROJECTS.filter((p) => p.category === 'office').length },
  { key: 'commercial', label: 'Commercial', count: PROJECTS.filter((p) => p.category === 'commercial').length },
]
