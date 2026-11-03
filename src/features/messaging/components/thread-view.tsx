'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Info, Send, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn, initials } from '@/lib/utils';
import { formatDateTime } from '@/lib/dates';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/env';
import type { ThreadMessage } from '../queries';
import { sendMessage, markThreadRead } from '../actions';

/**
 * Conversation view.
 *
 * Subscribes to Supabase Realtime for the thread so a reply appears
 * without a refresh, and falls back silently to the server-rendered list
 * if realtime is unavailable.
 */
export function ThreadView({
  threadId, initialMessages, currentUserId, isLocked, contactSharingAllowed, subject,
}: {
  threadId: string;
  initialMessages: ThreadMessage[];
  currentUserId: string;
  isLocked: boolean;
  contactSharingAllowed: boolean;
  subject: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  // Rendered straight from props: realtime triggers router.refresh(),
  // which re-runs the server component and hands down a fresh list read
  // through RLS. Mirroring it into state would only add a render pass
  // and a chance to drift.
  const messages = initialMessages;

  React.useEffect(() => {
    void markThreadRead(threadId);
  }, [threadId]);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  // Realtime: new rows in this thread refresh the server component, which
  // re-reads through RLS rather than trusting the payload.
  React.useEffect(() => {
    if (!isSupabaseConfigured) return;
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;
    try {
      const supabase = createClient();
      channel = supabase
        .channel(`thread:${threadId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
          () => router.refresh(),
        )
        .subscribe();
    } catch {
      // Realtime is an enhancement, never a requirement.
    }
    return () => {
      if (channel) void channel.unsubscribe();
    };
  }, [threadId, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    setPending(true);
    const result = await sendMessage({ threadId, body: draft });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setDraft('');
    router.refresh();
  }

  return (
    <div className="flex h-[calc(100dvh-13rem)] min-h-96 flex-col rounded-2xl border border-ink-200 bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-ink-200 px-5 py-3.5">
        <h2 className="truncate font-sans text-base font-semibold text-ink-950">{subject}</h2>
        {!contactSharingAllowed ? (
          <Badge tone="neutral" className="shrink-0">
            <ShieldAlert aria-hidden className="size-3" /> Contact details hidden
          </Badge>
        ) : null}
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5" role="log" aria-label="Messages" aria-live="polite">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-500">
            No messages yet. Start the conversation below.
          </p>
        ) : null}

        {messages.map((message) => {
          if (message.kind === 'system') {
            return (
              <p key={message.id} className="flex items-center justify-center gap-2 text-center text-xs text-ink-500">
                <Info aria-hidden className="size-3.5" />
                {message.body}
                <span className="text-ink-400">· {formatDateTime(message.createdAt)}</span>
              </p>
            );
          }

          const mine = message.senderId === currentUserId;
          return (
            <div key={message.id} className={cn('flex gap-3', mine && 'flex-row-reverse')}>
              <span
                aria-hidden
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-full text-[0.68rem] font-semibold text-white',
                  message.senderSide === 'platform' ? 'bg-brand-700'
                    : message.senderSide === 'partner' ? 'bg-ink-500' : 'bg-ink-700',
                )}
              >
                {initials(message.senderName)}
              </span>
              <div className={cn('max-w-[min(34rem,80%)]', mine && 'text-right')}>
                <p className="text-xs text-ink-500">
                  {mine ? 'You' : message.senderName}
                  <span className="mx-1.5" aria-hidden>·</span>
                  {formatDateTime(message.createdAt)}
                </p>
                <div
                  className={cn(
                    'mt-1 inline-block whitespace-pre-wrap rounded-xl px-3.5 py-2.5 text-left text-sm leading-relaxed',
                    mine ? 'bg-brand-700 text-white' : 'bg-ink-100 text-ink-900',
                  )}
                >
                  {message.body}
                </div>
                {message.flaggedContact && mine ? (
                  <p className="mt-1 text-xs text-warning-700">
                    Contact details were hidden from the other side.
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="border-t border-ink-200 p-4">
        {isLocked ? (
          <p className="text-center text-sm text-ink-500">This conversation is closed.</p>
        ) : (
          <>
            <div className="flex items-end gap-2">
              <Textarea
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit(e);
                }}
                placeholder="Write a message…"
                aria-label="Message"
                className="min-h-11 resize-none"
              />
              <Button type="submit" size="icon" loading={pending} disabled={!draft.trim()} aria-label="Send message">
                <Send aria-hidden />
              </Button>
            </div>
            {!contactSharingAllowed ? (
              <p className="mt-2 text-xs text-ink-500">
                Phone numbers and email addresses are hidden from the other party until our team opens
                direct contact. Keep commitments on this thread so both sides have a record.
              </p>
            ) : null}
          </>
        )}
      </form>
    </div>
  );
}
