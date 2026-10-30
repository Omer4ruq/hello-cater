import { NextResponse, type NextRequest } from 'next/server';
import { createAdminSupabase, createServerSupabase } from '@/lib/supabase/server';
import { getSessionUser } from '@/features/auth/session';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Serves a private file by redirecting to a short-lived signed URL.
 *
 * Authorisation is re-checked here in application code AND enforced by
 * the storage policies in migration 0015 — the signed URL is only minted
 * after the caller proves they may read that specific object. The URL
 * expires in 60 seconds so a leaked link is near-worthless.
 */
const PRIVATE_BUCKETS = new Set([
  'partner-documents', 'request-attachments', 'quote-attachments',
  'event-documents', 'message-attachments', 'invoices',
]);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ bucket: string }> },
) {
  const { bucket } = await context.params;
  const path = request.nextUrl.searchParams.get('path');

  if (!PRIVATE_BUCKETS.has(bucket) || !path) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const user = await getSessionUser().catch(() => null);
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const allowed = await canReadObject(bucket, path);
  if (!allowed) {
    logger.warn('Blocked private file access', { bucket, path, userId: user.id });
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const admin = createAdminSupabase();
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 60);

  if (error || !data?.signedUrl) {
    logger.error('Could not sign storage URL', { bucket, path, error });
    return NextResponse.json({ error: 'File unavailable' }, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl, {
    status: 302,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

/**
 * Re-runs the same ownership question the storage policy asks, using the
 * caller's RLS-scoped client. If the user cannot see the owning row
 * through RLS, they cannot have the file.
 */
async function canReadObject(bucket: string, path: string): Promise<boolean> {
  const scopeId = path.split('/')[0];
  if (!scopeId) return false;

  const supabase = await createServerSupabase();

  switch (bucket) {
    case 'partner-documents': {
      const { data } = await supabase
        .from('partner_documents').select('id').eq('storage_path', path).maybeSingle();
      return Boolean(data);
    }
    case 'request-attachments': {
      const { data } = await supabase
        .from('request_attachments').select('id').eq('storage_path', path).maybeSingle();
      return Boolean(data);
    }
    case 'quote-attachments': {
      const { data } = await supabase
        .from('quote_attachments').select('id').eq('storage_path', path).maybeSingle();
      return Boolean(data);
    }
    case 'event-documents': {
      const { data } = await supabase
        .from('event_documents').select('id').eq('storage_path', path).maybeSingle();
      return Boolean(data);
    }
    case 'message-attachments': {
      const { data } = await supabase
        .from('message_attachments').select('id').eq('storage_path', path).maybeSingle();
      return Boolean(data);
    }
    case 'invoices': {
      const { data } = await supabase
        .from('invoices').select('id').eq('pdf_path', path).maybeSingle();
      return Boolean(data);
    }
    default:
      return false;
  }
}
