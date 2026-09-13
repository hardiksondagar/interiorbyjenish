/** Base-aware path helper.
 *
 *  GitHub Pages serves this repo as a project site, i.e. under
 *  https://hardiksondagar.github.io/interiorbyjenish/ rather than at a domain
 *  root. Astro rewrites paths for imported assets automatically, but NOT for
 *  hardcoded strings in src/href attributes - those would 404 under a base
 *  path. Everything hand-written goes through here.
 *
 *  Set BASE_PATH='' (and SITE_URL to the domain) to deploy at a root instead;
 *  withBase() then becomes a no-op.
 */
const BASE = import.meta.env.BASE_URL // '/interiorbyjenish/' or '/'

export function withBase(path: string): string {
  if (!path.startsWith('/')) return path
  const base = BASE.endsWith('/') ? BASE.slice(0, -1) : BASE
  // Anchor-only links ('/#work') must keep the hash attached to the base root.
  return `${base}${path}` || '/'
}
