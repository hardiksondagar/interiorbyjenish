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

## Before this goes live

Four placeholders, all in **`src/lib/site.ts`**:

```ts
phoneE164:   '+910000000000'          // -> real number, E.164
phoneDisplay:'+91 00000 00000'        // -> how it should read on screen
email:       'hello@interiorbyjenish.com'
addressLine: 'Ahmedabad, Gujarat'     // -> street address, for Google
```

They are deliberately obvious so nothing ships looking real-but-wrong. The
number feeds the WhatsApp deep links, the `tel:` links and the LocalBusiness
schema, so it only needs changing in that one file.

Then add ~6 Instagram post links to **`src/data/instagram.ts`**. Until they're
there, the Instagram section renders a "setup needed" card instead of embeds.

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
| 05 | `05-video.mjs` | 1080p H.264 MP4 + VP9 WebM + a scored poster frame, plus the silent hero loop. Outputs to `public/media/video/` (gitignored). |
| 06 | `06-masters.mjs` | Promotes the curated picks to 2400px JPEG masters in `src/assets/projects/` and writes `src/data/manifest.json` with dimensions and LQIP. |
| 07 | `07-og.mjs` | One 1200×630 Open Graph card per project. |

Re-running is safe: each stage skips work whose output already exists, and
nothing overwrites `curation.json`.

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

Static `dist/`, no host-specific config. `public/_headers` carries
Cloudflare/Netlify-style cache rules.

**Hosting is still undecided.** Videos total ~44 MB and live in
`public/media/video/`, which is **gitignored** — they must be uploaded
separately or the pipeline re-run on the build machine.

Recommendation: **Cloudflare Pages** — free, no hard bandwidth cap, good India
latency. Vercel and Netlify free tiers cap at 100 GB/month, which video traffic
can burn through.

Do **not** use Git LFS for the media: Cloudflare Pages' git integration does
not fetch LFS objects and would silently ship broken files. Either commit the
images as now, or move them to R2 behind a base-URL constant.

---

## Still outstanding

1. **Contact details** — the four placeholders above.
2. **Instagram post links** — 6 permalinks for `src/data/instagram.ts`.
3. **Client names** — publish them, or keep building/locality titles?
4. **Testimonials** — `SITE.showTestimonials` is `false`; needs 2–3 real quotes.
5. **Stats** — the hero counts projects and films from the manifest. Years in
   business and total square footage would be stronger, if known.
6. **Video trim points** — `scripts/lib/video-trims.mjs` holds placeholder
   in/out points chosen to skip title cards. Jenish should pick the moments he
   actually wants shown.
7. **Hosting decision** — see above.
