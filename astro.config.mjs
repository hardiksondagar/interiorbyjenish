import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import sitemap from '@astrojs/sitemap'

// GitHub Pages project site by default. For a custom domain, set
// SITE_URL=https://interiorbyjenish.com and BASE_PATH= (empty) in the
// environment - no code changes needed.
const SITE_URL = process.env.SITE_URL ?? 'https://hardiksondagar.github.io'
const BASE_PATH = process.env.BASE_PATH ?? '/interiorbyjenish'

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  vite: { plugins: [tailwindcss()] },
  integrations: [sitemap()],
  image: { service: { entrypoint: 'astro/assets/services/sharp' } },
  build: { inlineStylesheets: 'auto' },
})
