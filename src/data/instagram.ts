/** Curated Instagram permalinks.
 *
 *  Rendered as official embeds, lazy-mounted only when the section scrolls
 *  into view (embed.js plus one iframe per post is 1.5-3 MB of third-party
 *  payload, so it must never touch initial load).
 *
 *  TODO: Jenish - replace these with 6 real post URLs from
 *  https://www.instagram.com/interiorbyjenish . Copy the "Copy link" value
 *  for each post. Until then the section renders its static fallback cards.
 */
export const INSTAGRAM_POSTS: string[] = [
  // 'https://www.instagram.com/p/XXXXXXXXXXX/',
]

export const INSTAGRAM_LIMIT = 6
