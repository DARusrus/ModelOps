'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ModelCardOutput } from '@/types/modelops';
import {
  STANDARD_GOVERNANCE_POLICIES,
  evaluatePolicyCompliance,
  PolicyEvaluationResult,
} from '@/lib/modelops/policy';
import { clearStableReviewIdempotencyKey, stableReviewIdempotencyKey } from '@/lib/idempotency-client';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Check,
  Send,
} from 'lucide-react';

interface PolicyAuditPanelProps {
  currentCard: ModelCardOutput;
}

interface ReviewEvent { id: string; action: string; reason: string; rubric_version: string; policy_id: string; previous_digest: string | null; digest: string; sequence_no?: number; digest_version?: string; created_at: string; }
interface IntegrityResult { valid: boolean | null; checked_events: number; reason?: string; }

export default function PolicyAuditPanel({
  currentCard,
}: PolicyAuditPanelProps) {
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('healthcare_ai');
  const [workflowState, setWorkflowState] = useState(currentCard.workflow_state || 'draft');
  const [reason, setReason] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<ReviewEvent[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [reviewMode, setReviewMode] = useState<'self_attestation' | 'independent_review'>('self_attestation');
  const [canManageReviewMode, setCanManageReviewMode] = useState(false);
  const [reviewModeError, setReviewModeError] = useState('');
  const [integrity, setIntegrity] = useState<IntegrityResult | null>(null);
  // A history request is allowed to finish after an attestation request. Keep a
  // stale response from reverting the newer, server-confirmed workflow state.
  const historyRevision = useRef(0);

  useEffect(() => {
    if (!currentCard.record_id) return;
    const requestRevision = ++historyRevision.current;
    fetch(`/api/modelops/${currentCard.record_id}/history`, { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Review history could not be loaded.');
        if (historyRevision.current !== requestRevision) return;
        setWorkflowState(body.workflow_state);
        setSelectedPolicyId(body.governance_policy_id || 'enterprise_general');
        setHistory(body.history || []);
        setIntegrity(body.integrity || null);
      })
      .catch((error) => {
        if (historyRevision.current === requestRevision) {
          setHistoryError(error instanceof Error ? error.message : 'Review history could not be loaded.');
        }
      });
  }, [currentCard.record_id]);

  useEffect(() => {
    fetch('/api/organization/governance', { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Review setting could not be loaded.');
        setReviewMode(body.review_mode); setCanManageReviewMode(body.can_manage);
      })
      .catch((error) => setReviewModeError(error instanceof Error ? error.message : 'Review setting could not be loaded.'));
  }, []);

  const changeReviewMode = async (mode: 'self_attestation' | 'independent_review') => {
    setReviewModeError('');
    try {
      const response = await fetch('/api/organization/governance', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ review_mode: mode }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Review setting could not be saved.');
      setReviewMode(body.review_mode);
    } catch (error) { setReviewModeError(error instanceof Error ? error.message : 'Review setting could not be saved.'); }
  };

  const evaluation: PolicyEvaluationResult = evaluatePolicyCompliance(
    currentCard,
    selectedPolicyId
  );

  const availableActions = workflowState === 'draft' ? ['submitted'] : workflowState === 'submitted' ? ['under_review'] : workflowState === 'under_review' ? ['approved', 'rejected', 'changes_requested'] : workflowState === 'changes_requested' ? ['submitted'] : [];
  const submitAction = async (action: string) => {
    if (!currentCard.record_id) { setReviewError('This draft was not saved by the current workspace. Create a new evaluation before starting review.'); return; }
    const submittedReason = reason.trim();
    if (!submittedReason) { setReviewError('A review reason is required.'); return; }
    setIsSubmitting(true); setReviewError('');
    const requestBody = { action, reason: submittedReason, policy_id: selectedPolicyId };
    const retryScope = `${currentCard.record_id}.${action}.${selectedPolicyId}`;
    const requestKey = stableReviewIdempotencyKey(window.localStorage, retryScope);
    try {
      const response = await fetch(`/api/modelops/${currentCard.record_id}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': requestKey }, body: JSON.stringify(requestBody) });
      const body = await response.json();
      if (!response.ok) {
        if (body.code === 'IDEMPOTENCY_CONFLICT') {
          clearStableReviewIdempotencyKey(window.localStorage, retryScope);
          throw new Error('A previous retry for this action used different content. Review the result, then submit again if needed.');
        }
        throw new Error(body.error || 'Review action failed.');
      }
      clearStableReviewIdempotencyKey(window.localStorage, retryScope);
      // Ignore a late initial history request; this response is the newest
      // server-confirmed state for the card.
      historyRevision.current += 1;
      setWorkflowState(body.workflow_state);
      // Do not erase text typed for the next action while this request was in flight.
      setReason((currentReason) => currentReason === submittedReason ? '' : currentReason);
      setHistory((events) => [...events, body.attestation]);
      setIntegrity(null);
    } catch (error) { setReviewError(error instanceof Error ? error.message : 'Review action failed.'); }
    finally { setIsSubmitting(false); }
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
            <span className="text-xs text-gray-500 font-mono">Internal governance review profile</span>
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

      <section className="p-5 bg-slate-950 text-slate-100 border border-slate-800 rounded space-y-3" aria-label="Review attestation">
        <div className="flex items-center justify-between gap-3"><div><p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300 font-mono">Evidence ledger</p><h4 className="font-bold">Durable review attestation</h4></div><span className="px-2 py-1 border border-slate-700 rounded font-mono text-xs uppercase">{workflowState.replace('_', ' ')}</span></div>
        <p className="text-xs text-slate-300">The server records the authenticated actor, evidence snapshot, rubric version, prior digest, and SHA-256 event digest. This is tamper-evident review history—not a legal electronic signature.</p>
        {integrity && <p className={`text-xs ${integrity.valid === true ? 'text-emerald-300' : integrity.valid === null ? 'text-amber-300' : 'text-rose-300'}`}>
          {integrity.valid === true ? `Integrity verified across ${integrity.checked_events} attestation event(s).` : integrity.valid === null ? 'Legacy attestations are retained but cannot be verified under the current digest format.' : `Integrity verification failed: ${integrity.reason || 'unknown mismatch'}.`}
        </p>}
        <div className="rounded border border-slate-700 bg-slate-900/60 p-3 text-xs">
          <p className="font-semibold text-slate-100">{reviewMode === 'self_attestation' ? 'Self-attestation mode' : 'Independent-review mode'}</p>
          <p className="mt-1 text-slate-400">{reviewMode === 'self_attestation' ? 'A solo administrator may approve their own card. The decision is recorded as self-attestation, not independent approval.' : 'The card author cannot approve this card; a different reviewer or administrator must approve it.'}</p>
          {canManageReviewMode && <label htmlFor="review-mode" className="mt-3 flex items-center gap-2 text-slate-300">Review control <select id="review-mode" value={reviewMode} onChange={(event) => changeReviewMode(event.target.value as typeof reviewMode)} className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-xs text-white"><option value="self_attestation">Self-attestation (solo)</option><option value="independent_review">Independent review</option></select></label>}
          {reviewModeError && <p role="alert" className="mt-2 text-rose-300">{reviewModeError}</p>}
        </div>
        {availableActions.length > 0 ? <><label htmlFor="review-reason" className="sr-only">Reason for this workflow action</label><textarea id="review-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={2000} rows={2} placeholder="Reason for this workflow action" className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
          <div className="flex flex-wrap gap-2">{availableActions.map((action) => <button key={action} type="button" disabled={isSubmitting || (action === 'approved' && !evaluation.isPassed)} onClick={() => submitAction(action)} className="px-3 py-2 rounded bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-1.5"><Send className="w-3.5 h-3.5" />{action.replace('_', ' ')}</button>)}</div>
          {availableActions.includes('approved') && !evaluation.isPassed && <p className="text-xs text-amber-300">Approval is disabled because the selected policy is blocked.</p>}</> : <p className="text-xs text-slate-300">This workflow is terminal. A new review cycle is required for further action.</p>}
        {reviewError && <p role="alert" className="text-xs text-rose-300">{reviewError}</p>}
        <div className="border-t border-slate-800 pt-3 space-y-2">
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400 font-mono">Persisted review history</p>
          {historyError ? <p role="alert" className="text-xs text-rose-300">{historyError}</p> : history.length === 0 ? <p className="text-xs text-slate-400">No review actions have been recorded for this card.</p> : <ol className="space-y-2">{history.map((event) => <li key={event.id} className="border-l-2 border-emerald-500/60 pl-3 text-xs"><div className="flex flex-wrap items-center gap-x-2 text-slate-200"><span className="font-bold uppercase">{event.action.replace('_', ' ')}</span><span className="text-slate-400">{new Date(event.created_at).toLocaleString()}</span><span className="font-mono text-slate-500">{event.policy_id}</span></div><p className="mt-1 text-slate-300">{event.reason}</p><p className="mt-1 font-mono text-[10px] text-slate-500">digest {event.digest.slice(0, 16)}… {event.previous_digest ? 'linked to prior event' : 'genesis event'}</p></li>)}</ol>}
        </div>
      </section>
    </div>
  );
}
