/** Per-video trim points and the hero-loop source.
 *
 *  The source walkthroughs run 40s-1:47. Compressing a 1:47 4K film whole to a
 *  web-friendly size looks bad, so each one gets an in-point and a duration.
 *  These are placeholders picked to skip typical title/intro cards - Jenish
 *  should replace them with the moments he actually wants shown.
 *
 *  start/duration in seconds. Omit a slug to encode it whole.
 */
export const TRIMS = {
  'anusthan-harmony':    { start: 4,  duration: 34 },
  'amogha-shantigram':   { start: 3,  duration: 34 },
  'anusthan-bungalow':   { start: 3,  duration: 34 },
  // t4-38 is the Griha Pravesh ceremony (rangoli, puja room, decorated door);
  // the interiors walkthrough only starts around t62. FLAGGED for Jenish -
  // this film may be better replaced than trimmed.
  'dhaval-residence':    { start: 62, duration: 34 },
  'auntynoz-pizza':      { start: 2,  duration: 32 },
  'vishwakarma-furniture': { start: 5, duration: 34 },
  // super-shaligram is 8s and karnavati-7-101-104 is 6s: encode whole.
}

/** Source for the silent looping hero background.
 *  anusthan-harmony: 3840x2160, 1:47, landscape - the highest-resolution
 *  landscape walkthrough in the set, so it survives the downscale best. */
/** start=50 lands on the bedroom/kitchen pan rather than the chandelier
 *  close-up at ~t8, which read as a detail shot instead of a room. */
export const HERO = { slug: 'anusthan-harmony', start: 50, duration: 12 }

/** Videos too low-resolution to show full-width. vishwakarma-furniture is
 *  640x352 (a screen recording), so it is excluded from the film strip. */
export const LOW_RES_EXCLUDE = new Set(['vishwakarma-furniture', 'karnavati-7-101-104'])
