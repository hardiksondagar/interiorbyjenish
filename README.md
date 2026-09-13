# Interior by Jenish — portfolio site

Static portfolio for **Interior by Jenish** (IBJ), an interior design studio in
Ahmedabad. Astro 7 + Tailwind 4, static output, no backend.

The work is the home page: every project, its gallery, the walkthrough films and
the Instagram feed all live on `/`. Per-project pages exist at `/work/<slug>/`
for SEO and for sharing a single project over WhatsApp.

---

## Quick start

```bash
nvm use              # Node 22 — Astro 7 requires >=22.12
npm install
npm run dev          # http://localhost:4321
npm run build        # -> dist/
npm run preview
```

## Business details

All in **`src/lib/site.ts`** — one file feeds the WhatsApp deep links, `tel:`
and `mailto:` links, the Google Maps link and the LocalBusiness schema:

```
+91 90996 02735
interiorbyjenish@gmail.com
3 Sharnam Arise, Opp Nakshtra Aspire, Pooja Farm Road,
New Narol, Ahmedabad 382405
@interiorbyjenish
```

Two things there still worth a look:

- **`geo` is approximate** (22.9564, 72.6042 — New Narol, not the building).
  Replace it with the exact pin from Google Maps so the schema points at the
  studio rather than the neighbourhood.
- The address says **"Nakshtra Aspire"** as supplied. If the scheme is actually
  spelled *Nakshatra*, fix it in `site.ts` — it's a landmark people navigate
  by, and it feeds the Maps link.

---

## Asset pipeline

The raw material is ~5.3 GB of Google Drive exports in `portfolio/`
(gitignored): high-resolution renders, presentation PDFs and walkthrough
videos. None of it is web-usable as-is, so `scripts/` turns it into committed,
optimised assets.

```bash
npm run assets        # full run, incremental
bash scripts/run-all.sh --force   # re-encode everything
```

| Stage | Script | What it does |
|---|---|---|
| 01 | `01-ingest.mjs` | Groups every source file under a canonical project slug. Drops technical drawings, `- Copy` files, zero-byte files and SHA-256 duplicates. Writes `.work/index.json`. Copies nothing. |
| 02 | `02-probe.mjs` | `ffprobe` every video, `pdfinfo` every PDF. Answers video orientation and PDF page counts before anything expensive runs. |
| 03 | `03-raster.mjs` | `pdftoppm` each PDF to 2560px PNGs. **This is what makes the office projects showable at all** — Aegis Steel Cast and Office 434 exist only as PDF. |
| 04 | `04-previews.mjs` | 1400px JPEG preview of every candidate + `CURATION.md`. Flags likely non-renders and clusters near-duplicates by perceptual hash. |
| 05 | `05-video.mjs` | 1080p H.264 at CRF 30 + a scored poster frame, plus the silent hero loop. One film per project (the longest). Trims in `scripts/lib/video-trims.mjs`. |
| 06 | `06-masters.mjs` | Promotes the curated picks to 2400px JPEG masters in `src/assets/projects/` and writes `src/data/manifest.json` with dimensions and LQIP. |
| 07 | `07-og.mjs` | One 1200×630 Open Graph card per project. |

Re-running is safe: each stage skips work whose output already exists, and
nothing overwrites `curation.json`.

### Video settings, and why VP9 is off

Films are 1080p H.264 at **CRF 30**, trimmed to ~35-45s. They are click-to-play
with `preload="none"`, so length only costs bandwidth when someone watches.
Current set: 5 films, **41 MB committed**.

**VP9/WebM is off by default** (`--webm` re-enables it). Measured across all
six encodes on this material, VP9 never beat H.264 by the 15% needed to justify
committing a second copy — and on four it came out *larger*, which is worse
than useless since `<source>` order serves WebM first. The hero loop is the one
real win (1.0 MB → 0.6 MB) and is still kept, because the 15%-saving rule in
`05-video.mjs` decides per file rather than globally.

**One film per project**: `05-video.mjs` keeps the longest video per slug. Super
Shaligram has both an 8-second entrance clip and a 6-minute walkthrough, and
without this rule which one shipped depended on probe order.

