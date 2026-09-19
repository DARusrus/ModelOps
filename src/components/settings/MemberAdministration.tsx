'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, LoaderCircle, UserPlus, X } from 'lucide-react';
import type { OrganizationInvitation, OrganizationMember, OrganizationRole } from '@/domain/organization/contracts';
import { isAbortError, requestJson } from '@/lib/client/api';
import InvitationList from './InvitationList';
import MemberTable from './MemberTable';
import { ORGANIZATION_ROLE_OPTIONS } from './organization-role-options';

const roleSelectClass = [
  'min-h-11 w-full cursor-pointer rounded border border-slate-300 bg-white px-3 text-sm outline-none',
  'focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20',
].join(' ');

const inviteButtonClass = [
  'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded bg-emerald-800 px-4 text-sm font-semibold text-white',
  'transition-colors hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2',
  'focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

export default function MemberAdministration() {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrganizationRole>('viewer');
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const [memberBody, invitationBody] = await Promise.all([
        requestJson<{ members: OrganizationMember[] }>('/api/organization/members', { cache: 'no-store', signal }),
        requestJson<{ invitations: OrganizationInvitation[] }>('/api/organization/invitations', { cache: 'no-store', signal }),
      ]);
      setMembers(memberBody.members);
      setInvitations(invitationBody.invitations);
      setError('');
    } catch (cause) {
      if (!isAbortError(cause)) {
        setError(cause instanceof Error ? cause.message : 'Team data could not be loaded.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) void load(controller.signal);
    });
    return () => controller.abort();
  }, [load]);

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setBusy('invite');
    setError('');
    setMessage('');
    try {
      const body = await requestJson<{ delivery: 'sent' | 'manual_required' }>('/api/organization/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      setMessage(
        body.delivery === 'sent'
          ? 'Invitation saved and the email provider accepted the delivery request.'
          : 'Invitation saved, but email delivery was not confirmed. Copy its acceptance link below and share it securely.',
      );
      setEmail('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Invitation could not be created.');
    } finally {
      setBusy('');
    }
  }

  async function mutate(path: string, init: RequestInit, operation: string, success: string) {
    setBusy(operation);
    setError('');
    setMessage('');
    try {
      await requestJson(path, init);
      setMessage(success);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The team change could not be saved.');
    } finally {
      setBusy('');
    }
  }

  async function copyLink(invitation: OrganizationInvitation) {
    try {
      await navigator.clipboard.writeText(invitation.acceptance_url);
      setMessage(`Acceptance link copied for ${invitation.email}.`);
      setError('');
    } catch {
      setError('The browser could not copy the link. Open it and copy the address manually.');
    }
  }

  const isBusy = Boolean(busy);

  return (
    <div className="space-y-8" aria-busy={loading || isBusy}>
      <header className="border-b border-slate-300 pb-6">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">
          Access control ledger
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Members and invitations</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Invite collaborators with the least privilege they need. Role changes and invitation actions are authorized and recorded by the server.
        </p>
      </header>

      {(error || message) && (
        <div
          role={error ? 'alert' : 'status'}
          aria-live="polite"
          className={`flex items-start gap-2 rounded border p-3 text-sm ${
            error
              ? 'border-rose-300 bg-rose-50 text-rose-900'
              : 'border-emerald-300 bg-emerald-50 text-emerald-950'
          }`}
        >
          {error ? <X className="mt-0.5 h-4 w-4 shrink-0" /> : <Check className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{error || message}</span>
        </div>
      )}

      <section
        aria-labelledby="invite-heading"
        className="grid gap-6 border border-slate-300 bg-white p-5 shadow-sm lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]"
      >
        <form onSubmit={invite} className="space-y-4">
          <div>
            <h2 id="invite-heading" className="text-lg font-bold text-slate-950">Invite a collaborator</h2>
            <p className="mt-1 text-sm text-slate-600">
              Invitations expire after seven days. The recipient&apos;s verified email must match.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <div>
              <label htmlFor="invite-email" className="mb-1.5 block text-sm font-semibold text-slate-800">Email address</label>
              <input
                id="invite-email"
                required
                type="email"
                maxLength={320}
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="min-h-11 w-full rounded border border-slate-300 px-3 text-base outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              />
            </div>
            <div>
              <label htmlFor="invite-role" className="mb-1.5 block text-sm font-semibold text-slate-800">Initial role</label>
              <select
                id="invite-role"
                value={role}
                onChange={(event) => setRole(event.target.value as OrganizationRole)}
                className={roleSelectClass}
              >
                {ORGANIZATION_ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={isBusy}
            className={inviteButtonClass}
          >
            {busy === 'invite' ? (
              <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {busy === 'invite' ? 'Saving invitation…' : 'Create invitation'}
          </button>
        </form>

        <aside className="border-l-4 border-emerald-800 bg-slate-950 p-4 text-slate-100">
          <p className="font-mono text-xs uppercase tracking-wider text-emerald-300">Permission key</p>
          <dl className="mt-3 space-y-3">
            {ORGANIZATION_ROLE_OPTIONS.map((option) => (
              <div key={option.value}>
                <dt className="text-sm font-bold">{option.label}</dt>
                <dd className="text-xs leading-5 text-slate-300">{option.description}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </section>

      <MemberTable
        members={members}
        roles={ORGANIZATION_ROLE_OPTIONS}
        loading={loading}
        busy={isBusy}
        onRoleChange={(member, nextRole) => void mutate(
          `/api/organization/members/${member.user_id}`,
          { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: nextRole }) },
          `role-${member.user_id}`,
          `Role updated for ${member.email}.`,
        )}
        onRemove={(member) => void mutate(
          `/api/organization/members/${member.user_id}`,
          { method: 'DELETE' },
          `remove-${member.user_id}`,
          `${member.email} was removed.`,
        )}
      />

      <InvitationList
        invitations={invitations}
        loading={loading}
        busy={isBusy}
        onCopy={(invitation) => void copyLink(invitation)}
        onResend={(invitation) => void mutate(
          `/api/organization/invitations/${invitation.id}`,
          { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resend' }) },
          `resend-${invitation.id}`,
          `Invitation renewed for ${invitation.email}.`,
        )}
        onRevoke={(invitation) => void mutate(
          `/api/organization/invitations/${invitation.id}`,
          { method: 'DELETE' },
          `revoke-${invitation.id}`,
          `Invitation revoked for ${invitation.email}.`,
        )}
      />
    </div>
  );
}
