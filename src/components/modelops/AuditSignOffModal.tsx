'use client';

import React, { useState } from 'react';
import { ModelCardOutput, ReadinessPolicy, GovernanceAuditEntry } from '@/types/modelops';
import { createAuditSignOff } from '@/lib/modelops/policy';
import { ShieldCheck, Lock, X, Check, FileCheck2, UserCheck, AlertTriangle } from 'lucide-react';

interface AuditSignOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: ModelCardOutput;
  policy: ReadinessPolicy;
  onSignOffSuccess: (entry: GovernanceAuditEntry) => void;
}

export default function AuditSignOffModal({
  isOpen,
  onClose,
  card,
  policy,
  onSignOffSuccess,
}: AuditSignOffModalProps) {
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerRole, setReviewerRole] = useState('Lead ML Safety Officer');
  const [department, setDepartment] = useState('AI Ethics & Governance Office');
  const [notes, setNotes] = useState('Verified quantitative metric thresholds, ethical guardrails, and deterministic reproducibility hash.');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName.trim()) {
      setErrorMsg('Reviewer full name is required for legal and governance sign-off.');
      return;
    }

    const entry = createAuditSignOff(card, policy, {
      reviewer_name: reviewerName,
      reviewer_role: reviewerRole,
      department,
      notes,
    });

    onSignOffSuccess(entry);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-signoff-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white border border-gray-300 rounded-md w-full max-w-lg shadow-xl overflow-hidden text-gray-900 animate-scaleUp">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-emerald-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-emerald-100 border border-emerald-300 flex items-center justify-center text-[#13715B]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="audit-signoff-title" className="text-base font-bold text-gray-900">
                Human Governance Sign-Off
              </h2>
              <p className="text-[11px] text-gray-500">EU AI Act Art. 14 & NIST AI RMF Audit Trail</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSign} className="p-6 space-y-4 text-xs">
          {/* Target Model Summary */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded flex items-center justify-between">
            <div>
              <span className="text-[11px] text-gray-500 font-mono">Target Model:</span>
              <div className="font-bold text-gray-900">{card.model_name} (v{card.version})</div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-gray-500 font-mono">Readiness Score:</span>
              <div className="font-bold text-[#13715B] font-mono">{card.readiness_score} / 100</div>
            </div>
          </div>

          {/* Reviewer Name */}
          <div>
            <label className="block font-bold text-gray-800 mb-1">
              Reviewer Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={reviewerName}
              onChange={(e) => {
                setReviewerName(e.target.value);
                setErrorMsg('');
              }}
              placeholder="e.g., Dr. Jane Doe"
              className="w-full px-3.5 py-2 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
            />
            {errorMsg && (
              <p className="text-red-600 text-[11px] font-semibold mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {errorMsg}
              </p>
            )}
          </div>

          {/* Role & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-800 mb-1">Reviewer Role / Title</label>
              <input
                type="text"
                value={reviewerRole}
                onChange={(e) => setReviewerRole(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B]"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-800 mb-1">Department / Organization</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B]"
              />
            </div>
          </div>

          {/* Governance Notes */}
          <div>
            <label className="block font-bold text-gray-800 mb-1">Governance Sign-Off Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B]"
            />
          </div>

          {/* Cryptographic Guarantee Note */}
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded flex items-start gap-2 text-[11px] text-gray-700 leading-relaxed">
            <Lock className="w-3.5 h-3.5 text-[#13715B] shrink-0 mt-0.5" />
            <span>
              Generating this sign-off produces an immutable SHA-256 digital signature embedded in the model card export for compliance traceability.
            </span>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#13715B] hover:bg-[#0f5c49] text-white font-bold rounded shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Authorize & Sign Entry</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
