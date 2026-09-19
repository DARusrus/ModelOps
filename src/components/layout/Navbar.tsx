'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { History, Shield, Sparkles, LogOut, Users } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface NavbarProps {
  onScrollToForm?: () => void;
  onScrollToHistory?: () => void;
  role?: 'viewer' | 'editor' | 'reviewer' | 'admin';
}

const teamLinkClass = [
  'inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded border border-gray-300',
  'px-2.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2',
  'sm:min-h-10 sm:min-w-0 sm:px-3',
].join(' ');

const signOutButtonClass = [
  'inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded border border-gray-300',
  'px-2.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2',
  'sm:min-h-10 sm:min-w-0 sm:px-3 sm:py-1.5',
].join(' ');

export default function Navbar({
  onScrollToForm,
  onScrollToHistory,
  role,
}: NavbarProps) {
  const router = useRouter();
  const signOut = async () => {
    const client = createSupabaseBrowserClient();
    await client.auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-2xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand & Logo */}
        <div className="flex items-center gap-6">
          <Link href="/modelops" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded bg-[#13715B] flex items-center justify-center text-white shadow-2xs group-hover:bg-[#0f5c49] transition-colors">
              <Shield className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base text-gray-900 tracking-tight leading-tight flex items-center gap-1.5">
                ModelOps
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-gray-100 border border-gray-200 rounded text-gray-600 font-semibold">
                  Studio
                </span>
              </span>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-5 text-xs font-medium text-gray-600">
            <a
              href="#templates"
              className="hover:text-gray-900 transition-colors"
            >
              Templates
            </a>
            <a
              href="#features"
              className="hover:text-gray-900 transition-colors"
            >
              Platform
            </a>
            <a
              href="#spec"
              className="hover:text-gray-900 transition-colors"
            >
              Model Card Spec
            </a>
            <a
              href="#faq"
              className="hover:text-gray-900 transition-colors"
            >
              FAQ
            </a>
          </nav>
        </div>

        {/* Right CTA & Settings Actions */}
        <div className="flex items-center gap-2.5">
          {role === 'admin' && (
            <Link
              href="/settings/members"
              className={teamLinkClass}
            >
              <Users className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only">Team</span>
            </Link>
          )}
          {onScrollToHistory && (
            <button
              type="button"
              onClick={onScrollToHistory}
              className="hidden items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 sm:inline-flex"
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
            </button>
          )}
          {onScrollToForm && (
            <button
              type="button"
              onClick={onScrollToForm}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded bg-[#13715B] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#0f5c49]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Card</span>
            </button>
          )}
          <button type="button" onClick={signOut} className={signOutButtonClass}>
            <LogOut className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
