import { Clipboard, RefreshCw, ShieldCheck } from 'lucide-react';
import type { OrganizationInvitation } from '@/domain/organization/contracts';

const actionButtonBase = [
  'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded border px-3 text-xs font-semibold transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

type InvitationListProps = {
  invitations: OrganizationInvitation[];
  loading: boolean;
  busy: boolean;
  onCopy: (invitation: OrganizationInvitation) => void;
  onResend: (invitation: OrganizationInvitation) => void;
  onRevoke: (invitation: OrganizationInvitation) => void;
};

export default function InvitationList({ invitations, loading, busy, onCopy, onResend, onRevoke }: InvitationListProps) {
  function confirmRevocation(invitation: OrganizationInvitation) {
    const confirmed = window.confirm(
      `Revoke the invitation for ${invitation.email}? The current acceptance link will stop working.`,
    );
    if (confirmed) onRevoke(invitation);
  }

  return (
    <section aria-labelledby="invitations-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 id="invitations-heading" className="text-lg font-bold text-slate-950">Invitation register</h2>
          <p className="text-sm text-slate-600">Copying a link is the explicit fallback when email delivery is unavailable.</p>
        </div>
        <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-800" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        {loading && (
          <p className="border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
            Loading organization invitations…
          </p>
        )}
        {!loading && invitations.length === 0 && (
          <p className="border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
            No invitations have been created.
          </p>
        )}
        {!loading && invitations.map((invitation) => (
          <article
            key={invitation.id}
            className="grid gap-3 border border-slate-300 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-950">{invitation.email}</p>
                <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs uppercase text-slate-700">
                  {invitation.role}
                </span>
                <span className={`rounded px-2 py-0.5 font-mono text-xs uppercase ${
                  invitation.status === 'pending'
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {invitation.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Expires {new Date(invitation.expires_at).toLocaleString()}</p>
            </div>

            {invitation.status === 'pending' && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onCopy(invitation)}
                  className={`${actionButtonBase} border-slate-300 text-slate-700 hover:bg-slate-50 focus-visible:ring-emerald-700`}
                >
                  <Clipboard className="h-3.5 w-3.5" />
                  Copy link
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onResend(invitation)}
                  className={`${actionButtonBase} border-emerald-300 text-emerald-900 hover:bg-emerald-50 focus-visible:ring-emerald-700`}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Resend
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => confirmRevocation(invitation)}
                  className={`${actionButtonBase} border-rose-300 text-rose-800 hover:bg-rose-50 focus-visible:ring-rose-700`}
                >
                  Revoke
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
