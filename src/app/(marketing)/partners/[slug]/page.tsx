import { notFound } from 'next/navigation';
import { getPublicPartner, listPublishedPartnerSlugs } from '@/features/marketplace/queries';
import { buildMetadata, JsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { appUrl } from '@/lib/env';
import { PartnerProfileView } from './partner-profile-view';

export const revalidate = 900;

export async function generateStaticParams() {
  const slugs = await listPublishedPartnerSlugs(200);
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicPartner(slug);
  if (!data) return buildMetadata({ title: 'Partner not found', description: '', noIndex: true });

  const { partner } = data;
  return buildMetadata({
    title: partner.seo_title ?? `${partner.display_name} — verified partner`,
    description:
      partner.seo_description ??
      partner.tagline ??
      `${partner.display_name} is a verified catering and event partner on Evently BD. Request a quotation with your date, guest count and budget.`,
    path: `/partners/${slug}`,
    type: 'profile',
    image: partner.cover_image_url ?? undefined,
  });
}

export default async function PartnerProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicPartner(slug);
  if (!data) notFound();

  const { partner } = data;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: partner.display_name,
    description: partner.about ?? partner.tagline ?? undefined,
    image: partner.cover_image_url ?? undefined,
    url: `${appUrl}/partners/${slug}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: partner.city ?? 'Dhaka',
      addressCountry: 'BD',
    },
    ...(partner.rating_count && partner.rating_count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: partner.rating_avg,
            reviewCount: partner.rating_count,
          },
        }
      : {}),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Partners', path: '/partners' },
          { name: partner.display_name ?? slug, path: `/partners/${slug}` },
        ])}
      />
      <PartnerProfileView data={data} slug={slug} />
    </>
  );
}
