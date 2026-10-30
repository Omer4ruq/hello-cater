'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/input';
import { formatDateTime } from '@/lib/dates';
import { addInternalNote } from '../actions';

/**
 * Staff-only notes.
 *
 * These live in their own table with a staff-only RLS policy rather than
 * as a column on the business record, because column-level privileges
 * cannot distinguish staff from customers — both are the `authenticated`
 * role. A customer cannot read this table at all.
 */
export function InternalNotes({
  entity, entityId, notes,
}: {
  entity: string;
  entityId: string;
  notes: { id: string; body: string; createdAt: string; authorName: string }[];
}) {
  const router = useRouter();
  const [body, setBody] = React.useState('');
  const [pending, setPending] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setPending(true);
    const result = await addInternalNote({ entity, entityId, body });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setBody('');
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="flex items-center gap-2">
          <Lock aria-hidden className="size-3.5 text-ink-400" />
          Internal notes
        </CardTitle>
        <p className="text-xs text-ink-500">Never visible to customers or partners.</p>
      </CardHeader>
      <CardContent className="pt-3">
        <form onSubmit={submit}>
          <Textarea
            rows={3} value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="Context for the next person who picks this up…"
            aria-label="Internal note"
          />
          <Button type="submit" size="sm" className="mt-2" loading={pending} disabled={!body.trim()}>
            Add note
          </Button>
        </form>

        {notes.length > 0 ? (
          <ul className="mt-5 space-y-3 border-t border-ink-200 pt-4">
            {notes.map((note) => (
              <li key={note.id}>
                <p className="whitespace-pre-wrap text-sm text-ink-800">{note.body}</p>
                <p className="mt-1 text-xs text-ink-500">
                  {note.authorName} · {formatDateTime(note.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
