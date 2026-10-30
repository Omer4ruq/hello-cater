-- =====================================================================
-- Evently BD — 0015 Storage buckets and access policies
--
-- Path convention: <scope-uuid>/<subfolder>/<filename>
-- The first path segment is always the owning entity's id, which is what
-- the policies below authorise against.
--
-- Only `public-assets` is world readable. Everything else is private and
-- is served to the browser through short-lived signed URLs minted by the
-- server after an ownership check.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('public-assets', 'public-assets', true, 5242880,
   array['image/jpeg','image/png','image/webp','image/avif','image/svg+xml']),
  ('partner-documents', 'partner-documents', false, 10485760,
   array['application/pdf','image/jpeg','image/png','image/webp']),
  ('request-attachments', 'request-attachments', false, 10485760,
   array['application/pdf','image/jpeg','image/png','image/webp',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('quote-attachments', 'quote-attachments', false, 10485760,
   array['application/pdf','image/jpeg','image/png','image/webp',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('event-documents', 'event-documents', false, 20971520,
   array['application/pdf','image/jpeg','image/png','image/webp',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('message-attachments', 'message-attachments', false, 10485760,
   array['application/pdf','image/jpeg','image/png','image/webp']),
  ('invoices', 'invoices', false, 5242880, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------
-- public-assets: anyone can read; only authenticated users may write, and
-- only under a scope they own.
-- ---------------------------------------------------------------------
create policy "public assets are readable"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'public-assets');

create policy "partners and staff write public assets"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'public-assets'
    and (
      app.is_partner_member((storage.foldername(name))[1]::uuid)
      or app.is_org_member((storage.foldername(name))[1]::uuid)
      or app.is_platform_staff()
    ));

create policy "owners update public assets"
  on storage.objects for update to authenticated
  using (bucket_id = 'public-assets'
         and (owner = auth.uid() or app.is_platform_staff()));

create policy "owners delete public assets"
  on storage.objects for delete to authenticated
  using (bucket_id = 'public-assets'
         and (owner = auth.uid() or app.is_platform_staff()));

-- ---------------------------------------------------------------------
-- partner-documents: <partner_id>/<kind>/<file>
-- ---------------------------------------------------------------------
create policy "partner documents are private"
  on storage.objects for select to authenticated
  using (bucket_id = 'partner-documents'
         and (app.is_partner_member((storage.foldername(name))[1]::uuid)
              or app.has_permission('partners.verify')));

create policy "partners upload their documents"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'partner-documents'
              and app.is_partner_member((storage.foldername(name))[1]::uuid));

create policy "partners remove their documents"
  on storage.objects for delete to authenticated
  using (bucket_id = 'partner-documents'
         and (app.is_partner_admin((storage.foldername(name))[1]::uuid)
              or app.has_permission('partners.verify')));

-- ---------------------------------------------------------------------
-- request-attachments: <request_id>/<file>
-- ---------------------------------------------------------------------
create policy "request attachments scoped"
  on storage.objects for select to authenticated
  using (bucket_id = 'request-attachments'
         and (app.can_view_request((storage.foldername(name))[1]::uuid)
              or app.partner_invited_to_request((storage.foldername(name))[1]::uuid)
              or app.has_permission('requests.view')));

create policy "customers upload request attachments"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'request-attachments'
              and (app.can_view_request((storage.foldername(name))[1]::uuid)
                   or app.has_permission('requests.manage')));

-- ---------------------------------------------------------------------
-- quote-attachments: <quote_id>/<file>
-- ---------------------------------------------------------------------
create policy "quote attachments scoped"
  on storage.objects for select to authenticated
  using (bucket_id = 'quote-attachments'
         and app.can_view_quote((storage.foldername(name))[1]::uuid));

create policy "partners upload quote attachments"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'quote-attachments'
              and app.can_view_quote((storage.foldername(name))[1]::uuid));

-- ---------------------------------------------------------------------
-- event-documents: <event_id>/<file>
-- ---------------------------------------------------------------------
create policy "event documents scoped"
  on storage.objects for select to authenticated
  using (bucket_id = 'event-documents'
         and (app.can_view_event((storage.foldername(name))[1]::uuid)
              or app.partner_on_event((storage.foldername(name))[1]::uuid)
              or app.has_permission('events.manage')));

create policy "event documents upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'event-documents'
              and (app.can_view_event((storage.foldername(name))[1]::uuid)
                   or app.partner_on_event((storage.foldername(name))[1]::uuid)
                   or app.has_permission('events.manage')));

-- ---------------------------------------------------------------------
-- message-attachments: <thread_id>/<file>
-- ---------------------------------------------------------------------
create policy "message attachments scoped"
  on storage.objects for select to authenticated
  using (bucket_id = 'message-attachments'
         and (app.in_thread((storage.foldername(name))[1]::uuid)
              or app.has_permission('messages.view_all')));

create policy "message attachments upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'message-attachments'
              and app.in_thread((storage.foldername(name))[1]::uuid));

-- ---------------------------------------------------------------------
-- invoices: generated server-side only. Readable by the billed party.
-- Writes are service-role exclusive (no INSERT policy for authenticated).
-- ---------------------------------------------------------------------
create policy "invoice pdfs scoped"
  on storage.objects for select to authenticated
  using (bucket_id = 'invoices'
         and exists (
           select 1 from invoices i
           where i.pdf_path = storage.objects.name
             and (i.customer_profile_id = auth.uid()
                  or (i.organization_id is not null and app.is_org_member(i.organization_id))
                  or (i.partner_id is not null and app.is_partner_member(i.partner_id))
                  or app.has_permission('payments.view'))));