`LOW_RES_EXCLUDE` in `video-trims.mjs` holds **public slugs**, so it has to
track renames in `registry.mjs`. It silently broke once when
`karnavati-7-101-104` became `karnavati-7`. `06-masters.mjs` now warns if it
names a slug that no longer exists.

### When a new Drive export arrives

1. Unzip it into `portfolio/`.
2. `npm run assets`
3. Add the new folder to `REGISTRY` in `scripts/lib/registry.mjs` if it isn't
   there (the run reports anything unmapped).
4. Review `CURATION.md`, update `curation.json`, then
   `node scripts/06-masters.mjs --force`.

---

## Curating the gallery

`CURATION.md` lists every candidate image per project. Browse the previews in
Finder (`.work/preview/<slug>/`) and put the keepers in **`curation.json`**:

```json
{
  "skylon-residency": [2, 3, 4, 6, 7, 9],
  "corporate-office": [2, 3, 5, 6]
}
```

Numbers match the preview filenames (`002.jpg` → `2`). The **first number
becomes the project's cover.** Then:

```bash
node scripts/06-masters.mjs --force
npm run build
```

Until `curation.json` exists, the site runs on **provisional auto-picks** — up
to 9 images per project, ranked by resolution, aspect ratio and colourfulness,
skipping anything flagged. `manifest.json` records `source: "auto"` vs
`"curated"` per project so you can tell which is which.

The flags in `CURATION.md` are hints, not verdicts:

- `mostly-blank` — usually a title card or an AR/VR QR-code page
- `line-drawing` — usually a 2D layout or a title slide
- `dupe of NNN` — near-identical to that number; you probably want one of the pair

---

## Project metadata

`scripts/lib/registry.mjs` maps each source folder to its public slug, title,
category and locality. It exists because the source folders carry typos
(`SKYLONE`, `SOLITIRE`, `CHADKHEDA`, `Stee Cast`, `PEREDICE`), inconsistent unit
notation, and client personal names.

**Titles carry no flat or block numbers** — "Skylon Residency", not
"Skylon Residency · A-501". Where two projects sit in the same building, they
are separated by location rather than by a unit number:

