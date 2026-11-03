import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BadgeCheck, CheckCircle2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/feedback';
import { PartnerCard } from '@/features/marketplace/components/partner-card';
import { searchPartners } from '@/features/marketplace/queries';
import { getCatalogCategories, getFaqs } from '@/features/content/queries';
import { buildMetadata, JsonLd, breadcrumbJsonLd, serviceJsonLd, faqJsonLd } from '@/lib/seo';
import { brand } from '@/config/brand';

export const revalidate = 1800;

export async function generateStaticParams() {
  const categories = await getCatalogCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const categories = await getCatalogCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) return buildMetadata({ title: 'Service not found', description: '', noIndex: true });

  return buildMetadata({
    title: category.seo_title ?? `${category.name} in ${brand.launchCity}`,
    description:
      category.seo_description ??
      category.short_description ??
      `Compare quotations for ${category.name.toLowerCase()} in ${brand.launchCity} from verified partners. One request, multiple written proposals, one invoice.`,
    path: `/services/${slug}`,
    keywords: [`${category.name} Dhaka`, `${category.name} Bangladesh`, `${category.name} price Dhaka`],
  });
}

/** Photo per category: a specific match by slug, else one per kind. */
const SLUG_PHOTOS: Record<string, string> = {
  'conference-catering': 'conference', 'meeting-catering': 'conference', 'training-catering': 'panel',
  'wedding-catering': 'longtable', 'premium-catering': 'dining', 'home-party-catering': 'terrace',
  'corporate-event-management': 'conference', 'conference-management': 'panel', 'workshop-training': 'panel',
  'wedding-planning': 'longtable', 'product-launch': 'stage', 'cultural-program': 'audience',
  'venue': 'banquet', 'decorator': 'longtable', 'florist': 'longtable', 'stage': 'stage',
  'lighting': 'stage', 'sound-system': 'audience', 'led-screen': 'audience', 'entertainment': 'audience',
};
const KIND_PHOTOS: Record<string, string> = { catering: 'buffet', event_service: 'stage', vendor: 'banquet' };
const photoFor = (slug: string, kind: string) =>
  `/img/photos/${SLUG_PHOTOS[slug] ?? KIND_PHOTOS[kind] ?? 'banquet'}.jpg`;

