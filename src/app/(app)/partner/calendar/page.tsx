import { PageHeader } from '@/components/app/page-header';
import { requireUserPage } from '@/features/auth/session';
import { activePartner, getPartnerCalendar } from '@/features/partner/queries';
import { PartnerCalendar } from '@/features/partner/components/partner-calendar';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Calendar', description: 'Your booking calendar and blocked dates.',
  path: '/partner/calendar', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function PartnerCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUserPage('/partner/calendar');
  const partner = activePartner(user);
  const params = await searchParams;

  const base = params.month ? new Date(`${params.month}-01T00:00:00`) : new Date();
  const year = base.getFullYear();
  const month = base.getMonth();
  const from = new Date(year, month, 1).toISOString().slice(0, 10);
  const to = new Date(year, month + 1, 0).toISOString().slice(0, 10);

  const data = await getPartnerCalendar(partner.partnerId, from, to);

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Your committed load and the dates you are unavailable. Blocking a date removes you from matching for it."
      />
      <PartnerCalendar
        partnerId={partner.partnerId}
        year={year}
        month={month}
        dailyCapacity={data.dailyCapacity}
        bookings={data.bookings.map((b) => ({
          id: b.id,
          reference: b.reference,
          status: b.status,
          date: b.service_date,
          time: b.service_time,
          headcount: b.headcount,
          title: (b.events as unknown as { title: string } | null)?.title ?? b.reference,
        }))}
        availability={data.availability.map((a) => ({
          date: a.on_date, isBlocked: a.is_blocked, note: a.note, capacityOverride: a.capacity_override,
        }))}
      />
    </>
  );
}
