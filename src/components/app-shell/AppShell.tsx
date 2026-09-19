'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, CircleHelp, Menu, ShieldCheck, X } from 'lucide-react';
import Footer from '@/components/layout/Footer';
import SignOutButton from '@/components/auth/SignOutButton';
import { requestJson } from '@/lib/client/api';
import type { WorkspaceContext } from '@/lib/auth/workspace-context';
import { isNavigationItemActive, navigationItemsForRole } from './navigation';

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2';

function WorkspaceLinks({
  pathname,
  role,
  onNavigate,
}: {
  pathname: string;
  role: WorkspaceContext['activeOrganization']['role'];
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Workspace navigation" className="space-y-1">
      {navigationItemsForRole(role).map((item) => {
        const active = isNavigationItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            onClick={onNavigate}
            className={`block border-l-4 px-4 py-3 transition-colors ${focusRing} ${
              active
                ? 'border-emerald-700 bg-emerald-50 text-emerald-950'
                : 'border-transparent text-slate-700 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950'
            }`}
          >
            <span className="block text-sm font-bold">{item.label}</span>
            <span className="mt-0.5 block text-xs leading-5 text-slate-500">{item.description}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function OrganizationSelector({ context, compact = false }: { context: WorkspaceContext; compact?: boolean }) {
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState('');

  async function switchOrganization(organizationId: string) {
    if (!organizationId || organizationId === context.activeOrganization.id) return;
    setSwitching(true);
    setError('');
    try {
      await requestJson('/api/organization/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: organizationId }),
      });
      // An organization change is a tenant boundary. A document replacement
      // clears every organization-scoped client cache and component state
      // after the server has committed the new secure selection cookie.
      window.location.replace('/modelops');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Organization could not be switched.');
      setSwitching(false);
    }
  }

  return (
    <div className={compact ? 'min-w-0' : 'w-full'} aria-busy={switching}>
      <label htmlFor={compact ? 'active-organization-compact' : 'active-organization'} className="sr-only">
        Active organization
      </label>
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
        <select
          id={compact ? 'active-organization-compact' : 'active-organization'}
          value={context.activeOrganization.id}
          disabled={switching || context.organizations.length < 2}
          onChange={(event) => void switchOrganization(event.target.value)}
          className={`min-h-11 min-w-0 rounded border border-slate-300 bg-white px-2 text-sm font-semibold text-slate-900 ${focusRing} disabled:cursor-not-allowed disabled:bg-slate-50 ${compact ? 'max-w-48' : 'w-full'}`}
        >
          {context.organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name} · {organization.role}
            </option>
          ))}
        </select>
      </div>
      {switching && <p role="status" className="mt-1 text-xs text-slate-500">Switching organization…</p>}
      {error && <p role="alert" className="mt-1 text-xs text-rose-700">{error}</p>}
    </div>
  );
}

const signOutClass = `flex min-h-11 w-full cursor-pointer items-center gap-2 rounded px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export default function AppShell({ context, children }: { context: WorkspaceContext; children: React.ReactNode }) {
  const pathname = usePathname();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  function openMobileNavigation() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    setMobileOpen(true);
    dialog.showModal();
    requestAnimationFrame(() => dialog.querySelector<HTMLElement>('a[href]')?.focus());
  }

  function closeMobileNavigation() {
    if (dialogRef.current?.open) dialogRef.current.close();
  }

  function handleDialogClosed() {
    setMobileOpen(false);
    menuButtonRef.current?.focus();
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-950 antialiased">
      <a href="#workspace-content" className={`sr-only z-50 rounded bg-white px-4 py-2 text-sm font-bold text-emerald-900 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 ${focusRing}`}>
        Skip to workspace content
      </a>

      <header className="sticky top-0 z-40 border-b border-slate-300 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[96rem] items-center gap-3 px-4 sm:px-6">
          <button
            ref={menuButtonRef}
            type="button"
            aria-label="Open workspace navigation"
            aria-expanded={mobileOpen}
            aria-controls="mobile-workspace-navigation"
            onClick={openMobileNavigation}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded border border-slate-300 text-slate-800 md:hidden ${focusRing}`}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <Link href="/modelops" className={`flex min-w-0 items-center gap-3 rounded ${focusRing}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-emerald-800 text-white">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black tracking-tight text-slate-950">ModelOps</span>
              <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Governance workspace</span>
            </span>
          </Link>

          <div className="ml-auto hidden items-center gap-4 md:flex">
            <OrganizationSelector context={context} compact />
            <details className="relative">
              <summary aria-label="Open account menu" className={`flex min-h-11 cursor-pointer list-none items-center gap-3 rounded border border-slate-300 bg-white px-3 text-left marker:content-none ${focusRing}`}>
                <span className="min-w-0">
                  <span className="block max-w-52 truncate text-xs font-semibold text-slate-800">{context.accountEmail}</span>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-800">{context.activeOrganization.role}</span>
                </span>
              </summary>
              <div className="absolute right-0 mt-2 w-64 border border-slate-300 bg-white p-2 shadow-lg">
                <Link href="/modelops#faq" className={`flex min-h-11 items-center gap-2 rounded px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 ${focusRing}`}>
                  <CircleHelp className="h-4 w-4" aria-hidden="true" />
                  Help and product guidance
                </Link>
                <SignOutButton className={signOutClass} />
              </div>
            </details>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[96rem] items-stretch">
        <aside className="hidden w-64 shrink-0 border-r border-slate-300 bg-white px-3 py-6 md:block" aria-label="Workspace sidebar">
          <p className="px-4 pb-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Workspace ledger</p>
          <WorkspaceLinks pathname={pathname} role={context.activeOrganization.role} />
          <div className="mt-8 border-t border-slate-200 px-4 pt-5">
            <p className="text-xs font-bold text-slate-900">{context.activeOrganization.name}</p>
            <p className="mt-1 text-xs capitalize text-slate-500">{context.activeOrganization.role} access</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <main
            key={context.activeOrganization.id}
            id="workspace-content"
            tabIndex={-1}
            className="min-h-[60vh] outline-none"
          >
            {children}
          </main>
          <Footer />
        </div>
      </div>

      <dialog
        ref={dialogRef}
        id="mobile-workspace-navigation"
        aria-label="Workspace navigation"
        onClose={handleDialogClosed}
        onCancel={(event) => {
          event.preventDefault();
          closeMobileNavigation();
        }}
        className="m-0 h-dvh w-[min(22rem,88vw)] max-h-none border-0 border-r border-slate-300 bg-white p-0 text-slate-950 shadow-2xl backdrop:bg-slate-950/60 md:hidden"
      >
        <div className="flex h-full flex-col">
          <div className="flex min-h-16 items-center justify-between border-b border-slate-300 px-4">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-slate-700">Workspace menu</span>
            <button type="button" aria-label="Close workspace navigation" onClick={closeMobileNavigation} className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded border border-slate-300 ${focusRing}`}>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="border-b border-slate-200 p-4">
            <OrganizationSelector context={context} />
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <WorkspaceLinks pathname={pathname} role={context.activeOrganization.role} onNavigate={closeMobileNavigation} />
            <Link href="/modelops#faq" onClick={closeMobileNavigation} className={`mt-3 flex min-h-11 items-center gap-2 rounded px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 ${focusRing}`}>
              <CircleHelp className="h-4 w-4" aria-hidden="true" />
              Help and product guidance
            </Link>
          </div>
          <div className="border-t border-slate-300 p-4">
            <p className="truncate text-xs font-semibold text-slate-700">{context.accountEmail}</p>
            <p className="mb-3 mt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800">{context.activeOrganization.role}</p>
            <SignOutButton className={signOutClass} />
          </div>
        </div>
      </dialog>
    </div>
  );
}