- `Karnavati 7` and `Karnavati 7, B Wing` — same scheme, distinguished by wing
  (the source's `B-301` is B wing, flat 301; the wing is kept, the flat dropped)
- `Setu Solitaire` and `Setu Solitaire, Chandkheda` — only the second folder
  names its locality

`Corporate Office` was `Office 434`. Its client is Jay Bhagwati Road Carrier,
whose logo appears on the reception wall in the render, but the name is not
published — say so if you'd rather it were.

**Client names are not published.** `Bipinbhai`, `Dashrathbhai Bharwad`,
`Harsh Sharma` and `Niteshbhai` are recorded in the registry's `client` field
but titles use the building or locality instead. Flip
`SITE.useClientNames` once consent is confirmed.

### Excluded projects

| Folder | Why |
|---|---|
| `Adarsh TULIP` | Empty folder |
| `jay Vishwakarma furniture` | Only asset is a 640×352 screen recording |
| `Dhavalbhai` | Only asset is a Griha Pravesh ceremony film, not an interiors walkthrough — no frame in it works as a portfolio cover |

Each needs photos or a different film before it can be shown.

---

## Pages

| Route | What it is |
|---|---|
| `/` | Home. Hero, studio intro, **8 selected projects**, films, process, Instagram, contact. |
| `/portfolio/` | All 22 projects with category filters. |
| `/work/<slug>/` | One project: full gallery, film, metadata. 22 pages. |
| `/404` | Not found. |

The home page originally listed all 22 projects, which made for a very long
scroll. It now shows the strongest 8 with a "View all 22 projects" CTA.
`HOME_COUNT` in `src/pages/index.astro` controls it.

Eight is not arbitrary — see the grid rule below.

### The grid packing rule

`WorkGrid` gives every **5th** card a full-width cell (`i % 5 === 0`) in a
2-column grid. This matters: in a 2-column grid a full-width card cannot sit
beside a narrow one, so an `i % 4` pattern strands the card *before* each wide
one alone in a half-empty row. That was a real bug — 22 projects produced six
half-empty rows.

`i % 5` packs exactly: `wide | pair | pair | wide | pair | pair | …`. Only a
trailing odd card can sit alone, which reads as intentional. Eight projects
fill the home grid perfectly: `wide | pair | pair | wide | pair`.

The `Lightbox` takes a `projects` prop rather than importing all of them, so
the home page doesn't inline gallery data for the 14 projects it never shows
(~10 KB gz saved).

## Design system

`src/styles/global.css` holds everything in a Tailwind 4 `@theme` block.

The palette is taken from the **real brand assets**, not invented: the logo on
the project title slides samples to `#074267` (blue) and `#AC2703`
(terracotta) across 62k/126k pixels. The warm neutrals come from the renders —
plaster walls, walnut veneer, marble, warm cove LED. No pure white, no pure
black. Every text pair passes WCAG AA; `clay` is decorative only and is never
used for text.

Type is Fraunces (display), Inter Tight (body) and DM Mono (labels), all
self-hosted via Fontsource — **zero third-party requests on the whole site**.

`src/assets/logo-mark.svg` is the IBJ monogram, traced with potrace from
`SKYLONE GOTA A-501/1.jpg`, using `currentColor` so it inverts on dark bands.

### Motion

All reveals are opt-in via `.reveal` / `.reveal-img` and disabled wholesale
under `prefers-reduced-motion`. Elements are **visible by default** and only
hidden once JS confirms motion is allowed, so no-JS users never get a blank
page.

One non-obvious constraint: `.reveal-img` clips its **first child**, never
itself. A `clip-path: inset(0 0 100% 0)` on the observed element collapses its
IntersectionObserver rectangle to zero height, so it would never be reported as
intersecting and could never be revealed.

---

## Performance

Verified on the built output:

| | |
|---|---|
| CSS | 8.2 KB gz |
| JS | 5.2 KB raw inline (~2 KB gz) |
| `index.html` | 32.4 KB gz |
| Third-party requests | **0** |
| Hero loop | 1.0 MB, poster 78 KB |

- Images go through `SmartImage.astro` → `<Picture>` with AVIF/WebP at
  `[480, 768, 1200, 1800, 2400]`, explicit dimensions and a base64 LQIP
  background, so CLS is zero.
- The LCP element is always the hero **poster image**. Video sources are
  attached after `load`, and skipped entirely under reduced-motion or
  `navigator.connection.saveData`.
- Lightbox images are `data-src` only; nothing is fetched until it opens.
- Film `<video>` elements are created on click.
- **Instagram's `embed.js` is not used at all.** The section renders
  Instagram's official `/embed/` iframes directly, with `src` held in
  `data-ig-src` until the section crosses a 600px IntersectionObserver margin.
  Verified: zero Instagram requests on load, and `embed.js` never loads.

### Why the Instagram cards are cropped

Instagram's embed ships its own UI — profile header, "View profile" button,
like/comment icons, caption, music credit, timestamp — and it is all inside a
cross-origin iframe, so it cannot be styled.

It can, however, be masked. Measured against the live embed at 300px, 409px and
560px wide, the geometry is stable: **the header is a constant 54px at every
width, and the cover media is always exactly `width × 1.25`** (a 4:5 box). So
the iframe sits in an `overflow:hidden` 4:5 window, pulled up by 54px; the cover
fills the window exactly and everything below it is clipped. A hand-styled
"View on Instagram" link replaces Instagram's own footer.

`embed.js` had to go for this to work — it rewrites the iframe and sets its own
inline height, which fights the crop.

**Reels cannot play inline in an Instagram embed.** That is a platform
restriction; the iframe only ever shows a cover frame overlaid with "Watch on
Instagram", and clicking it opens instagram.com. Playing video in the page
would mean self-hosting it, the way the Films section already does.

---

## Deploy

Live at **https://interiorbyjenish.com**

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and
publishes to GitHub Pages. No manual step.

### Build times, and why the cache matters

Astro encodes ~1800 responsive image variants. Measured:

| | |
|---|---|
| Cold build (no cache) | ~20 min |
| Warm build (cache restored) | **0.8 s** |

The variants are cached in `.astro-cache` (set via `cacheDir` in
`astro.config.mjs`). It lives **outside `node_modules` on purpose** — the
default location is `node_modules/.astro`, which `npm ci` deletes, so CI was
re-encoding every image on every single deploy. That was the original 21-minute
build.

The workflow now restores that cache with `actions/cache`. The key hashes the
image masters, and `restore-keys` falls back to the most recent cache, so
adding or re-curating images only re-encodes the ones that changed rather than
all of them.

Two caveats worth knowing:

- The **first** run after a cache change is still cold (~20 min); it populates
  the cache at the end. Runs after that are fast.
- GitHub evicts caches unused for 7 days, so an occasional cold build happens.

If that ever becomes intolerable, the next step is moving image optimisation
out of Astro entirely — pre-generate the responsive set in `scripts/` (which
already uses sharp) and emit plain `<picture>` markup. CI would never touch
images, at the cost of roughly +150 MB of committed derivatives.

### Paths and the base

The site is served from **interiorbyjenish.com**, which GitHub Pages serves at
the domain root — so `BASE_PATH` is `/` and paths are plain root-relative.

It was briefly deployed as a project site under `/interiorbyjenish/`, and the
machinery for that is still in place: set `BASE_PATH=/interiorbyjenish` and
`SITE_URL=https://hardiksondagar.github.io` and it works again, no code
changes. That's why internal paths still go through `withBase()`:

1. Astro rewrites imported-asset URLs for a base, but **not** hardcoded strings
   in `src`/`href`. Everything hand-written goes through `withBase()` in
   `src/lib/paths.ts`. At `BASE_PATH=/` it is a no-op, so adding a literal path
   is currently harmless — but wrap it anyway if a sub-path deploy might return.
2. `public/.nojekyll` is **required**. Jekyll strips files and directories
   beginning with an underscore, which would delete the whole `/_astro/` bundle
   — CSS, JS and every optimised image.
3. `public/CNAME` holds the custom domain. An Actions deploy replaces the whole
   published site, so keeping it in the artifact stops the domain setting from
   being dropped.

Note `public/_headers` is **inert on GitHub Pages** — it is a
Cloudflare/Netlify format. Pages sets its own caching. It is kept for a
possible move to Cloudflare.

### Media in git

`public/media/video/` (~74 MB) **is committed**, which is unusual but
necessary: CI cannot regenerate it, because the asset pipeline needs the
~5.3 GB of raw Drive exports in `portfolio/` that aren't in the repo. With the
47 MB of image masters the repo is ~125 MB — fine for GitHub, but it is
permanent history.

If bandwidth or repo size becomes a problem, move the videos to Cloudflare R2
and point `manifest.json` at a CDN base; then re-ignore the directory.

Do **not** use Git LFS. Cloudflare Pages' git integration does not fetch LFS
objects, and it would silently ship broken files if you ever migrate there.

### Bandwidth

GitHub Pages has a soft 100 GB/month limit, same ballpark as Vercel and
Netlify. For a portfolio this is unlikely to bite, but ~10 MB of video per
interested visitor adds up. **Cloudflare Pages** (free, no hard cap, better
India latency) remains the better long-term home if traffic grows.

---

## Still outstanding

1. **Google Business Profile** — for a local interior firm this outranks
   anything on-site. Claim it and point its website field at the live URL.
2. **Client names** — publish them, or keep building/locality titles?
4. **Testimonials** — `SITE.showTestimonials` is `false`; needs 2–3 real quotes.
5. **Stats** — the hero counts projects and films from the manifest. Years in
   business and total square footage would be stronger, if known.
6. **Video trim points** — `scripts/lib/video-trims.mjs` holds placeholder
   in/out points chosen to skip title cards. Jenish should pick the moments he
   actually wants shown.
7. **Hosting decision** — see above.
