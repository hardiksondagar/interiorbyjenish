/** Canonical project metadata, keyed by the auto-slug of the source folder.
 *
 *  This is the human-knowledge layer of the pipeline. It exists because the
 *  source folder names carry typos ("SKYLONE", "SOLITIRE", "CHADKHEDA",
 *  "Stee Cast", "PEREDICE"), inconsistent unit notation, and client personal
 *  names. `title` is what ships; `slug` is the public URL.
 *
 *  Client personal names are deliberately NOT used as titles - see the
 *  `client` field, which is recorded for reference but gated behind
 *  SITE.useClientNames (default false) pending Jenish's consent.
 */
export const REGISTRY = {
  '22-anusthan-bunglow': {
    slug: 'anusthan-bungalow', title: 'Anusthan Bungalow',
    category: 'residential', type: 'Bungalow', locality: 'Ahmedabad', featured: true,
  },
  'amogha-adani-shantigram': {
    slug: 'amogha-shantigram', title: 'Amogha, Adani Shantigram',
    category: 'residential', type: 'Apartment', locality: 'Shantigram', featured: true,
  },
  'atharv-adobe-a-604': {
    slug: 'atharv-abode-a604', title: 'Atharv Abode · A-604',
    category: 'residential', type: 'Apartment', locality: 'Ahmedabad',
  },
  'bhagwati-hardware-3': {
    slug: 'bhagwati-hardware', title: 'Bhagwati Hardware',
    category: 'commercial', type: 'Retail Showroom', locality: 'Ahmedabad',
  },
  'bipinbhai-paldi-402': {
    slug: 'paldi-402', title: 'Paldi · 402',
    category: 'residential', type: 'Apartment', locality: 'Paldi', client: 'Bipinbhai',
  },
  'bakrol-aegis-stee-cast': {
    slug: 'aegis-steel-cast', title: 'Aegis Steel Cast',
    category: 'office', type: 'Industrial Office Fit-out', locality: 'Bakrol', featured: true,
  },
  'dashrathbhai-bharwad': {
    slug: 'bharwad-residence', title: 'Bharwad Residence',
    category: 'residential', type: '4 BHK + 2 BHK', locality: 'Ahmedabad',
    client: 'Dashrathbhai Bharwad', featured: true,
  },
  'harsh-sharma': {
    slug: 'sharma-residence', title: 'Sharma Residence',
    category: 'residential', type: 'Apartment', locality: 'Ahmedabad', client: 'Harsh Sharma',
  },
  'jaipur-project': {
    slug: 'jaipur-residence', title: 'Jaipur Residence',
    category: 'residential', type: 'Apartment', locality: 'Jaipur', city: 'Jaipur',
  },
  'k7-301': {
    slug: 'karnavati-7-b301', title: 'Karnavati 7 · B-301',
    category: 'residential', type: 'Apartment', locality: 'Ahmedabad',
  },
  'k7-101-104': {
    slug: 'karnavati-7-101-104', title: 'Karnavati 7 · 101 & 104',
    category: 'residential', type: '3 BHK Apartments', locality: 'Ahmedabad',
  },
  'office-434': {
    slug: 'office-434', title: 'Office 434',
    category: 'office', type: 'Corporate Office', locality: 'Ahmedabad',
  },
  'rr-gandhinagar-b-703': {
    slug: 'rr-gandhinagar-b703', title: 'RR Gandhinagar · B-703',
    category: 'residential', type: 'Apartment', locality: 'Gandhinagar', city: 'Gandhinagar',
  },
  'setu-solitire-a-302': {
    slug: 'setu-solitaire-a302', title: 'Setu Solitaire · A-302',
    category: 'residential', type: 'Apartment', locality: 'Ahmedabad',
  },
  'setu-solitire-chadkheda-a-602': {
    slug: 'setu-solitaire-a602', title: 'Setu Solitaire · A-602',
    category: 'residential', type: 'Apartment', locality: 'Chandkheda',
  },
  'skylone-gota-a-501': {
    slug: 'skylon-gota-a501', title: 'Skylon Residency · A-501',
    category: 'residential', type: 'Apartment', locality: 'Gota', featured: true,
  },
  'sp-nirwana-shela-b-1102': {
    slug: 'sp-nirwana-b1102', title: 'SP Nirwana · B-1102',
    category: 'residential', type: 'Apartment', locality: 'Shela',
  },
  'super-shaligram': {
    slug: 'super-shaligram', title: 'Super Shaligram',
    category: 'residential', type: '4 BHK Apartment', locality: 'Ahmedabad', featured: true,
  },
  'akshat-paradise': {
    slug: 'akshat-paradise-f501', title: 'Akshat Paradise · F-501',
    category: 'residential', type: 'Apartment', locality: 'Ahmedabad',
  },
  'jay-bhai-maninagar': {
    // Folder says Maninagar, the file inside says Ghodasar. Ghodasar wins:
    // the filename is more specific and names the scheme (Krishna Avenue).
    // FLAGGED for Jenish to confirm.
    slug: 'krishna-avenue-ghodasar', title: 'Krishna Avenue · Ghodasar',
    category: 'residential', type: 'Apartment', locality: 'Ghodasar', client: 'Niteshbhai',
  },
  // --- loose files at part root, each its own project ---
  'auntynoz-pizza': {
    slug: 'auntynoz-pizza', title: 'Auntynoz Pizza',
    category: 'commercial', type: 'Restaurant', locality: 'Hathijan', featured: true,
  },
  'anusthan-harmony': {
    slug: 'anusthan-harmony', title: 'Anusthan Harmony',
    category: 'residential', type: 'Residential Scheme', locality: 'Ahmedabad',
  },
  'dhavalbhai': {
    slug: 'dhaval-residence', title: 'Dhaval Residence',
    category: 'residential', type: 'Apartment', locality: 'Ahmedabad', client: 'Dhavalbhai',
  },
  'jay-vishwakarma-furniture': {
    slug: 'vishwakarma-furniture', title: 'Jay Vishwakarma Furniture',
    category: 'commercial', type: 'Furniture Showroom', locality: 'Ahmedabad',
  },
}