export default async function ServiceCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const categories = await getCatalogCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  const [partners, faqs] = await Promise.all([
    searchPartners({ category: slug, pageSize: 8 }),
    getFaqs('customer'),
  ]);

  const siblings = categories.filter(
    (c) => c.parent_id === category.parent_id && c.id !== category.id && c.parent_id,
  ).slice(0, 12);

  const children = categories.filter((c) => c.parent_id === category.id);
  const photo = photoFor(category.slug, category.kind);
  const lower = category.name.toLowerCase();

  return (
    <>
      <JsonLd data={serviceJsonLd({
        name: category.name,
        description: category.short_description ?? `${category.name} in ${brand.launchCity}`,
        path: `/services/${slug}`,
        category: category.kind,
      })} />
      <JsonLd data={breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Services', path: '/services' },
        { name: category.name, path: `/services/${slug}` },
      ])} />
      <JsonLd data={faqJsonLd(faqs.slice(0, 5).map((f) => ({ question: f.question, answer: f.answer })))} />

      {/* ---------------------------------------------------------- Hero */}
      <section className="container-page grid items-center gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14 lg:py-16">
        <div>
          <nav aria-label="Breadcrumb" className="text-sm text-ink-600">
            <Link href="/services" className="font-medium underline-offset-4 hover:text-ink-900 hover:underline">Services</Link>
            <span className="mx-2" aria-hidden>/</span>
            <span className="text-ink-900">{category.name}</span>
          </nav>
          <h1 className="mt-4 text-display-lg font-extrabold tracking-[-0.035em] text-ink-900">
            {category.name} in {brand.launchCity}
          </h1>
          {category.name_bn ? (
            <p lang="bn" className="mt-2 text-lg text-ink-500">{category.name_bn}</p>
          ) : null}
          <p className="mt-5 max-w-xl text-lg text-ink-600">
            {category.description ??
              category.short_description ??
              `Get written quotations for ${lower} from verified partners. Tell us your date, guest count and budget once — we handle the rest.`}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link href={`/plan?service=${slug}`}>
                Get quotations <ArrowRight aria-hidden className="icon-nudge" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="rounded-full px-7">
              <Link href={`/partners?category=${slug}`}>Browse partners</Link>
            </Button>
          </div>
        </div>
        <div className="relative aspect-4/3 overflow-hidden rounded-3xl bg-ink-100">
          <Image src={photo} alt="" fill preload sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        </div>
      </section>

      {/* -------------------------------------------------- How it works */}
      <section className="reveal container-page pt-12" aria-labelledby="how-heading">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div>
            <h2 id="how-heading" className="text-2xl">How it works for {lower}</h2>
            <ol className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                { title: 'Share your brief', body: `Date, guest count, venue and budget. Two minutes, no commitment.` },
                { title: 'We shortlist verified partners', body: `Only partners who actually cover your area, date and capacity for ${lower}.` },
                { title: 'Compare written quotations', body: 'Itemised proposals you can genuinely compare — not verbal estimates that change later.' },
                { title: 'Book and we coordinate', body: 'One agreement, one invoice, and a coordinator through to delivery.' },
              ].map((step, i) => (
                <li
                  key={step.title}
                  className="rounded-2xl bg-ink-50 p-6 transition-[background-color,translate] duration-300 ease-(--ease-out-expo) hover:-translate-y-0.5 hover:bg-ink-100"
                >
                  <span className="text-sm font-bold text-brand-700">Step {i + 1}</span>
                  <h3 className="mt-2 font-sans text-base font-semibold text-ink-900">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-ink-600">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="h-fit rounded-2xl border border-ink-200 p-6 lg:mt-12">
            <h2 className="font-sans text-base font-semibold text-ink-900">Why book through us</h2>
            <ul className="mt-4 space-y-3">
              {[
                'Verified partners only — licence and capacity checked',
                'Comparable written quotations, not phone estimates',
                'One invoice even across several vendors',
                'Payment held by the platform until delivery',
                'A named coordinator for the event day',
              ].map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-ink-700">
                  <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-900" />
                  {point}
                </li>
              ))}
            </ul>
            <Button asChild block className="mt-6 rounded-full">
              <Link href={`/plan?service=${slug}`}>Start your request</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ Partners */}
      <section className="reveal container-page pt-20" aria-labelledby="partners-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 id="partners-heading" className="text-2xl">Verified partners for {lower}</h2>
          <Link href={`/partners?category=${slug}`} className="whitespace-nowrap text-sm font-semibold text-ink-900 underline underline-offset-4">
            See all
          </Link>
        </div>

        {partners.rows.length > 0 ? (
          <div className="mt-5 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {partners.rows.map((partner) => (
              <PartnerCard key={partner.id} partner={partner} />
            ))}
          </div>
        ) : (
          <EmptyState
            className="mt-5"
            icon={BadgeCheck}
            title="No partners listed for this service yet"
            description="We are onboarding verified partners. Submit your requirement anyway — our team sources and vets partners for briefs like yours, including ones not yet listed publicly."
            action={
              <Button asChild className="rounded-full px-6">
                <Link href={`/plan?service=${slug}`}>Submit a requirement</Link>
              </Button>
            }
          />
        )}
      </section>

      {/* ------------------------------------------------- Subcategories */}
      {children.length > 0 ? (
        <section className="reveal container-page pt-20" aria-labelledby="children-heading">
          <h2 id="children-heading" className="text-2xl">Explore {lower}</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/services/${child.slug}`}
                className="rounded-2xl border border-ink-200 p-5 transition-[box-shadow,border-color,translate] duration-300 ease-(--ease-out-expo) hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-md"
              >
                <p className="font-semibold text-ink-900">{child.name}</p>
                {child.short_description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-ink-600">{child.short_description}</p>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------- Related */}
      {siblings.length > 0 ? (
        <section className="reveal container-page pt-16" aria-labelledby="related-heading">
          <h2 id="related-heading" className="font-sans text-base font-semibold text-ink-900">Related services</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {siblings.map((sibling) => (
              <Link
                key={sibling.id}
                href={`/services/${sibling.slug}`}
                className="rounded-full border border-ink-300 px-4 py-2 text-sm font-medium text-ink-900 transition-colors duration-200 hover:border-ink-900"
              >
                {sibling.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* --------------------------------------------------- Final CTA */}
      <section className="reveal container-page pt-24">
        <div className="relative isolate overflow-hidden rounded-3xl px-8 py-20 text-center sm:px-14">
          <Image src={photo} alt="" fill sizes="100vw" className="-z-10 object-cover" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-ink-950/65" />
          <h2 className="mx-auto max-w-2xl text-display-md font-extrabold text-white">
            Get quotations for {lower}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/80">
            One brief, comparable written proposals from verified partners. Free and non-binding.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" variant="accent" className="rounded-full px-7">
              <Link href={`/plan?service=${slug}`}>
                Start your request <ArrowRight aria-hidden className="icon-nudge" />
              </Link>
            </Button>
            <Button
              asChild size="lg" variant="secondary"
              className="rounded-full border-white/40 bg-transparent px-7 text-white hover:border-white hover:bg-white/10"
            >
              <Link href="/contact">
                <MessageSquare aria-hidden /> Talk to our team
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
