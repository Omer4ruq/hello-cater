import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/app/page-header';
import { Alert } from '@/components/ui/feedback';
import { ReviewForm } from '@/features/reviews/components/review-form';
import { requireUserPage } from '@/features/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';
import { buildMetadata } from '@/lib/seo';
import { formatEventDate } from '@/lib/dates';

export const metadata = buildMetadata({
  title: 'Leave a review', description: 'Review your event partner.',
  path: '/dashboard/bookings', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function ReviewBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUserPage(`/dashboard/bookings/${id}/review`);

  const supabase = await createServerSupabase();
  const [{ data: booking }, { data: existing }] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, status, service_date, partner_profiles(display_name, slug), events(id, title, reference), service_categories(name)')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('reviews').select('id, rating').eq('booking_id', id).maybeSingle(),
  ]);

  if (!booking) notFound();

  const partner = booking.partner_profiles as unknown as { display_name: string; slug: string } | null;
  const event = booking.events as unknown as { id: string; title: string; reference: string } | null;
  const category = booking.service_categories as unknown as { name: string } | null;

  const delivered = ['completed', 'closed'].includes(booking.status);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          ...(event ? [{ label: event.title, href: `/dashboard/events/${event.id}` }] : []),
          { label: 'Review' },
        ]}
        title={`How did ${partner?.display_name ?? 'it'} do?`}
        description={[
          category?.name,
          event?.title,
          formatEventDate(booking.service_date),
        ].filter(Boolean).join(' · ')}
      />

      {existing ? (
        <Alert tone="info" title="You have already reviewed this booking">
          <p>
            Thank you — your {existing.rating}-star review is published on{' '}
            {partner?.slug ? (
              <Link href={`/partners/${partner.slug}`} className="font-medium underline underline-offset-4">
                {partner.display_name}&rsquo;s profile
              </Link>
            ) : (
              'their profile'
            )}
            . If something needs correcting, contact support.
          </p>
        </Alert>
      ) : !delivered ? (
        <Alert tone="warning" title="This event has not been delivered yet">
          You can review once the partner has marked the job delivered. We will email you when it is
          time.
        </Alert>
      ) : (
        <ReviewForm
          bookingId={booking.id}
          partnerName={partner?.display_name ?? 'this partner'}
          eventTitle={event?.title ?? 'your event'}
          eventId={event?.id ?? ''}
        />
      )}
    </div>
  );
}
