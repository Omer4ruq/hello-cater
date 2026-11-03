import { Star } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { DataToolbar } from '@/components/app/data-toolbar';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/feedback';
import { ReviewModeration } from '@/features/admin/components/review-moderation';
import { requireUserPage } from '@/features/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';
import { buildMetadata } from '@/lib/seo';
import { formatDateTime } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Reviews', description: 'Review moderation.', path: '/admin/reviews', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireUserPage('/admin/reviews');
  const params = await searchParams;
  const supabase = await createServerSupabase();

  let query = supabase
    .from('reviews')
    .select('id, rating, title, comment, status, created_at, moderation_note, partner_profiles(display_name), profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (params.status) query = query.eq('status', params.status as never);

  const { data } = await query;
  const rows = data ?? [];

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Only customers with a completed booking can review, so volume is low and each one matters."
      />

      <DataToolbar
        searchPlaceholder="Search reviews…"
        filters={[{
          key: 'status', label: 'Status',
          options: [
            { value: 'pending', label: 'Pending' },
            { value: 'published', label: 'Published' },
            { value: 'hidden', label: 'Hidden' },
            { value: 'rejected', label: 'Rejected' },
          ],
        }]}
      />

      {rows.length === 0 ? (
        <EmptyState icon={Star} title="No reviews to moderate" description="Reviews appear here as customers submit them after delivered events." />
      ) : (
        <div className="space-y-4">
          {rows.map((review) => {
            const partner = review.partner_profiles as unknown as { display_name: string } | null;
            const author = review.profiles as unknown as { full_name: string } | null;
            return (
              <Card key={review.id}>
                <CardContent>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-ink-900" aria-label={`${review.rating} out of 5`}>
                        <span aria-hidden>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                      </p>
                      <p className="mt-1 text-sm">
                        <span className="font-medium text-ink-950">{partner?.display_name ?? 'Partner'}</span>
                        <span className="text-ink-500"> · reviewed by {author?.full_name ?? 'customer'}</span>
                      </p>
                      <p className="text-xs text-ink-500">{formatDateTime(review.created_at)}</p>
                    </div>
                    <StatusBadge status={review.status} />
                  </div>

                  {review.title ? (
                    <h2 className="mt-3 font-sans text-base font-semibold text-ink-950">{review.title}</h2>
                  ) : null}
                  {review.comment ? (
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{review.comment}</p>
                  ) : null}
                  {review.moderation_note ? (
                    <p className="mt-2 rounded-xl bg-ink-50 p-2.5 text-xs text-ink-600">
                      Moderation note: {review.moderation_note}
                    </p>
                  ) : null}

                  <ReviewModeration reviewId={review.id} status={review.status} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
