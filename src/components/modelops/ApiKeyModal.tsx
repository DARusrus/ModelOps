'use client';

import React, { useState, useEffect } from 'react';
import { UserApiKeys, PreferredProvider } from '@/types/modelops';
import { Key, Shield, Check, X, Sparkles, Cpu, Eye, EyeOff, Lock, Zap } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveKeys: (keys: UserApiKeys) => void;
  currentKeys: UserApiKeys;
}

export default function ApiKeyModal({
  isOpen,
  onClose,
  onSaveKeys,
  currentKeys,
}: ApiKeyModalProps) {
  const [groqKey, setGroqKey] = useState<string>(currentKeys.groqApiKey || '');
  const [geminiKey, setGeminiKey] = useState<string>(currentKeys.geminiApiKey || '');
  const [preferredProvider, setPreferredProvider] = useState<PreferredProvider>(
    currentKeys.preferredProvider || 'auto'
  );
  const [showGroq, setShowGroq] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    setGroqKey(currentKeys.groqApiKey || '');
    setGeminiKey(currentKeys.geminiApiKey || '');
    setPreferredProvider(currentKeys.preferredProvider || 'auto');
  }, [currentKeys, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const newKeys: UserApiKeys = {
      groqApiKey: groqKey.trim() || undefined,
      geminiApiKey: geminiKey.trim() || undefined,
      preferredProvider,
    };
    onSaveKeys(newKeys);
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 600);
  };

  const handleClear = () => {
    setGroqKey('');
    setGeminiKey('');
    setPreferredProvider('auto');
    onSaveKeys({
      groqApiKey: undefined,
      geminiApiKey: undefined,
      preferredProvider: 'auto',
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white border border-gray-300 rounded-md w-full max-w-lg shadow-xl overflow-hidden text-gray-900 animate-scaleUp">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#13715B]">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 id="api-settings-title" className="text-base font-bold text-gray-900">
                AI Engine & API Keys (BYOK)
              </h2>
              <p className="text-[11px] text-gray-500">
                Bring Your Own Key for cloud AI synthesis or use offline mode.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close API settings"
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Privacy & Security Guarantee Banner */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded flex items-start gap-2.5 text-gray-700">
            <Lock className="w-4 h-4 text-[#13715B] shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold text-gray-900">Zero-Storage Privacy Guarantee: </span>
              Your API keys are stored solely in your local browser (<code className="font-mono text-emerald-800">localStorage</code>) and sent directly over encrypted HTTPS headers. They are never logged or stored on our servers.
            </div>
          </div>

          {/* Preferred Provider Selector */}
          <div>
            <label className="block font-bold text-gray-800 mb-1.5">
              Preferred AI Engine / Provider
            </label>
            <select
              value={preferredProvider}
              onChange={(e) => setPreferredProvider(e.target.value as PreferredProvider)}
              className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
            >
              <option value="auto">Auto Failover (Groq LLaMA-3 → Gemini → Offline)</option>
              <option value="groq">Groq (LLaMA-3 8B Fast LPU)</option>
              <option value="gemini">Google Gemini (1.5 Flash Multimodal)</option>
              <option value="offline">Offline Deterministic Synthesizer (Zero Cloud AI)</option>
            </select>
          </div>

          {/* Groq API Key */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-gray-800 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Groq API Key
              </label>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#13715B] hover:underline"
              >
                Get Free Groq Key &rarr;
              </a>
            </div>
            <div className="relative">
              <input
                type={showGroq ? 'text' : 'password'}
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_..."
                className="w-full px-3 py-2 pr-9 border border-gray-300 rounded bg-white font-mono text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
              />
              <button
                type="button"
                onClick={() => setShowGroq(!showGroq)}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-700"
              >
                {showGroq ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Gemini API Key */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-gray-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Google Gemini API Key
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#13715B] hover:underline"
              >
                Get Free Gemini Key &rarr;
              </a>
            </div>
            <div className="relative">
              <input
                type={showGemini ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 pr-9 border border-gray-300 rounded bg-white font-mono text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
              />
              <button
                type="button"
                onClick={() => setShowGemini(!showGemini)}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-700"
              >
                {showGemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
          >
            Clear Keys
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 bg-[#13715B] hover:bg-[#0f5c49] text-white text-xs font-semibold rounded flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              {savedToast ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{savedToast ? 'Saved!' : 'Save & Apply'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
