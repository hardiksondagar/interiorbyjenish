/** Scroll reveals. One observer for the whole page; elements unobserve after
 *  firing. Reduced-motion users never reach this file's effects because
 *  .motion-ok is absent, so .reveal stays at its visible default. */
const els = document.querySelectorAll<HTMLElement>('.reveal, .reveal-img')
if (els.length && document.documentElement.classList.contains('motion-ok')) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        e.target.classList.add('is-visible')
        io.unobserve(e.target)
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
  )
  els.forEach((el) => io.observe(el))
} else {
  els.forEach((el) => el.classList.add('is-visible'))
}

/** Stat count-up. */
document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
  const target = Number(el.dataset.count || '0')
  if (!target || !document.documentElement.classList.contains('motion-ok')) {
    el.textContent = String(target)
    return
  }
  el.textContent = '0'
  const io = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return
    io.disconnect()
    const dur = 1100
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur)
      // ease-out-quint, matching the CSS transitions
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 5))))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, { threshold: 0.5 })
  io.observe(el)
})
