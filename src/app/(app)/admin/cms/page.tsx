import Link from 'next/link';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/feedback';
import { TableWrap, Table, THead, TH, TBody, TR, TD } from '@/components/ui/table';
import { requireUserPage } from '@/features/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';
import { buildMetadata } from '@/lib/seo';
import { formatDateShort } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Content', description: 'Site content and FAQs.', path: '/admin/cms', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function AdminCmsPage() {
  await requireUserPage('/admin/cms');
  const supabase = await createServerSupabase();

  const [{ data: pages }, { data: sections }, { data: faqs }, { data: testimonials }] = await Promise.all([
    supabase.from('cms_pages').select('id, slug, title, kind, is_published, needs_legal_review, updated_at').order('slug'),
    supabase.from('cms_sections').select('id, page_slug, key, heading, is_published, sort_order').order('page_slug').order('sort_order'),
    supabase.from('faqs').select('id, question, audience, topic, is_published, sort_order').order('sort_order'),
    supabase.from('testimonials').select('id, author_name, company, is_published, rating, sort_order').order('sort_order'),
  ]);

  const legalNeedingReview = (pages ?? []).filter((p) => p.needs_legal_review);

  return (
    <>
      <PageHeader
        title="Content"
        description="Marketing copy, FAQs and legal pages, all served from the database."
      />

      {legalNeedingReview.length > 0 ? (
        <Alert tone="warning" className="mb-6" title={`${legalNeedingReview.length} legal pages are still marked as drafts`}>
          <p>
            {legalNeedingReview.map((p) => p.title).join(', ')} carry a visible &ldquo;pending legal
            review&rdquo; banner on the public site. Clear{' '}
            <code>needs_legal_review</code> only after a Bangladesh-qualified lawyer has signed off.
          </p>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader><CardTitle as="h2">Pages</CardTitle></CardHeader>
          <CardContent className="p-0">
            <TableWrap label="CMS pages" className="rounded-none border-0">
              <Table>
                <THead><TR><TH>Page</TH><TH>Kind</TH><TH>Status</TH><TH>Updated</TH></TR></THead>
                <TBody>
                  {(pages ?? []).map((page) => (
                    <TR key={page.id}>
                      <TD>
                        <Link href={`/${page.slug}`} className="text-brand-700 hover:underline">{page.title}</Link>
                        <span className="block font-mono text-xs text-ink-500">/{page.slug}</span>
                      </TD>
                      <TD className="capitalize">{page.kind}</TD>
                      <TD>
                        {page.is_published ? <Badge tone="success">Published</Badge> : <Badge tone="neutral">Draft</Badge>}
                        {page.needs_legal_review ? <Badge tone="warning" className="ml-1.5">Needs review</Badge> : null}
                      </TD>
                      <TD className="whitespace-nowrap text-xs text-ink-500">{formatDateShort(page.updated_at)}</TD>
                    </TR>
                  ))}
                  {(pages ?? []).length === 0 ? (
                    <TR><TD colSpan={4} className="py-6 text-center text-ink-500">No CMS pages.</TD></TR>
                  ) : null}
                </TBody>
              </Table>
            </TableWrap>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader><CardTitle as="h2">Homepage sections</CardTitle></CardHeader>
          <CardContent className="p-0">
            <TableWrap label="CMS sections" className="rounded-none border-0">
              <Table>
                <THead><TR><TH>Key</TH><TH>Heading</TH><TH>Page</TH><TH>Status</TH></TR></THead>
                <TBody>
                  {(sections ?? []).map((section) => (
                    <TR key={section.id}>
                      <TD className="font-mono text-xs">{section.key}</TD>
                      <TD className="max-w-xs">{section.heading ?? '—'}</TD>
                      <TD className="text-ink-600">{section.page_slug}</TD>
                      <TD>
                        {section.is_published ? <Badge tone="success">Live</Badge> : <Badge tone="neutral">Hidden</Badge>}
                      </TD>
                    </TR>
                  ))}
                  {(sections ?? []).length === 0 ? (
                    <TR><TD colSpan={4} className="py-6 text-center text-ink-500">No sections configured.</TD></TR>
                  ) : null}
                </TBody>
              </Table>
            </TableWrap>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader><CardTitle as="h2">FAQs ({faqs?.length ?? 0})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <TableWrap label="FAQs" className="rounded-none border-0">
              <Table>
                <THead><TR><TH>Question</TH><TH>Audience</TH><TH>Topic</TH><TH>Status</TH></TR></THead>
                <TBody>
                  {(faqs ?? []).map((faq) => (
                    <TR key={faq.id}>
                      <TD className="max-w-sm">{faq.question}</TD>
                      <TD className="capitalize">{faq.audience}</TD>
                      <TD className="capitalize text-ink-600">{faq.topic}</TD>
                      <TD>{faq.is_published ? <Badge tone="success">Live</Badge> : <Badge tone="neutral">Hidden</Badge>}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader><CardTitle as="h2">Testimonials ({testimonials?.length ?? 0})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <TableWrap label="Testimonials" className="rounded-none border-0">
              <Table>
                <THead><TR><TH>Author</TH><TH>Company</TH><TH>Rating</TH><TH>Status</TH></TR></THead>
                <TBody>
                  {(testimonials ?? []).map((testimonial) => (
                    <TR key={testimonial.id}>
                      <TD>{testimonial.author_name}</TD>
                      <TD className="text-ink-600">{testimonial.company ?? '—'}</TD>
                      <TD>{testimonial.rating ? `${testimonial.rating} ★` : '—'}</TD>
                      <TD>{testimonial.is_published ? <Badge tone="success">Live</Badge> : <Badge tone="neutral">Hidden</Badge>}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          </CardContent>
        </Card>
      </div>

      <Alert tone="info" className="mt-6" title="Editing content">
        <p>
          Content rows are edited directly in the database for now (Supabase table editor, or a
          migration for anything you want reproducible across environments). Because every page
          reads from these tables at runtime, changes appear without a deploy —{' '}
          <FileText aria-hidden className="inline size-3.5" /> the marketing site falls back to
          built-in copy if a row is missing.
        </p>
      </Alert>
    </>
  );
}
