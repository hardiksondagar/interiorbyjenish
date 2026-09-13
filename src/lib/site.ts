/** Single source of truth for every business detail.
 *  TODO placeholders are deliberately obvious so nothing ships looking
 *  real-but-wrong. Replace all four TODO lines before going live. */
export const SITE = {
  name: 'Interior by Jenish',
  shortName: 'IBJ',
  // The logo wordmark on the project decks reads "INTERIOR BY JENISH",
  // which matches the Instagram handle. Used everywhere as the brand name.
  tagline: 'Interior design for homes and offices in Ahmedabad',
  description:
    'Interior by Jenish designs and delivers turnkey interiors for homes and offices across Ahmedabad — from modular kitchens and wardrobes to complete office fit-outs, resolved in full 3D before work begins.',

  phoneE164: '+910000000000',        // TODO: Jenish
  phoneDisplay: '+91 00000 00000',   // TODO: Jenish
  email: 'hello@interiorbyjenish.com', // TODO: Jenish
  addressLine: 'Ahmedabad, Gujarat', // TODO: street address for Google

  instagramHandle: 'interiorbyjenish',
  instagramUrl: 'https://www.instagram.com/interiorbyjenish',

  city: 'Ahmedabad',
  region: 'Gujarat',
  country: 'IN',
  geo: { lat: 23.0225, lng: 72.5714 },
  serviceAreas: ['Ahmedabad', 'Gandhinagar', 'Jaipur'],

  /** Client personal names appear in the source folders (Bipinbhai,
   *  Dashrathbhai Bharwad, Harsh Sharma, Dhavalbhai, Niteshbhai).
   *  Off until Jenish confirms consent to publish them. */
  useClientNames: false,
  /** No real testimonials yet - section is hidden rather than faked. */
  showTestimonials: false,
} as const

/** WhatsApp deep link with a pre-filled enquiry. */
export function waHref(
  message = `Hi Jenish, I saw your portfolio and I'd like to discuss an interior project.`,
) {
  return `https://wa.me/${SITE.phoneE164.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
}

export const telHref = `tel:${SITE.phoneE164}`
export const mailHref = `mailto:${SITE.email}`

/** Loud warning at build time if the placeholders are still in place. */
export const HAS_PLACEHOLDER_CONTACT = /0{6,}/.test(SITE.phoneE164)
