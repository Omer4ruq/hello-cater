import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  PartnerProfileView, type PartnerProfileData,
} from '../../partners/[slug]/partner-profile-view';

// Dev-only: renders the partner profile with fake data so it can be
// screenshotted without a database. Never served in production.
export const metadata: Metadata = { title: 'Partner preview (dev)', robots: { index: false, follow: false } };

const partner = {
  id: 'preview', slug: 'sample-partner-preview', display_name: 'Sample Partner (preview)',
  tagline: 'Fake fixture data for layout preview only', about:
    'This is placeholder text for the dev preview. Nothing on this page describes a real business.\n\nA second paragraph shows how longer descriptions wrap.',
  logo_url: null, cover_image_url: '/img/photos/terrace.jpg', business_type: 'caterer', year_established: 2015,
  min_guests: 30, max_guests: 800, min_order_minor: 5_000_000, lead_time_hours: 72,
  rating_avg: 4.5, rating_count: 2, completed_bookings: 12, is_featured: false, is_accepting_orders: true,
  cancellation_policy: 'Sample cancellation text.', payment_terms: 'Sample payment text.',
  seo_title: null, seo_description: null, published_at: null, organization_name: null, city: 'Dhaka', area: null,
} satisfies PartnerProfileData['partner'];

const fixture = {
  partner,
  packages: [
    {
      id: 'pk1', slug: 'pk1', name: 'Sample package A', description: 'Placeholder package description.',
      hero_image_url: '/img/photos/buffet.jpg', base_price_minor: 0, per_person_price_minor: 120_000,
      min_guests: 50, max_guests: 300, is_featured: true, service_categories: { name: 'Catering' },
      package_items: [
        { id: 'i1', label: 'Sample item one', detail: null, is_optional: false, addon_price_minor: null, sort_order: 1 },
        { id: 'i2', label: 'Sample item two', detail: null, is_optional: true, addon_price_minor: null, sort_order: 2 },
      ],
    },
    {
      id: 'pk2', slug: 'pk2', name: 'Sample package B', description: null, hero_image_url: null,
      base_price_minor: 25_000_000, per_person_price_minor: 0, min_guests: null, max_guests: null,
      is_featured: false, service_categories: null, package_items: [],
    },
  ],
  menus: [
    {
      id: 'm1', name: 'Sample menu', description: 'Placeholder menu.', cuisines: { name: 'Sample cuisine' },
      menu_items: [
        { id: 'mi1', name: 'Sample dish', description: 'Placeholder dish text.', unit: 'per_person', price_minor: 45_000, is_vegetarian: true, sort_order: 1, is_active: true },
        { id: 'mi2', name: 'Another sample dish', description: null, unit: 'per_plate', price_minor: 60_000, is_vegetarian: false, sort_order: 2, is_active: true },
      ],
    },
  ],
  portfolio: [
    { id: 'p1', title: 'Sample event', caption: 'Placeholder caption', image_url: '/img/photos/stage.jpg', guest_count: 200, taken_on: '2026-01-15' },
    { id: 'p2', title: null, caption: null, image_url: '/img/photos/conference.jpg', guest_count: null, taken_on: null },
  ],
  reviews: [
    {
      id: 'r1', rating: 5, quality_rating: 5, communication_rating: 4, punctuality_rating: 5, value_rating: 4,
      title: 'Sample review title', comment: 'Placeholder review text for the preview.', is_anonymous: false,
      created_at: '2026-09-01T10:00:00Z', review_responses: [{ body: 'Placeholder reply.', created_at: '2026-09-02T10:00:00Z' }],
    },
    {
      id: 'r2', rating: 4, quality_rating: 4, communication_rating: 4, punctuality_rating: null, value_rating: 4,
      title: null, comment: 'Second placeholder review.', is_anonymous: true, created_at: '2026-08-01T10:00:00Z', review_responses: [],
    },
  ],
  categories: [
    { category_id: 'c1', is_primary: true, price_from_minor: null, price_to_minor: null, service_categories: { name: 'Catering', slug: 'catering', kind: 'service' } },
    { category_id: 'c2', is_primary: false, price_from_minor: null, price_to_minor: null, service_categories: { name: 'Decoration', slug: 'decoration', kind: 'service' } },
  ],
  serviceAreas: [
    { id: 'a1', cities: { name: 'Dhaka', slug: 'dhaka' }, areas: null },
  ],
  operatingHours: [0, 1, 2, 3, 4, 5, 6].map((d) => ({
    day_of_week: d, opens_at: '09:00:00', closes_at: '21:00:00', is_closed: d === 5,
  })),
} as unknown as PartnerProfileData;

export default function PartnerPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <PartnerProfileView data={fixture} slug="sample-partner-preview" />;
}
