import { generateWithFallback, type GenerateOptions } from '../ai/providers';
import { buildModelCardPrompt, PROMPT_TEMPLATE_VERSION } from '../ai/prompts';
import { parseAndValidateAIResponse } from '../ai/validators';
import { ModelCardOutputSchema } from '@/domain/modelops/model-card';
import type { ExperimentMetadata } from '@/types';
import { logger } from '../logger';
import { EvidenceItemSchema, RUBRIC_VERSION, scoreEvidence } from '@/domain/modelops/evidence';
import { env } from '../env';
import { createAbortDeadline } from '@/lib/network/timeout';
import { buildEvidenceCard } from './card';

export function isPublicNonSensitiveEvaluation(metadata: Pick<ExperimentMetadata, 'data_classification' | 'uses_sensitive_data'>): boolean {
  return metadata.data_classification === 'public' && metadata.uses_sensitive_data === false;
}

export async function processModelOpsRequest(metadata: ExperimentMetadata, aiOptions: GenerateOptions = {}) {
  logger.info('[Service] Processing ModelOps evaluation');
  const evidenceItems = [
    { kind: 'model_identity', label: 'Model identity', value: `${metadata.model_name} ${metadata.version}`, provenance: 'submitted', reference: 'model-card-input' },
    { kind: 'dataset', label: 'Evaluation dataset', value: metadata.dataset, provenance: 'submitted', reference: 'model-card-input' },
    ...(metadata.evidence_items || []).map((item) => ({ ...item, provenance: 'submitted' as const })),
  ].map((item) => EvidenceItemSchema.parse(item));
  let card = buildEvidenceCard(metadata);
  const externalAiAllowed = aiOptions.preferredProvider !== 'offline' && env.AI_EGRESS_MODE === 'non_sensitive_only' && isPublicNonSensitiveEvaluation(metadata);

  if (externalAiAllowed) {
    const deadline = createAbortDeadline(env.AI_REQUEST_TIMEOUT_MS, aiOptions.signal);
    try {
      const result = await generateWithFallback(buildModelCardPrompt(evidenceItems), { ...aiOptions, signal: deadline.signal });
      card = parseAndValidateAIResponse(result.raw_text, metadata, evidenceItems);
      logger.info('[Service] Source-backed AI guidance selected', { provider: result.provider });
    } catch (error) {
      logger.warn('[Service] AI suggestion unavailable; deterministic fallback selected', { error_type: error instanceof Error ? error.name : 'UNKNOWN' });
      card.ai_suggestions = { status: 'provider_unavailable', prompt_template_version: PROMPT_TEMPLATE_VERSION, items: [] };
      card.warnings = ['AI suggestions were unavailable or invalid; the submitted evidence is retained for human review.'];
    } finally {
      deadline.dispose();
    }
  } else {
    card.ai_suggestions = { status: 'deterministic_only', prompt_template_version: PROMPT_TEMPLATE_VERSION, items: [] };
    card.warnings = ['External AI suggestions were not used; deterministic evaluation completed.'];
  }

  const score = scoreEvidence(evidenceItems);
  logger.info('[Service] Evaluation finished', { readiness_score: score.score });
  return ModelCardOutputSchema.parse({
    ...card, evidence_items: evidenceItems, rubric_version: RUBRIC_VERSION,
    score_breakdown: score.breakdown, readiness_score: score.score, decision: 'pending_human_review',
  });
}
