import { Badge } from './badge';
import type { Enums } from '@/types/database';

type Tone = 'neutral' | 'brand' | 'saffron' | 'success' | 'warning' | 'danger' | 'info' | 'clay';

/**
 * Status vocabulary shared by every surface. Keeping labels and tones in
 * one map means a status never reads "in_preparation" in one table and
 * "Preparing" in another.
 */
const STATUS: Record<string, { label: string; tone: Tone }> = {
  // Requests
  draft: { label: 'Draft', tone: 'neutral' },
  submitted: { label: 'Submitted', tone: 'info' },
  under_review: { label: 'Under review', tone: 'info' },
  matching: { label: 'Finding partners', tone: 'info' },
  partners_invited: { label: 'Partners invited', tone: 'saffron' },
  quotes_received: { label: 'Quotes received', tone: 'saffron' },
  proposal_sent: { label: 'Proposal sent', tone: 'brand' },
  won: { label: 'Confirmed', tone: 'success' },
  lost: { label: 'Not proceeding', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'neutral' },

  // Invitations
  invited: { label: 'Invited', tone: 'info' },
  viewed: { label: 'Viewed', tone: 'info' },
  accepted: { label: 'Accepted', tone: 'success' },
  declined: { label: 'Declined', tone: 'neutral' },
  withdrawn: { label: 'Withdrawn', tone: 'neutral' },

  // Quotes & proposals
  shared: { label: 'Shared with customer', tone: 'brand' },
  changes_requested: { label: 'Changes requested', tone: 'warning' },
  rejected: { label: 'Declined', tone: 'danger' },
  sent: { label: 'Sent', tone: 'brand' },

  // Bookings
  pending_payment: { label: 'Awaiting payment', tone: 'warning' },
  partially_paid: { label: 'Part paid', tone: 'warning' },
  confirmed: { label: 'Confirmed', tone: 'success' },
  in_preparation: { label: 'In preparation', tone: 'info' },
  ready: { label: 'Ready', tone: 'info' },
  in_progress: { label: 'In progress', tone: 'saffron' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  disputed: { label: 'Disputed', tone: 'danger' },
  refunded: { label: 'Refunded', tone: 'clay' },
  closed: { label: 'Closed', tone: 'neutral' },

  // Event stages
  inquiry: { label: 'Inquiry', tone: 'neutral' },
  proposal: { label: 'Proposal', tone: 'info' },
  planning: { label: 'Planning', tone: 'info' },
  vendor_preparation: { label: 'Vendor prep', tone: 'info' },
  pre_event: { label: 'Pre-event', tone: 'saffron' },
  event_day: { label: 'Event day', tone: 'saffron' },

  // Payments & payouts
  initiated: { label: 'Initiated', tone: 'neutral' },
  pending: { label: 'Pending', tone: 'warning' },
  authorized: { label: 'Authorised', tone: 'info' },
  paid: { label: 'Paid', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  partially_refunded: { label: 'Part refunded', tone: 'clay' },
  approved: { label: 'Approved', tone: 'info' },
  processing: { label: 'Processing', tone: 'info' },

  // Verification
  unsubmitted: { label: 'Not submitted', tone: 'neutral' },
  suspended: { label: 'Suspended', tone: 'danger' },

  // Invoices
  issued: { label: 'Issued', tone: 'info' },
  overdue: { label: 'Overdue', tone: 'danger' },
  void: { label: 'Void', tone: 'neutral' },

  // Tasks & tickets
  todo: { label: 'To do', tone: 'neutral' },
  blocked: { label: 'Blocked', tone: 'danger' },
  done: { label: 'Done', tone: 'success' },
  open: { label: 'Open', tone: 'warning' },
  waiting: { label: 'Waiting', tone: 'info' },
  resolved: { label: 'Resolved', tone: 'success' },

  // Reviews
  published: { label: 'Published', tone: 'success' },
  hidden: { label: 'Hidden', tone: 'neutral' },
};

export type StatusValue =
  | Enums<'request_status'> | Enums<'booking_status'> | Enums<'quote_status'>
  | Enums<'proposal_status'> | Enums<'payment_status'> | Enums<'payout_status'>
  | Enums<'invite_status'> | Enums<'verification_status'> | Enums<'event_stage'>
  | Enums<'task_status'> | Enums<'ticket_status'> | Enums<'invoice_status'>
  | Enums<'review_status'> | Enums<'refund_status'> | (string & {});

export function statusLabel(status: StatusValue): string {
  return STATUS[status]?.label ?? String(status).replace(/_/g, ' ');
}

export function StatusBadge({ status, className }: { status: StatusValue; className?: string }) {
  const entry = STATUS[status] ?? { label: String(status).replace(/_/g, ' '), tone: 'neutral' as const };
  return (
    <Badge tone={entry.tone} className={className}>
      {entry.label}
    </Badge>
  );
}
