'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Sparkles, Scale, FileText, Settings, Key, Cpu } from 'lucide-react';
import { PreferredProvider } from '@/types/modelops';

interface NavbarProps {
  onScrollToForm?: () => void;
  onScrollToCompare?: () => void;
  onOpenSettings?: () => void;
  preferredProvider?: PreferredProvider;
}

export default function Navbar({
  onScrollToForm,
  onScrollToCompare,
  onOpenSettings,
  preferredProvider = 'auto',
}: NavbarProps) {
  const getProviderBadge = () => {
    switch (preferredProvider) {
      case 'groq':
        return { text: 'Groq Active', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'gemini':
        return { text: 'Gemini Active', color: 'bg-purple-50 text-purple-800 border-purple-200' };
      case 'offline':
        return { text: 'Offline Mode', color: 'bg-gray-100 text-gray-700 border-gray-300' };
      default:
        return { text: 'Auto Engine', color: 'bg-emerald-50 text-[#13715B] border-emerald-200' };
    }
  };

  const badge = getProviderBadge();

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-2xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand & Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
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
          {/* Provider / AI Engine Settings Pill */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border transition-colors cursor-pointer ${badge.color}`}
              title="Configure Custom AI Provider & API Keys"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{badge.text}</span>
            </button>
          )}

          {onScrollToCompare && (
            <button
              type="button"
              onClick={onScrollToCompare}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 transition-colors cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5 text-gray-600" />
              <span>Compare Runs</span>
            </button>
          )}

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
        </div>
      </div>
    </header>
  );
}
