'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Field, FieldControl, FieldDescription, FieldLabel } from '@/components/ui/field';
import { invitePartnerTeamMember } from '../actions';

/** Invite a colleague into the partner organisation. */
export function TeamInvite({
  partnerId, organizationId,
}: {
  partnerId: string;
  organizationId: string;
}) {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<'admin' | 'manager' | 'staff'>('staff');
  const [pending, setPending] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const result = await invitePartnerTeamMember({ partnerId, organizationId, email, role });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Invitation sent');
    setEmail('');
    router.refresh();
  }

  return (
    <Card>
      <CardHeader><CardTitle as="h2">Invite a colleague</CardTitle></CardHeader>
      <CardContent className="pt-3">
        <form onSubmit={submit} className="space-y-4">
          <Field>
            <FieldLabel>Email address</FieldLabel>
            <FieldDescription>
              If they already have an account they are added immediately; otherwise we email them
              an invitation.
            </FieldDescription>
            <FieldControl>
              <Input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@yourbusiness.com"
              />
            </FieldControl>
          </Field>

          <Field>
            <FieldLabel>Role</FieldLabel>
            <FieldControl>
              <Select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
                <option value="staff">Staff — view and update jobs</option>
                <option value="manager">Manager — quote and manage bookings</option>
                <option value="admin">Admin — full access</option>
              </Select>
            </FieldControl>
          </Field>

          <Button type="submit" block loading={pending} disabled={!email.includes('@')}>
            <UserPlus aria-hidden /> Send invitation
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
