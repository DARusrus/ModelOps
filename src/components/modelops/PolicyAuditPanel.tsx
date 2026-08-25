'use client';

import React, { useState } from 'react';
import { ModelCardOutput, ReadinessPolicy, GovernanceAuditEntry } from '@/types/modelops';
import {
  STANDARD_GOVERNANCE_POLICIES,
  evaluatePolicyCompliance,
  PolicyEvaluationResult,
} from '@/lib/modelops/policy';
import AuditSignOffModal from './AuditSignOffModal';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileSignature,
  Lock,
  Building2,
  Calendar,
  KeyRound,
  Check,
} from 'lucide-react';

interface PolicyAuditPanelProps {
  currentCard: ModelCardOutput;
  onAuditLogUpdated?: (trail: GovernanceAuditEntry[]) => void;
}

export default function PolicyAuditPanel({
  currentCard,
  onAuditLogUpdated,
}: PolicyAuditPanelProps) {
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('healthcare_ai');
  const [isSignOffModalOpen, setIsSignOffModalOpen] = useState(false);
  const [auditLog, setAuditLog] = useState<GovernanceAuditEntry[]>(
    currentCard.audit_trail || []
  );

  const evaluation: PolicyEvaluationResult = evaluatePolicyCompliance(
    currentCard,
    selectedPolicyId
  );

  const handleSignOffSuccess = (entry: GovernanceAuditEntry) => {
    const updated = [entry, ...auditLog];
    setAuditLog(updated);
    if (onAuditLogUpdated) {
      onAuditLogUpdated(updated);
    }
  };

  return (
    <div className="bg-white border border-gray-300 rounded-md p-6 sm:p-8 shadow-xs space-y-6 text-gray-900 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-emerald-50 text-[#13715B] border border-emerald-200 rounded text-[11px] font-bold uppercase tracking-wider font-mono">
              Enterprise Governance
            </span>
            <span className="text-xs text-gray-500 font-mono">NIST AI RMF & EU AI Act</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#13715B]" />
            Readiness Policy & Audit Trail
          </h3>
        </div>

        {/* Policy Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="policy-select" className="text-xs font-semibold text-gray-600 font-mono">
            Policy Standard:
          </label>
          <select
            id="policy-select"
            value={selectedPolicyId}
            onChange={(e) => setSelectedPolicyId(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded text-xs bg-white font-mono font-medium focus:ring-1 focus:ring-[#13715B] cursor-pointer"
          >
            {STANDARD_GOVERNANCE_POLICIES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (Min: {p.min_score})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Policy Evaluation Banner */}
      <div
        className={`p-5 border rounded-md transition-all ${
          evaluation.isPassed
            ? 'bg-emerald-50/40 border-emerald-300'
            : 'bg-amber-50/40 border-amber-300'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold font-mono uppercase ${
                  evaluation.isPassed
                    ? 'bg-[#13715B] text-white'
                    : 'bg-amber-700 text-white'
                }`}
              >
                {evaluation.isPassed ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Policy Passed
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" /> Release Blocked
                  </>
                )}
              </span>
              <span className="font-bold text-sm text-gray-900">{evaluation.policy.name}</span>
            </div>

            <p className="text-xs text-gray-700 leading-relaxed max-w-2xl">
              {evaluation.justification}
            </p>

            {/* Unmet rules list if blocked */}
            {!evaluation.isPassed && evaluation.unmetRules.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-amber-900 font-mono">
                {evaluation.unmetRules.map((r, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Action to Sign */}
          <button
            type="button"
            onClick={() => setIsSignOffModalOpen(true)}
            className="px-4 py-2 bg-[#13715B] hover:bg-[#0f5c49] text-white text-xs font-bold rounded shadow-xs flex items-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <FileSignature className="w-4 h-4" />
            <span>Sign & Authorize Audit Entry</span>
          </button>
        </div>
      </div>

      {/* Mandatory Rules Checklist */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono">
          Policy Mandates & Verification Rules
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {evaluation.policy.mandatory_rules.map((rule, i) => (
            <div
              key={i}
              className="p-3 bg-gray-50 border border-gray-200 rounded text-xs flex items-center gap-2 text-gray-800"
            >
              <Check className="w-4 h-4 text-[#13715B] shrink-0" />
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Trail Log History */}
      <div className="border border-gray-200 rounded overflow-hidden space-y-0">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-bold uppercase tracking-wider font-mono text-gray-900 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#13715B]" />
            Immutable Audit Trail Log ({auditLog.length} Entries)
          </span>
          <span className="text-[11px] text-gray-500 font-normal">SHA-256 Signatures</span>
        </div>

        {auditLog.length === 0 ? (
          <div className="p-6 bg-white text-center text-xs text-gray-500 space-y-1">
            <p>No human governance sign-offs recorded for this version candidate yet.</p>
            <p className="text-[11px] text-gray-400">
              Click &quot;Sign & Authorize Audit Entry&quot; above to log an immutable review record.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100/70 border-b border-gray-200 text-gray-700 font-semibold">
                  <th className="p-3">Reviewer & Role</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Cryptographic Signature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {auditLog.map((entry) => (
                  <tr key={entry.audit_id} className="hover:bg-gray-50">
                    <td className="p-3 font-semibold text-gray-900">
                      <div>{entry.reviewer_name}</div>
                      <div className="text-[11px] text-gray-500 font-normal">{entry.reviewer_role}</div>
                    </td>
                    <td className="p-3 text-gray-700">{entry.department}</td>
                    <td className="p-3 font-mono text-gray-600">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-mono">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          entry.policy_status === 'POLICY_PASSED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {entry.policy_status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-gray-600 max-w-xs truncate" title={entry.signature_hash}>
                      {entry.signature_hash}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sign-Off Modal */}
      <AuditSignOffModal
        isOpen={isSignOffModalOpen}
        onClose={() => setIsSignOffModalOpen(false)}
        card={currentCard}
        policy={evaluation.policy}
        onSignOffSuccess={handleSignOffSuccess}
      />
    </div>
  );
}
