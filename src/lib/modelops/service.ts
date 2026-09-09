import { generateWithFallback, GenerateOptions } from '../ai/providers';
import { buildModelCardPrompt } from '../ai/prompts';
import { parseAndValidateAIResponse } from '../ai/validators';
import { ModelCardOutput } from './schema';
import { ExperimentMetadata } from '@/types';
import { logger } from '../logger';
import { EvidenceItem, EvidenceItemSchema, RUBRIC_VERSION, scoreEvidence } from '@/domain/modelops/evidence';
import { PROMPT_TEMPLATE_VERSION } from '../ai/prompts';
import { env } from '../env';

function submittedEvidence(metadata: ExperimentMetadata): EvidenceItem[] {
  const foundational: EvidenceItem[] = [
    { kind: 'model_identity', label: 'Model identity', value: `${metadata.model_name} ${metadata.version}`, provenance: 'submitted', reference: 'model-card-input' },
    { kind: 'dataset', label: 'Evaluation dataset', value: metadata.dataset, provenance: 'submitted', reference: 'model-card-input' },
  ];
  const supplied = (metadata.evidence_items || []).map((item) => ({ ...item, provenance: 'submitted' as const }));
  return [...foundational, ...supplied].map((item) => EvidenceItemSchema.parse(item));
}

/** External providers receive only explicitly public, non-sensitive evidence. */
export function isPublicNonSensitiveEvaluation(metadata: Pick<ExperimentMetadata, 'data_classification' | 'uses_sensitive_data'>): boolean {
  return metadata.data_classification === 'public' && metadata.uses_sensitive_data === false;
}

export async function processModelOpsRequest(
  metadata: ExperimentMetadata,
  aiOptions: GenerateOptions = {}
): Promise<ModelCardOutput> {
  logger.info('[Service] Processing ModelOps evaluation');

  let parsedCard: Partial<ModelCardOutput>;
  const evidenceItems = submittedEvidence(metadata);

  const externalAiAllowed = env.AI_EGRESS_MODE === 'non_sensitive_only' && isPublicNonSensitiveEvaluation(metadata);

  try {
    if (!externalAiAllowed) {
      throw new Error(
        metadata.uses_sensitive_data
          ? 'External AI suggestions are disabled for sensitive-data evaluations.'
          : 'External AI suggestions require AI_EGRESS_MODE=non_sensitive_only, an explicit public classification, and a non-sensitive-data declaration.'
      );
    }
    const prompt = buildModelCardPrompt(evidenceItems);
    const aiResult = await generateWithFallback(prompt, aiOptions);
    logger.info('[Service] AI generation completed', { provider: aiResult.provider });
    parsedCard = parseAndValidateAIResponse(aiResult.raw_text, metadata);
  } catch (error: unknown) {
    logger.warn('[Service] AI suggestion unavailable; deterministic fallback selected', { error_type: error instanceof Error ? error.name : 'UNKNOWN' });
    const suggestionStatus = externalAiAllowed ? 'provider_unavailable' : 'deterministic_only';
    
    // Synthesize fallback card strictly grounded in user-supplied 9-section metadata
    parsedCard = {
      model_name: metadata.model_name,
      version: metadata.version,
      dataset: metadata.dataset,
      experiment_info: `Model Evaluation for ${metadata.model_name} (v${metadata.version}) using dataset ${metadata.dataset}. Framework: ${metadata.framework || metadata.model_type || 'General ML'}.`,
      input_shape: metadata.input_shape || metadata.data_split || 'Not specified',
      data_types: metadata.data_types && metadata.data_types.length > 0 ? metadata.data_types : (metadata.model_type ? [metadata.model_type] : []),
      distribution_summary: metadata.eval_preprocessing || metadata.data_volume || 'Distribution data not provided in experiment metadata.',
      metrics: metadata.metrics || {},
      intended_use: metadata.intended_use || metadata.primary_uses || 'General evaluation',
      warnings: [externalAiAllowed ? 'AI suggestion service unavailable; deterministic evaluation completed.' : 'External AI suggestions were not used; deterministic evaluation completed.'],
      limitations: metadata.limitations || [],
      risks: metadata.risks || [],
      tests: metadata.tests || [],
      reproducibility: metadata.reproducibility || 'Not supplied.',
      ai_analysis: 'Deterministic governance analysis performed without active LLM provider connection.',
      detected_issues: metadata.uses_sensitive_data ? ['Model uses sensitive or personal data; ensure GDPR/HIPAA compliance controls.'] : [],
      error_reasons: [],
      suggested_fixes: metadata.mitigations ? [metadata.mitigations] : [],
      next_steps: metadata.recommendations ? [metadata.recommendations] : [],
      references: metadata.license ? [`License: ${metadata.license}`] : [],
      evidence: [
        `Model name: ${metadata.model_name}`,
        `Dataset: ${metadata.dataset}`,
        `Developed by: ${metadata.developed_by || 'AI Engineering Team'}`,
      ],
      ai_suggestions: { status: suggestionStatus, prompt_template_version: PROMPT_TEMPLATE_VERSION, items: [] },
    };
  }

  // Official score reads only submitted or verified-derived evidence, never AI prose.
  const score = scoreEvidence(evidenceItems);

  // Set final card with deterministic score and human review decision
  const finalCard: ModelCardOutput = {
    ...(parsedCard as ModelCardOutput),
    metadata: {
      ...(parsedCard.metadata || {}),
      data_classification: metadata.data_classification,
      uses_sensitive_data: metadata.uses_sensitive_data,
      impacts_human_life: metadata.impacts_human_life,
      mitigations: metadata.mitigations,
    },
    evidence_items: evidenceItems,
    rubric_version: RUBRIC_VERSION,
    score_breakdown: score.breakdown,
    readiness_score: score.score,
    decision: 'pending_human_review', // Never auto-approved
  };

  logger.info(`[Service] Evaluation finished. Readiness Score: ${score.score}/100.`);
  return finalCard;
}