/** Loose root-level files -> which project they belong to. */
export const LOOSE_MAP = {
  'auntynoz-pizza.mp4': 'auntynoz-pizza',
  'auntyo-z-pizza-hathijan.pdf': 'auntynoz-pizza',
  'anusthan-harmony.mp4': 'anusthan-harmony',
  'dhavalbhai.m4v': 'dhavalbhai',
  'jay-vishwakarma-furniture.mp4': 'jay-vishwakarma-furniture',
  'our-portfolio-ibj.pdf': '_lookbook',
}

/** Folders with nothing usable in them. */
export const SKIP_PROJECTS = new Set([
  'adarsh-tulip',              // empty folder
  'jay-vishwakarma-furniture', // only asset is a 640x352 screen recording
  // Only asset is Dhavalbhai.m4v, which is a Griha Pravesh ceremony film
  // (rangoli, puja room, decorated door, murals) rather than an interiors
  // walkthrough - no frame in it works as a portfolio cover.
  // FLAGGED for Jenish: needs either photos or a different film to be shown.
  'dhavalbhai',
])

/** Source files excluded from the showcase: technical drawings, layouts and
 *  builder collateral rather than renders. Matched against the source path,
 *  case-insensitively. Superseded revisions are listed here too. */
export const EXCLUDE_PATTERNS = [
  /working dwg/i,
  /floor ?plan/i,
  /floor layout/i,
  /furniture layout/i,
  /ceiling & electric layout/i,
  /typical lay ?out/i,
  /ultra spacious residential project/i,   // builder brochure, not IBJ work
  /1st realvision/i,                       // superseded by 2ND
  /101 karnavati revison\(1\)/i,            // byte-identical duplicate
]

export const isExcluded = (p) => EXCLUDE_PATTERNS.some((re) => re.test(p))
