'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { moderateReview } from '../review-actions';

/**
 * Publish, hide or reject a review.
 *
 * We do not remove a review for being negative — only for abuse or for
 * not being about the delivered service. The note is stored so the
 * decision is explicable later.
 */
export function ReviewModeration({ reviewId, status }: { reviewId: string; status: string }) {
  const router = useRouter();
  const [note, setNote] = React.useState('');
  const [pending, setPending] = React.useState<string | null>(null);

  async function moderate(next: 'published' | 'hidden' | 'rejected') {
    if (next !== 'published' && note.trim().length < 3) {
      toast.error('Add a short reason before hiding or rejecting.');
      return;
    }
    setPending(next);
    const result = await moderateReview({ reviewId, status: next, note: note || undefined });
    setPending(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Review ${next}`);
    setNote('');
    router.refresh();
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-4">
      <Input
        className="min-w-48 flex-1"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Moderation note (required to hide or reject)"
        aria-label="Moderation note"
      />
      {status !== 'published' ? (
        <Button size="sm" loading={pending === 'published'} onClick={() => moderate('published')}>
          Publish
        </Button>
      ) : null}
      {status !== 'hidden' ? (
        <Button size="sm" variant="secondary" loading={pending === 'hidden'} onClick={() => moderate('hidden')}>
          Hide
        </Button>
      ) : null}
      <Button size="sm" variant="ghost" className="text-danger-700" loading={pending === 'rejected'} onClick={() => moderate('rejected')}>
        Reject
      </Button>
    </div>
  );
}
