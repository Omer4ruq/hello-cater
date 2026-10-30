/**
 * Single source of truth for brand identity.
 *
 * "Evently BD" is a placeholder. To rebrand, change the values here and
 * the matching rows in the `system_settings` table (brand.* keys) — no
 * other file hardcodes the name.
 */
export const brand = {
  name: 'Evently BD',
  legalName: 'Evently BD Ltd.',
  shortName: 'Evently',
  domain: 'eventlybd.com',
  tagline: 'Plan your event. We handle the rest.',
  description:
    'Bangladesh’s managed marketplace for catering and event services. One requirement, multiple verified partners, one proposal, one invoice.',
  supportEmail: 'support@eventlybd.com',
  salesEmail: 'hello@eventlybd.com',
  supportPhone: '+8801700000000',
  supportPhoneDisplay: '+880 1700-000000',
  address: {
    line1: 'Road 11, Gulshan 1',
    city: 'Dhaka 1212',
    country: 'Bangladesh',
  },
  social: {
    facebook: 'https://facebook.com/eventlybd',
    linkedin: 'https://linkedin.com/company/eventlybd',
    instagram: 'https://instagram.com/eventlybd',
  },
  /** Primary launch market. Additional cities are added through admin. */
  launchCity: 'Dhaka',
  country: 'Bangladesh',
  countryCode: 'BD',
  currency: 'BDT',
  currencySymbol: '৳',
  phonePrefix: '+880',
  timezone: 'Asia/Dhaka',
  locales: ['en', 'bn'] as const,
  defaultLocale: 'en' as const,
} as const;

export type Locale = (typeof brand.locales)[number];
