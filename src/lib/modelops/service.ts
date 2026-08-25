import { generateWithFallback, GenerateOptions } from '../ai/providers';
import { buildModelCardPrompt } from '../ai/prompts';
import { parseAndValidateAIResponse } from '../ai/validators';
import { readiness_score } from './tools';
import { ModelCardOutput } from './schema';
import { ExperimentMetadata } from '@/types';
import { logger } from '../logger';
import { LRUCache } from './lru';

const RESPONSE_CACHE = new LRUCache<string, ModelCardOutput>(100);

export async function processModelOpsRequest(
  metadata: ExperimentMetadata,
  aiOptions: GenerateOptions = {}
): Promise<ModelCardOutput> {
  const cacheKey = JSON.stringify({ metadata, provider: aiOptions.preferredProvider || 'auto' });
  if (RESPONSE_CACHE.has(cacheKey)) {
    const cachedResult = RESPONSE_CACHE.get(cacheKey)!;
    logger.info(`[Service] Cache hit for model: "${metadata.model_name}" (v${metadata.version})`);
    return cachedResult;
  }

  logger.info(`[Service] Processing ModelOps evaluation for model: "${metadata.model_name}" (v${metadata.version})`);

  let parsedCard: Partial<ModelCardOutput>;

  try {
    const prompt = buildModelCardPrompt(metadata);
    const aiResult = await generateWithFallback(prompt, aiOptions);
    logger.info(`[Service] AI generation completed via provider "${aiResult.provider}".`);
    parsedCard = parseAndValidateAIResponse(aiResult.raw_text, metadata);
  } catch (error: unknown) {
    logger.warn(`[Service] AI Generation unavailable or offline fallback requested: ${error instanceof Error ? error.message : String(error)}. Synthesizing deterministic fallback Model Card.`);
    
    // Synthesize fallback card strictly grounded in user-supplied 9-section metadata
    const userLimitations = metadata.limitations && metadata.limitations.length > 0
      ? metadata.limitations
      : ['Evaluated with basic experiment metadata.'];

    const userRisks = metadata.risks && metadata.risks.length > 0
      ? metadata.risks
      : metadata.risks_and_harms ? [metadata.risks_and_harms] : ['Standard operational deployment risks.'];

    const userTests = metadata.tests && metadata.tests.length > 0
      ? metadata.tests
      : metadata.disaggregated_results ? [metadata.disaggregated_results] : ['Baseline metrics evaluation.'];

    const userReproducibility = metadata.reproducibility && metadata.reproducibility.trim().length > 0
      ? metadata.reproducibility
      : 'Standard pipeline execution';

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
      warnings: ['Generated in deterministic offline mode due to AI provider unavailability or user offline preference.'],
      limitations: userLimitations,
      risks: userRisks,
      tests: userTests,
      reproducibility: userReproducibility,
      ai_analysis: 'Deterministic governance analysis performed without active LLM provider connection.',
      detected_issues: metadata.uses_sensitive_data ? ['Model uses sensitive or personal data; ensure GDPR/HIPAA compliance controls.'] : [],
      error_reasons: [],
      suggested_fixes: metadata.mitigations ? [metadata.mitigations] : ['Add explicit test cases and risk assessments to increase readiness score.'],
      next_steps: metadata.recommendations ? [metadata.recommendations] : ['Submit model card for human governance sign-off.'],
      references: metadata.license ? [`License: ${metadata.license}`] : [],
      evidence: [
        `Model name: ${metadata.model_name}`,
        `Dataset: ${metadata.dataset}`,
        `Developed by: ${metadata.developed_by || 'AI Engineering Team'}`,
      ],
    };
  }

  // Calculate deterministic readiness score (NEVER set by AI)
  const computedScore = readiness_score({
    ...parsedCard,
    ...metadata,
  });

  // Set final card with deterministic score and human review decision
  const finalCard: ModelCardOutput = {
    ...(parsedCard as ModelCardOutput),
    readiness_score: computedScore,
    decision: 'pending_human_review', // Never auto-approved
  };

  RESPONSE_CACHE.set(cacheKey, finalCard);

  logger.info(`[Service] Evaluation finished. Readiness Score: ${computedScore}/100.`);
  return finalCard;
}
