'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Sparkles, LogOut } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

interface NavbarProps {
  onScrollToForm?: () => void;
}

export default function Navbar({
  onScrollToForm,
}: NavbarProps) {
  const signOut = async () => {
    const client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    await client.auth.signOut();
    window.location.assign('/login');
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
          {onScrollToForm && (
            <button
              type="button"
              onClick={onScrollToForm}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded bg-[#13715B] hover:bg-[#0f5c49] text-white shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Card</span>
            </button>
          )}
          <button type="button" onClick={signOut} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
            <LogOut className="w-3.5 h-3.5" /><span>Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
