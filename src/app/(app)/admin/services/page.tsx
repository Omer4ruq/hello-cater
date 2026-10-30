import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableWrap, Table, THead, TH, TBody, TR, TD, TDNum } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert } from '@/components/ui/feedback';
import { requireUserPage } from '@/features/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';
import { buildMetadata } from '@/lib/seo';
import { formatBps } from '@/lib/money';

export const metadata = buildMetadata({
  title: 'Catalogue', description: 'Service categories and event types.',
  path: '/admin/services', noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function AdminCatalogPage() {
  await requireUserPage('/admin/services');
  const supabase = await createServerSupabase();

  const [{ data: categories }, { data: eventTypes }, { data: cuisines }] = await Promise.all([
    supabase
      .from('service_categories')
      .select('id, slug, name, name_bn, kind, parent_id, commission_bps, is_active, is_featured, sort_order')
      .order('sort_order'),
    supabase
      .from('event_types')
      .select('id, slug, name, name_bn, segment, typical_guests_min, typical_guests_max, is_active, is_featured, sort_order')
      .order('sort_order'),
    supabase.from('cuisines').select('id, slug, name, name_bn, is_active, sort_order').order('sort_order'),
  ]);

  const rows = categories ?? [];
  const nameById = new Map(rows.map((c) => [c.id, c.name]));

  return (
    <>
      <PageHeader
        title="Catalogue"
        description="Service categories, event types and cuisines. These drive the public site, the request wizard and partner matching."
      />

      <Alert tone="info" className="mb-4" title="Catalogue changes are broad">
        Deactivating a category hides it everywhere and excludes it from matching. Existing
        bookings keep their category reference, so history stays intact.
      </Alert>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Services ({rows.length})</TabsTrigger>
          <TabsTrigger value="events">Event types ({eventTypes?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="cuisines">Cuisines ({cuisines?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <Card className="overflow-hidden p-0">
            <TableWrap label="Service categories" className="rounded-none border-0">
              <Table>
                <THead>
                  <TR><TH>Name</TH><TH>Slug</TH><TH>Kind</TH><TH>Parent</TH><TH className="text-right">Commission</TH><TH>Status</TH></TR>
                </THead>
                <TBody>
                  {rows.map((category) => (
                    <TR key={category.id}>
                      <TD>
                        <span className={category.parent_id ? 'pl-4' : 'font-medium'}>{category.name}</span>
                        {category.name_bn ? (
                          <span lang="bn" className="block pl-4 text-xs text-ink-500">{category.name_bn}</span>
                        ) : null}
                      </TD>
                      <TD className="font-mono text-xs text-ink-500">{category.slug}</TD>
                      <TD className="capitalize">{category.kind.replace(/_/g, ' ')}</TD>
                      <TD className="text-ink-600">{category.parent_id ? nameById.get(category.parent_id) : '—'}</TD>
                      <TDNum>{category.commission_bps != null ? formatBps(category.commission_bps) : <span className="text-ink-500">Default</span>}</TDNum>
                      <TD>
                        {category.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Hidden</Badge>}
                        {category.is_featured ? <Badge tone="saffron" className="ml-1.5">Featured</Badge> : null}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card className="overflow-hidden p-0">
            <TableWrap label="Event types" className="rounded-none border-0">
              <Table>
                <THead>
                  <TR><TH>Name</TH><TH>Slug</TH><TH>Segment</TH><TH>Typical guests</TH><TH>Status</TH></TR>
                </THead>
                <TBody>
                  {(eventTypes ?? []).map((eventType) => (
                    <TR key={eventType.id}>
                      <TD>
                        {eventType.name}
                        {eventType.name_bn ? (
                          <span lang="bn" className="block text-xs text-ink-500">{eventType.name_bn}</span>
                        ) : null}
                      </TD>
                      <TD className="font-mono text-xs text-ink-500">{eventType.slug}</TD>
                      <TD className="capitalize">{eventType.segment}</TD>
                      <TD>
                        {eventType.typical_guests_min && eventType.typical_guests_max
                          ? `${eventType.typical_guests_min}–${eventType.typical_guests_max}`
                          : '—'}
                      </TD>
                      <TD>
                        {eventType.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Hidden</Badge>}
                        {eventType.is_featured ? <Badge tone="saffron" className="ml-1.5">Featured</Badge> : null}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          </Card>
        </TabsContent>

        <TabsContent value="cuisines">
          <Card>
            <CardHeader><CardTitle as="h2">Cuisines</CardTitle></CardHeader>
            <CardContent className="pt-3">
              <div className="flex flex-wrap gap-2">
                {(cuisines ?? []).map((cuisine) => (
                  <Badge key={cuisine.id} tone={cuisine.is_active ? 'saffron' : 'neutral'} className="px-3 py-1.5">
                    {cuisine.name}
                    {cuisine.name_bn ? <span lang="bn" className="ml-1.5 opacity-70">{cuisine.name_bn}</span> : null}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
