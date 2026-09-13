/** Curated Instagram permalinks.
 *
 *  Rendered as Instagram's official /embed/ iframes, cropped to show only the
 *  cover media - the profile header, like/comment icons, caption, music credit
 *  and timestamp are masked off (see Instagram.astro for the measurements).
 *  Instagram's embed.js is deliberately not used: it would rewrite the iframes
 *  and set its own height, fighting the crop, and it costs 1.5-3 MB of
 *  third-party JS we don't need.
 *
 *  Nothing loads until the section nears the viewport.
 *
 *  NOTE: Reels cannot play inside an Instagram embed - that is a platform
 *  restriction, not a setting. Clicking a card opens the reel on Instagram.
 *  To play video in the page it would have to be self-hosted, like the
 *  walkthrough films in the Films section.
 *
 *  Add or remove links freely; the first 6 are shown.
 */
export const INSTAGRAM_POSTS: string[] = [
  'https://www.instagram.com/reel/C53GZcEpuiz/',
  'https://www.instagram.com/reel/CrAfSPcI2vQ/',
  'https://www.instagram.com/reel/CltHCxHIqJi/'

]

export const INSTAGRAM_LIMIT = 6
