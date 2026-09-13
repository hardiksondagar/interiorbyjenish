/** Nav background state and WhatsApp FAB visibility, both driven off
 *  sentinels rather than scroll listeners. */
const nav = document.querySelector<HTMLElement>('[data-nav]')
const navSentinel = document.querySelector<HTMLElement>('[data-nav-sentinel]')

if (nav && navSentinel) {
  new IntersectionObserver(
    ([e]) => nav.classList.toggle('is-solid', !e.isIntersecting),
    { threshold: 0 },
  ).observe(navSentinel)
} else {
  nav?.classList.add('is-solid')
}

const fab = document.querySelector<HTMLElement>('[data-fab]')
const fabSentinel = document.querySelector<HTMLElement>('[data-fab-sentinel]')
const contact = document.querySelector<HTMLElement>('#contact')
if (fab && fabSentinel) {
  // Show once past the hero...
  new IntersectionObserver(
    ([e]) => fab.classList.toggle('is-shown', !e.isIntersecting),
    { threshold: 0 },
  ).observe(fabSentinel)
  // ...but hide again over the contact section, so two CTAs never stack.
  if (contact) {
    new IntersectionObserver(
      ([e]) => fab.classList.toggle('is-hidden', e.isIntersecting),
      { threshold: 0.2 },
    ).observe(contact)
  }
}

/** Mobile menu toggle. */
const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]')
const menu = document.querySelector<HTMLElement>('[data-menu]')
if (toggle && menu) {
  const set = (open: boolean) => {
    toggle.setAttribute('aria-expanded', String(open))
    menu.classList.toggle('hidden', !open)
    document.body.style.overflow = open ? 'hidden' : ''
  }
  toggle.addEventListener('click', () => set(toggle.getAttribute('aria-expanded') !== 'true'))
  menu.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).tagName === 'A') set(false)
  })
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false) })
}
