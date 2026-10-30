'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, Textarea } from '@/components/ui/input';
import { Field, FieldControl, FieldLabel } from '@/components/ui/field';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { assignRequest, updateRequestStatus } from '../actions';

const STATUSES = [
  { value: 'under_review', label: 'Under review' },
  { value: 'matching', label: 'Finding partners' },
  { value: 'partners_invited', label: 'Partners invited' },
  { value: 'quotes_received', label: 'Quotes received' },
  { value: 'proposal_sent', label: 'Proposal sent' },
  { value: 'lost', label: 'Lost' },
  { value: 'cancelled', label: 'Cancelled' },
];

/**
 * Manual status override and assignment.
 *
 * Overrides are always audited — the note is required for terminal
 * states so the reason survives longer than anyone's memory.
 */
export function RequestStatusControl({
  requestId, status, assignedTo,
}: {
  requestId: string;
  status: string;
  assignedTo: string | null;
}) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = React.useState(status);
  const [note, setNote] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [claiming, setClaiming] = React.useState(false);

  const requiresNote = ['lost', 'cancelled'].includes(nextStatus);

  async function save() {
    setPending(true);
    const result = await updateRequestStatus({ requestId, status: nextStatus, note: note || undefined });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Status updated');
    router.refresh();
  }

  async function claim() {
    setClaiming(true);
    const result = await assignRequest({ requestId, assigneeId: null });
    setClaiming(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {!assignedTo ? (
        <Button variant="secondary" size="sm" loading={claiming} onClick={claim}>
          <UserCheck aria-hidden /> Unassign
        </Button>
      ) : null}

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="secondary" size="sm">Change status</Button>
        </DialogTrigger>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Change request status</DialogTitle>
            <DialogDescription>
              Manual overrides are recorded in the audit log with your name.
            </DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel>New status</FieldLabel>
            <FieldControl>
              <Select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
                {STATUSES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </FieldControl>
          </Field>

          <Field className="mt-4">
            <FieldLabel optional={!requiresNote}>Reason</FieldLabel>
            <FieldControl>
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </FieldControl>
          </Field>

          <DialogFooter>
            <Button loading={pending} onClick={save} disabled={requiresNote && note.trim().length < 3}>
              Update status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
