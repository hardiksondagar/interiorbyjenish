/** Gallery lightbox on a native <dialog>.
 *  Full-size images are only fetched on open; neighbours are prefetched one
 *  step ahead so arrow-key browsing feels instant without loading a whole
 *  gallery up front. */
type LbImage = { md: string; lg: string; alt: string }
type LbProject = { slug: string; title: string; meta: string; images: LbImage[] }

const raw = document.getElementById('lightbox-data')?.textContent
const dialog = document.querySelector<HTMLDialogElement>('[data-lightbox]')
if (raw && dialog) {
  const dlg = dialog   // narrowed alias: hoisted functions below lose the guard
  const projects: LbProject[] = JSON.parse(raw)
  const bySlug = new Map(projects.map((p) => [p.slug, p]))

  const img = dialog.querySelector<HTMLImageElement>('[data-lb-img]')!
  const titleEl = dialog.querySelector<HTMLElement>('[data-lb-title]')!
  const metaEl = dialog.querySelector<HTMLElement>('[data-lb-meta]')!
  const counter = dialog.querySelector<HTMLElement>('[data-lb-counter]')!
  const link = dialog.querySelector<HTMLAnchorElement>('[data-lb-link]')!

  let current: LbProject | null = null
  let i = 0
  let opener: HTMLElement | null = null

  const useLarge = () => window.innerWidth > 1400 || window.devicePixelRatio > 1.5
  const urlFor = (im: LbImage) => (useLarge() ? im.lg : im.md)

  const prefetch = (n: number) => {
    const im = current?.images[n]
    if (!im) return
    const p = new Image()
    p.src = urlFor(im)
  }

  function show(n: number) {
    if (!current) return
    const len = current.images.length
    i = (n + len) % len
    const im = current.images[i]
    img.src = urlFor(im)
    img.alt = im.alt
    counter.textContent = `${i + 1} / ${len}`
    prefetch(i + 1)
    prefetch(i - 1)
  }

  function open(slug: string, from: HTMLElement) {
    const p = bySlug.get(slug)
    if (!p) return
    current = p
    opener = from
    titleEl.textContent = p.title
    metaEl.textContent = p.meta
    // Vite inlines BASE_URL at build time, so this works under a sub-path.
    const base = import.meta.env.BASE_URL.replace(/\/$/, '')
    link.href = `${base}/work/${p.slug}/`
    show(0)
    dlg.showModal()
    document.body.style.overflow = 'hidden'
  }

  function close() {
    dlg.close()
  }

  dialog.addEventListener('close', () => {
    document.body.style.overflow = ''
    img.removeAttribute('src')
    current = null
    opener?.focus()
    opener = null
  })

  document.querySelectorAll<HTMLElement>('[data-open-lightbox]').forEach((btn) => {
    btn.addEventListener('click', () => open(btn.dataset.openLightbox!, btn))
  })

  dialog.querySelector('[data-lb-close]')!.addEventListener('click', close)
  dialog.querySelector('[data-lb-prev]')!.addEventListener('click', () => show(i - 1))
  dialog.querySelector('[data-lb-next]')!.addEventListener('click', () => show(i + 1))

  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(i + 1) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(i - 1) }
  })

  // Click the backdrop (but not the image or controls) to dismiss.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close()
  })

  // Swipe on touch.
  let x0 = 0
  dialog.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX }, { passive: true })
  dialog.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - x0
    if (Math.abs(dx) > 50) show(dx < 0 ? i + 1 : i - 1)
  }, { passive: true })
}
