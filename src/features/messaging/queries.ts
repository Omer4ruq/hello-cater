import 'server-only';

import { createServerSupabase } from '@/lib/supabase/server';

/**
 * Messaging reads.
 *
 * Clients only ever receive `body_public` — the contact-masked copy.
 * Column privileges in migration 0013 revoke SELECT on `messages.body`
 * from the `authenticated` role entirely, so the raw text cannot leak
 * even through a hand-written query.
 */

export type ThreadSummary = {
  id: string;
  kind: string;
  subject: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unread: boolean;
  isLocked: boolean;
  contextLabel: string | null;
  contextHref: string | null;
};

export async function listThreads(surface: 'customer' | 'partner' | 'admin'): Promise<ThreadSummary[]> {
  const supabase = await createServerSupabase();

  const { data: participants } = await supabase
    .from('thread_participants')
    .select(
      'thread_id, last_read_at, side, message_threads!inner(id, kind, subject, last_message_at, last_message_preview, is_locked, request_id, event_id, booking_id)',
    )
    .is('left_at', null)
    .order('created_at', { ascending: false });

  const rows = (participants ?? []).map((p) => {
    const thread = p.message_threads as unknown as {
      id: string; kind: string; subject: string;
      last_message_at: string | null; last_message_preview: string | null;
      is_locked: boolean; request_id: string | null; event_id: string | null; booking_id: string | null;
    };

    const base = surface === 'admin' ? '/admin' : surface === 'partner' ? '/partner' : '/dashboard';
    const contextHref = thread.event_id
      ? `${base}/events/${thread.event_id}`
      : thread.request_id
        ? `${base}/requests/${thread.request_id}`
        : null;

    return {
      id: thread.id,
      kind: thread.kind,
      subject: thread.subject || 'Conversation',
      lastMessageAt: thread.last_message_at,
      lastMessagePreview: thread.last_message_preview,
      unread: Boolean(
        thread.last_message_at &&
          (!p.last_read_at || new Date(thread.last_message_at) > new Date(p.last_read_at)),
      ),
      isLocked: thread.is_locked,
      contextLabel: thread.event_id ? 'Event' : thread.request_id ? 'Request' : null,
      contextHref,
    } satisfies ThreadSummary;
  });

  return rows.sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''));
}

export type ThreadMessage = {
  id: string;
  senderId: string | null;
  senderSide: 'customer' | 'partner' | 'platform';
  senderName: string;
  kind: 'user' | 'system' | 'note';
  body: string;
  flaggedContact: boolean;
  createdAt: string;
};

export async function getThread(threadId: string) {
  const supabase = await createServerSupabase();

  const [{ data: thread }, { data: messages }, { data: participants }] = await Promise.all([
    supabase
      .from('message_threads')
      .select('id, kind, subject, is_locked, contact_sharing_allowed, request_id, event_id, booking_id')
      .eq('id', threadId)
      .maybeSingle(),
    supabase
      .from('messages')
      // `body` is intentionally absent: clients read the masked copy only.
      .select('id, sender_id, sender_side, kind, body_public, flagged_contact, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(500),
    supabase
      .from('thread_participants')
      .select('profile_id, side, last_read_at, profiles(full_name)')
      .eq('thread_id', threadId)
      .is('left_at', null),
  ]);

  if (!thread) return null;

  const namesById = new Map(
    (participants ?? []).map((p) => [
      p.profile_id,
      (p.profiles as unknown as { full_name: string } | null)?.full_name ?? 'Participant',
    ]),
  );

  return {
    thread,
    participants: participants ?? [],
    messages: (messages ?? []).map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      senderSide: m.sender_side,
      senderName: m.sender_id ? (namesById.get(m.sender_id) ?? 'Participant') : 'Evently BD',
      kind: m.kind,
      body: m.body_public,
      flaggedContact: m.flagged_contact,
      createdAt: m.created_at,
    })) satisfies ThreadMessage[],
  };
}

export async function getUnreadThreadCount(): Promise<number> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('thread_participants')
    .select('last_read_at, message_threads!inner(last_message_at)')
    .is('left_at', null);

  return (data ?? []).filter((p) => {
    const thread = p.message_threads as unknown as { last_message_at: string | null };
    if (!thread.last_message_at) return false;
    return !p.last_read_at || new Date(thread.last_message_at) > new Date(p.last_read_at);
  }).length;
}
