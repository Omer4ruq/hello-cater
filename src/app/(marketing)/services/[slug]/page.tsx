import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BadgeCheck, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PartnerCard } from '@/features/marketplace/components/partner-card';
import { searchPartners } from '@/features/marketplace/queries';
import { getCategories, getFaqs } from '@/features/content/queries';
import { buildMetadata, JsonLd, breadcrumbJsonLd, serviceJsonLd, faqJsonLd } from '@/lib/seo';
import { brand } from '@/config/brand';

export const revalidate = 1800;

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const categories = await getCategories();
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

const ART: Record<string, string> = {
  catering: '/img/catering.svg',
  event_service: '/img/events.svg',
  vendor: '/img/vendors.svg',
};

export default async function ServiceCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const categories = await getCategories();
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

      <section className="relative overflow-hidden border-b border-ink-200">
        <div className="absolute inset-0 -z-10">
          <Image src={ART[category.kind] ?? '/img/hero.svg'} alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/85 via-ink-950/65 to-ink-950/35" />
        </div>
        <div className="container-page py-16 text-white lg:py-24">
          <nav aria-label="Breadcrumb" className="mb-4 text-sm text-white/60">
            <Link href="/services" className="hover:text-white">Services</Link>
            <span className="mx-2" aria-hidden>/</span>
            <span className="text-white/90">{category.name}</span>
          </nav>

          <h1 className="max-w-3xl text-display-lg text-white">
            {category.name} in {brand.launchCity}
          </h1>
          {category.name_bn ? (
            <p lang="bn" className="mt-2 text-lg text-saffron-300">{category.name_bn}</p>
          ) : null}
          <p className="mt-5 max-w-2xl text-lg text-white/80">
            {category.description ??
              category.short_description ??
              `Get written quotations for ${category.name.toLowerCase()} from verified partners. Tell us your date, guest count and budget once — we handle the rest.`}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="accent">
              <Link href={`/plan?service=${slug}`}>Get quotations <ArrowRight aria-hidden /></Link>
            </Button>
            <Button
              asChild size="lg" variant="secondary"
              className="border-white/25 bg-white/10 text-white hover:bg-white/20"
            >
              <Link href={`/partners?category=${slug}`}>Browse partners</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div>
            <h2 className="text-display-sm">How it works for {category.name.toLowerCase()}</h2>
            <ol className="mt-6 space-y-5">
              {[
                { title: 'Share your brief', body: `Date, guest count, venue and budget. Two minutes, no commitment.` },
                { title: 'We shortlist verified partners', body: `Only partners who actually cover your area, date and capacity for ${category.name.toLowerCase()}.` },
                { title: 'Compare written quotations', body: 'Itemised proposals you can genuinely compare — not verbal estimates that change later.' },
                { title: 'Book and we coordinate', body: 'One agreement, one invoice, and a coordinator through to delivery.' },
              ].map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-700 text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-sans text-base font-semibold text-ink-950">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-600">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <Card className="h-fit p-6">
            <h2 className="font-sans text-base font-semibold text-ink-950">Why book through us</h2>
            <ul className="mt-4 space-y-3">
              {[
                'Verified partners only — licence and capacity checked',
                'Comparable written quotations, not phone estimates',
                'One invoice even across several vendors',
                'Payment held by the platform until delivery',
                'A named coordinator for the event day',
              ].map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-ink-700">
                  <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-600" />
                  {point}
                </li>
              ))}
            </ul>
            <Button asChild block className="mt-6">
              <Link href={`/plan?service=${slug}`}>Start your request</Link>
            </Button>
          </Card>
        </div>
      </section>

      {children.length > 0 ? (
        <section className="border-y border-ink-200 bg-white py-14">
          <div className="container-page">
            <h2 className="text-display-sm">Explore {category.name.toLowerCase()}</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {children.map((child) => (
                <Link key={child.id} href={`/services/${child.slug}`}>
                  <Card interactive className="h-full p-4">
                    <p className="font-sans text-sm font-semibold text-ink-950">{child.name}</p>
                    {child.short_description ? (
                      <p className="mt-1.5 line-clamp-2 text-xs text-ink-600">{child.short_description}</p>
                    ) : null}
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="container-page py-14">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <h2 className="text-display-sm">
            Verified partners for {category.name.toLowerCase()}
          </h2>
          <Button asChild variant="secondary">
            <Link href={`/partners?category=${slug}`}>See all <ArrowRight aria-hidden /></Link>
          </Button>
        </div>

        {partners.rows.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {partners.rows.map((partner) => (
              <PartnerCard key={partner.id} partner={partner} />
            ))}
          </div>
        ) : (
          <Card className="mt-8 p-10 text-center">
            <BadgeCheck aria-hidden className="mx-auto size-6 text-brand-600" />
            <p className="mt-4 font-sans text-base font-semibold text-ink-900">
              We are onboarding partners for this service
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">
              Submit your requirement anyway — our team sources and vets partners for briefs like
              yours, including ones not yet listed publicly.
            </p>
            <Button asChild className="mt-6"><Link href={`/plan?service=${slug}`}>Submit a requirement</Link></Button>
          </Card>
        )}
      </section>

      {siblings.length > 0 ? (
        <section className="container-page pb-16">
          <h2 className="font-sans text-base font-semibold text-ink-950">Related services</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {siblings.map((sibling) => (
              <Link key={sibling.id} href={`/services/${sibling.slug}`}>
                <Badge tone="neutral" className="px-3.5 py-1.5 text-sm hover:border-brand-300 hover:bg-brand-50">
                  {sibling.name}
                </Badge>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
