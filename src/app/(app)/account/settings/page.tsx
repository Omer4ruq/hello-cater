import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { NotificationPreferences } from '@/features/account/components/notification-preferences';
import { requireUserPage } from '@/features/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Settings', description: 'Notification preferences.',
  path: '/account/settings', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function AccountSettingsPage() {
  const user = await requireUserPage('/account/settings');
  const supabase = await createServerSupabase();

  const audience = user.partnerOrgs.length > 0 ? 'partner' : user.isStaff ? 'platform' : 'customer';

  const [{ data: types }, { data: preferences }] = await Promise.all([
    supabase
      .from('notification_types')
      .select('key, description, audience, default_in_app, default_email, is_transactional')
      .in('audience', [audience, 'all'])
      .order('key'),
    supabase
      .from('notification_preferences')
      .select('type_key, in_app, email, sms, whatsapp')
      .eq('profile_id', user.id),
  ]);

  const byKey = new Map((preferences ?? []).map((p) => [p.type_key, p]));

  return (
    <>
      <h1 className="text-display-sm">Settings</h1>
      <p className="mt-2 text-ink-600">
        Choose how we reach you. Transactional messages about money and confirmed bookings are
        always sent — turning those off would leave you unaware of something you have committed to.
      </p>

      <Card className="mt-7">
        <CardHeader><CardTitle as="h2">Notifications</CardTitle></CardHeader>
        <CardContent className="pt-3">
          <NotificationPreferences
            types={(types ?? []).map((type) => {
              const preference = byKey.get(type.key);
              return {
                key: type.key,
                description: type.description,
                isTransactional: type.is_transactional,
                inApp: preference?.in_app ?? type.default_in_app,
                email: preference?.email ?? type.default_email,
              };
            })}
          />
        </CardContent>
      </Card>

      <Alert tone="info" className="mt-6" title="SMS and WhatsApp">
        The notification system supports SMS and WhatsApp channels, but no provider is connected
        yet. Once one is configured they appear here as additional options.
      </Alert>
    </>
  );
}
