/** Single source of truth for every business detail. */
export const SITE = {
  name: 'Interior by Jenish',
  shortName: 'IBJ',
  // The logo wordmark on the project decks reads "INTERIOR BY JENISH",
  // which matches the Instagram handle. Used everywhere as the brand name.
  tagline: 'Interior design for homes and offices in Ahmedabad',
  description:
    'Interior by Jenish designs and delivers turnkey interiors for homes and offices across Ahmedabad — from modular kitchens and wardrobes to complete office fit-outs, resolved in full 3D before work begins.',

  phoneE164: '+919099602735',
  phoneDisplay: '+91 90996 02735',
  email: 'interiorbyjenish@gmail.com',

  /** Street address, split for schema.org PostalAddress. New Narol is the
   *  area; Ahmedabad is the city it sits in. */
  street: '3 Sharnam Arise, Opp Nakshtra Aspire, Pooja Farm Road, New Narol',
  postalCode: '382405',
  /** Single-line form, used in the UI. */
  addressLine: '3 Sharnam Arise, Opp Nakshtra Aspire, Pooja Farm Road, New Narol, Ahmedabad 382405',

  instagramHandle: 'interiorbyjenish',
  instagramUrl: 'https://www.instagram.com/interiorbyjenish',

  city: 'Ahmedabad',
  region: 'Gujarat',
  country: 'IN',
  /** Approximate - New Narol, south Ahmedabad. Replace with the exact pin
   *  from Google Maps so the LocalBusiness schema points at the studio
   *  rather than the neighbourhood. */
  geo: { lat: 22.9564, lng: 72.6042 },
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

/** Google Maps search for the studio address. */
export const mapHref =
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${SITE.street}, ${SITE.city}, ${SITE.region} ${SITE.postalCode}`,
  )}`
