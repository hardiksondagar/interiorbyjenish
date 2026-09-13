/** Full-screen film player on a native <dialog>.
 *
 *  The <video> element is created when a film is opened and destroyed when it
 *  closes or the user moves to another film. That matters for two reasons:
 *  nothing is fetched until a film is actually requested, and a closed film
 *  stops downloading immediately rather than continuing in the background.
 */
type Film = {
  slug: string
  title: string
  meta: string
  mp4: string
  webm: string | null
  poster: string
  duration: number
  href: string
}

const raw = document.getElementById('film-data')?.textContent
const dialog = document.querySelector<HTMLDialogElement>('[data-film-lightbox]')

if (raw && dialog) {
  const dlg = dialog // narrowed alias for the hoisted functions below
  const films: Film[] = JSON.parse(raw)

  const stage = dlg.querySelector<HTMLElement>('[data-fl-stage]')!
  const titleEl = dlg.querySelector<HTMLElement>('[data-fl-title]')!
  const metaEl = dlg.querySelector<HTMLElement>('[data-fl-meta]')!
  const counter = dlg.querySelector<HTMLElement>('[data-fl-counter]')!
  const link = dlg.querySelector<HTMLAnchorElement>('[data-fl-link]')!
  const prevBtn = dlg.querySelector<HTMLButtonElement>('[data-fl-prev]')!
  const nextBtn = dlg.querySelector<HTMLButtonElement>('[data-fl-next]')!

  let i = 0
  let opener: HTMLElement | null = null
  let video: HTMLVideoElement | null = null

  function destroyVideo() {
    if (!video) return
    video.pause()
    // Clearing the sources and calling load() is what actually aborts an
    // in-flight download; removing the node alone does not reliably do it.
    video.removeAttribute('src')
    while (video.firstChild) video.removeChild(video.firstChild)
    video.load()
    video.remove()
    video = null
  }

  function show(n: number) {
    const len = films.length
    i = (n + len) % len
    const f = films[i]

    destroyVideo()

    const v = document.createElement('video')
    v.className = 'absolute inset-0 h-full w-full bg-charcoal object-contain'
    v.controls = true
    v.autoplay = true
    v.playsInline = true
    v.preload = 'auto'
    v.poster = f.poster
    for (const [type, url] of [
      ['video/webm', f.webm],
      ['video/mp4', f.mp4],
    ] as const) {
      if (!url) continue
      const s = document.createElement('source')
      s.type = type
      s.src = url
      v.appendChild(s)
    }
    stage.appendChild(v)
    video = v

    titleEl.textContent = f.title
    metaEl.textContent = f.meta
    link.href = f.href
    counter.textContent = len > 1 ? `${i + 1} / ${len} · ${f.duration}s` : `${f.duration}s`

    // The click that opened the dialog is the user gesture, so autoplay with
    // sound is permitted. If a browser refuses anyway, controls are already on.
    v.play().catch(() => {})

    const solo = len < 2
    prevBtn.hidden = solo
    nextBtn.hidden = solo
  }

  function open(index: number, from: HTMLElement) {
    opener = from
    dlg.showModal()
    document.body.style.overflow = 'hidden'
    show(index)
  }

  document.querySelectorAll<HTMLElement>('[data-open-film]').forEach((btn) => {
    btn.addEventListener('click', () => open(Number(btn.dataset.openFilm), btn))
  })

  dlg.querySelector('[data-fl-close]')!.addEventListener('click', () => dlg.close())
  prevBtn.addEventListener('click', () => show(i - 1))
  nextBtn.addEventListener('click', () => show(i + 1))

  dlg.addEventListener('close', () => {
    destroyVideo()
    document.body.style.overflow = ''
    opener?.focus()
    opener = null
  })

  // Backdrop click closes; clicks on the video or the controls must not.
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close()
  })

  dlg.addEventListener('keydown', (e) => {
    // Arrow keys seek inside a focused <video>, so only treat them as film
    // navigation when the player itself isn't focused.
    if (document.activeElement === video) return
    if (e.key === 'ArrowRight') { e.preventDefault(); show(i + 1) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(i - 1) }
  })
}
