import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import sitemap from '@astrojs/sitemap'

// GitHub Pages project site. The account has a custom domain
// (hardiksondagar.me), so Pages serves project sites under that, not
// under github.io. For a custom domain, set
// SITE_URL=https://interiorbyjenish.com and BASE_PATH= (empty) in the
// environment - no code changes needed.
const SITE_URL = process.env.SITE_URL ?? 'https://hardiksondagar.me'
const BASE_PATH = process.env.BASE_PATH ?? '/interiorbyjenish'

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  // Astro caches optimised image variants here and reuses them when the
  // source and params are unchanged. It defaults to node_modules/.astro,
  // which `npm ci` deletes - so it lives outside node_modules to let CI
  // restore it between runs. Without this, every deploy re-encodes ~3000
  // image variants from scratch.
  cacheDir: './.astro-cache',
  vite: { plugins: [tailwindcss()] },
  integrations: [sitemap()],
  image: { service: { entrypoint: 'astro/assets/services/sharp' } },
  build: { inlineStylesheets: 'auto' },
})
