import { z } from 'zod';
import type { EvidenceItem } from '@/domain/modelops/evidence';
import { isReferenceApproved } from './reference-checker';

export const GUIDANCE_VERSION = '2026-10-02.1';
const source = 'docs/readiness-checklist.md';
/** Reviewed against the local rubric/template. These are instructions, not model safety claims. */
export const approvedGuidance = [
  { id: 'missing_metrics', text: 'Supply measured metric evidence with its unit and evaluation reference before relying on a performance comparison.', missing: ['metric'], source },
  { id: 'missing_risks', text: 'Document model-specific risks and limitations; a readiness score does not establish fairness or safety.', missing: ['risk', 'limitation'], source },
  { id: 'missing_tests', text: 'Supply executed test evidence with a result, date and source reference. A test name alone does not establish execution or success.', missing: ['test_run'], source },
  { id: 'missing_reproducibility', text: 'Supply reproducibility evidence containing a seed, source revision and environment reference.', missing: ['reproducibility'], source },
  { id: 'human_review', text: 'A human must review the submitted evidence and applicable policy. The score and AI selection do not approve deployment.', missing: [], source: 'docs/model-card-template.md' },
] as const;

export const GuidanceSelectionSchema = z.object({
  guidance_ids: z.array(z.enum(['missing_metrics', 'missing_risks', 'missing_tests', 'missing_reproducibility', 'human_review'])).min(1).max(5),
}).strict();

export function eligibleGuidance(evidence: readonly EvidenceItem[]) {
  const kinds = new Set(evidence.filter((item) => item.provenance === 'submitted' || item.provenance === 'verified_derived').map((item) => item.kind));
  return approvedGuidance.filter((entry) => entry.missing.length === 0 || entry.missing.some((kind) => !kinds.has(kind)));
}

export function resolveGuidance(raw: unknown, evidence: readonly EvidenceItem[]) {
  const selection = GuidanceSelectionSchema.parse(raw);
  const eligible = eligibleGuidance(evidence);
  return Array.from(new Set(selection.guidance_ids)).map((id) => {
    const entry = eligible.find((candidate) => candidate.id === id);
    if (!entry || !isReferenceApproved(entry.source)) throw new Error('UNSUPPORTED_GUIDANCE');
    return entry;
  });
}
