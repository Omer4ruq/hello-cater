'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { replyToReview } from '../actions';

/** Public reply to a customer review. */
export function ReviewReply({ reviewId, partnerId }: { reviewId: string; partnerId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [body, setBody] = React.useState('');
  const [pending, setPending] = React.useState(false);

  async function submit() {
    setPending(true);
    const result = await replyToReview({ reviewId, partnerId, body });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Your reply is published');
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" className="mt-4" onClick={() => setOpen(true)}>
        Reply publicly
      </Button>
    );
  }

  return (
    <div className="mt-4">
      <Textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Thank them, address anything specific, and keep it brief. This is public."
        aria-label="Your public reply"
      />
      <div className="mt-2 flex gap-2">
        <Button size="sm" loading={pending} onClick={submit} disabled={body.trim().length < 5}>
          Publish reply
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
