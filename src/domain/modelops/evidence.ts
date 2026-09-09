import { z } from 'zod';

export const ProvenanceSchema = z.enum(['submitted', 'verified_derived', 'ai_suggestion', 'missing']);
export const EvidenceKindSchema = z.enum(['model_identity', 'dataset', 'metric', 'test_run', 'risk', 'limitation', 'mitigation', 'reproducibility']);
const EvidenceAttributesSchema = z.object({
  unit: z.string().trim().min(1).max(50).optional(), direction: z.enum(['higher_is_better', 'lower_is_better', 'neutral']).optional(),
  evaluation_reference: z.string().trim().min(1).max(500).optional(), test_result: z.enum(['passed', 'failed', 'inconclusive']).optional(),
  executed_at: z.string().datetime({ offset: true }).optional(), seed: z.string().trim().min(1).max(200).optional(),
  source_revision: z.string().trim().min(1).max(500).optional(), environment_reference: z.string().trim().min(1).max(500).optional(),
}).strict();

export const EvidenceItemSchema = z.object({
  id: z.string().uuid().optional(), kind: EvidenceKindSchema, label: z.string().trim().min(1).max(200),
  value: z.string().trim().min(1).max(5000), provenance: ProvenanceSchema.default('submitted'),
  reference: z.string().trim().min(1).max(500).optional(), measured_at: z.string().datetime({ offset: true }).optional(), attributes: EvidenceAttributesSchema.optional(),
}).strict().superRefine((item, ctx) => {
  if (item.kind === 'metric' && (!item.reference || !item.attributes?.unit || !item.attributes.evaluation_reference)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Metric evidence requires a reference, unit, and evaluation reference.', path: ['attributes'] });
  if (item.kind === 'test_run' && (!item.reference || !item.attributes?.test_result || !item.attributes.executed_at)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Test evidence requires a result, execution date, and reference.', path: ['attributes'] });
  if (item.kind === 'reproducibility' && (!item.attributes?.seed || !item.attributes.source_revision || !item.attributes.environment_reference)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Reproducibility evidence requires seed, source revision, and environment reference.', path: ['attributes'] });
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

export const RUBRIC_VERSION = '2026-09-03.2';
export interface RubricCriterion { id: string; label: string; maxPoints: number; requiredKinds: EvidenceItem['kind'][]; }
export const READINESS_RUBRIC: readonly RubricCriterion[] = [
  { id: 'identity', label: 'Model identity', maxPoints: 10, requiredKinds: ['model_identity'] }, { id: 'dataset', label: 'Evaluation dataset', maxPoints: 15, requiredKinds: ['dataset'] },
  { id: 'metrics', label: 'Measured metrics', maxPoints: 25, requiredKinds: ['metric'] }, { id: 'governance', label: 'Risks and limitations', maxPoints: 25, requiredKinds: ['risk', 'limitation'] },
  { id: 'verification', label: 'Tests and reproducibility', maxPoints: 25, requiredKinds: ['test_run', 'reproducibility'] },
];

export function scoreEvidence(evidence: readonly EvidenceItem[]) {
  const scoreable = evidence.filter((item) => item.provenance === 'submitted' || item.provenance === 'verified_derived');
  const justification = READINESS_RUBRIC.map((criterion) => {
    const matched = criterion.requiredKinds.filter((kind) => scoreable.some((item) => item.kind === kind));
    const points = criterion.maxPoints * matched.length / criterion.requiredKinds.length;
    return { criteria: criterion.label, points, max_points: criterion.maxPoints, passed: matched.length === criterion.requiredKinds.length, reason: matched.length === criterion.requiredKinds.length ? 'Required submitted or verified-derived evidence is present.' : `Missing evidence: ${criterion.requiredKinds.filter((kind) => !matched.includes(kind)).join(', ')}.` };
  });
  return { score: justification.reduce((total, item) => total + item.points, 0), breakdown: Object.fromEntries(READINESS_RUBRIC.map((criterion, index) => [criterion.id, justification[index].points])), justification };
}
