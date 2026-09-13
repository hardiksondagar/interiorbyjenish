import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import sitemap from '@astrojs/sitemap'

// Served from the custom domain interiorbyjenish.com, which GitHub Pages
// serves at the DOMAIN ROOT - so there is no base path. Both values are
// env-overridable: set BASE_PATH=/interiorbyjenish to deploy back to a
// project sub-path (e.g. hardiksondagar.github.io/interiorbyjenish/).
const SITE_URL = process.env.SITE_URL ?? 'https://interiorbyjenish.com'
const BASE_PATH = process.env.BASE_PATH ?? '/'

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
