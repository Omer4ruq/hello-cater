import { Star } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Stat } from '@/components/ui/stat';
import { EmptyState } from '@/components/ui/feedback';
import { requireUserPage } from '@/features/auth/session';
import { activePartner, getPartnerProfile } from '@/features/partner/queries';
import { createServerSupabase } from '@/lib/supabase/server';
import { ReviewReply } from '@/features/partner/components/review-reply';
import { buildMetadata } from '@/lib/seo';
import { formatDateShort } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Reviews', description: 'Customer reviews of your service.',
  path: '/partner/reviews', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function PartnerReviewsPage() {
  const user = await requireUserPage('/partner/reviews');
  const partner = activePartner(user);
  const supabase = await createServerSupabase();

  const [profile, { data: reviews }] = await Promise.all([
    getPartnerProfile(partner.partnerId),
    supabase
      .from('reviews')
      .select('id, rating, quality_rating, communication_rating, punctuality_rating, value_rating, title, comment, is_anonymous, created_at, status, review_responses(id, body, created_at)')
      .eq('partner_id', partner.partnerId)
      .eq('status', 'published')
      .order('created_at', { ascending: false }),
  ]);

  const rows = reviews ?? [];
  const average = (key: 'quality_rating' | 'communication_rating' | 'punctuality_rating' | 'value_rating') => {
    const values = rows.map((r) => r[key]).filter((v): v is number => v != null);
    return values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : '—';
  };

  return (
    <>
      <PageHeader
        title="Reviews"
        description="What customers said after their event. A thoughtful reply is public and builds trust."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat
          label="Overall" icon={Star}
          value={profile?.rating_count ? `${profile.rating_avg.toFixed(1)} ★` : '—'}
          hint={`${profile?.rating_count ?? 0} reviews`}
        />
        <Stat label="Food & service" value={average('quality_rating')} />
        <Stat label="Communication" value={average('communication_rating')} />
        <Stat label="Punctuality" value={average('punctuality_rating')} />
        <Stat label="Value" value={average('value_rating')} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={Star}
          title="No reviews yet"
          description="After each delivered event we invite the customer to review you. Reviews can only be left by customers with a completed booking."
        />
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((review) => {
            const response = (review.review_responses as unknown as { id: string; body: string; created_at: string }[] | null)?.[0];
            return (
              <Card key={review.id}>
                <CardContent>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-ink-900" aria-label={`${review.rating} out of 5 stars`}>
                        <span aria-hidden>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                      </p>
                      {review.title ? (
                        <h2 className="mt-1.5 font-sans text-base font-semibold text-ink-950">{review.title}</h2>
                      ) : null}
                    </div>
                    <p className="text-xs text-ink-500">{formatDateShort(review.created_at)}</p>
                  </div>

                  {review.comment ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{review.comment}</p>
                  ) : null}

                  {response ? (
                    <div className="mt-4 rounded-xl border-l-2 border-ink-300 bg-ink-50 p-3.5">
                      <p className="text-sm font-medium text-ink-500">Your reply</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">{response.body}</p>
                    </div>
                  ) : (
                    <ReviewReply reviewId={review.id} partnerId={partner.partnerId} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
