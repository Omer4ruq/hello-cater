import type { Metadata } from 'next';
import { brand } from '@/config/brand';
import { appUrl } from '@/lib/env';

/** Builds consistent, canonical-aware metadata for every public page. */
export function buildMetadata(input: {
  title: string;
  description: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  keywords?: string[];
  type?: 'website' | 'article' | 'profile';
}): Metadata {
  const url = `${appUrl}${input.path ?? ''}`;
  const image = input.image ?? `${appUrl}/og-default.png`;

  return {
    title: input.title,
    description: input.description,
    keywords: input.keywords,
    alternates: { canonical: url },
    robots: input.noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: brand.name,
      locale: 'en_BD',
      type: input.type ?? 'website',
      images: [{ url: image, width: 1200, height: 630, alt: input.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
      images: [image],
    },
  };
}

/** Organization + WebSite JSON-LD for the site root. */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: brand.name,
    url: appUrl,
    logo: `${appUrl}/logo.svg`,
    description: brand.description,
    email: brand.supportEmail,
    telephone: brand.supportPhone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: brand.address.line1,
      addressLocality: brand.address.city,
      addressCountry: brand.countryCode,
    },
    areaServed: { '@type': 'Country', name: brand.country },
    sameAs: Object.values(brand.social),
  };
}

export function serviceJsonLd(input: {
  name: string;
  description: string;
  path: string;
  category?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    description: input.description,
    serviceType: input.category,
    provider: { '@type': 'Organization', name: brand.name, url: appUrl },
    areaServed: { '@type': 'City', name: brand.launchCity },
    url: `${appUrl}${input.path}`,
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${appUrl}${item.path}`,
    })),
  };
}

export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

/** Inline JSON-LD. The payload is generated server-side, never user input. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
