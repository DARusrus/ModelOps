import { generateWithFallback } from '../ai/providers';
import { buildModelCardPrompt } from '../ai/prompts';
import { parseAndValidateAIResponse } from '../ai/validators';
import { readiness_score } from './tools';
import { ModelCardOutput } from './schema';
import { ExperimentMetadata } from '@/types';
import { logger } from '../logger';
import { LRUCache } from './lru';

const RESPONSE_CACHE = new LRUCache<string, ModelCardOutput>(100);

export async function processModelOpsRequest(metadata: ExperimentMetadata): Promise<ModelCardOutput> {
  const cacheKey = JSON.stringify(metadata);
  if (RESPONSE_CACHE.has(cacheKey)) {
    const cachedResult = RESPONSE_CACHE.get(cacheKey)!;
    logger.info(`[Service] Cache hit for model: "${metadata.model_name}" (v${metadata.version})`);
    return cachedResult;
  }

  logger.info(`[Service] Processing ModelOps evaluation for model: "${metadata.model_name}" (v${metadata.version})`);

  let parsedCard: Partial<ModelCardOutput>;

  try {
    const prompt = buildModelCardPrompt(metadata);
    const aiResult = await generateWithFallback(prompt);
    logger.info(`[Service] AI generation completed via provider "${aiResult.provider}".`);
    parsedCard = parseAndValidateAIResponse(aiResult.raw_text, metadata);
  } catch (error: unknown) {
    logger.warn(`[Service] AI Generation unavailable or failed: ${error instanceof Error ? error.message : String(error)}. Synthesizing deterministic fallback Model Card.`);
    
    // Synthesize fallback card strictly grounded in metadata
    parsedCard = {
      model_name: metadata.model_name,
      version: metadata.version,
      dataset: metadata.dataset,
      experiment_info: `Model Evaluation for ${metadata.model_name} (v${metadata.version}) using dataset ${metadata.dataset}.`,
      input_shape: metadata.input_shape || 'Not specified',
      data_types: metadata.data_types || [],
      distribution_summary: 'Distribution data not provided in experiment metadata.',
      metrics: metadata.metrics || {},
      intended_use: metadata.intended_use,
      warnings: ['Generated in deterministic offline mode due to AI provider unavailability.'],
      limitations: metadata.limitations || ['Evaluated with basic experiment metadata.'],
      risks: metadata.risks || ['Standard operational deployment risks.'],
      tests: metadata.tests || ['Baseline metrics evaluation.'],
      reproducibility: metadata.reproducibility || 'Standard pipeline execution',
      ai_analysis: 'Deterministic analysis performed without active LLM provider connection.',
      detected_issues: [],
      error_reasons: [],
      suggested_fixes: ['Add explicit test cases and risk assessments to increase readiness score.'],
      next_steps: ['Submit model card for human governance sign-off.'],
      references: [],
      evidence: [`Model name: ${metadata.model_name}`, `Dataset: ${metadata.dataset}`],
    };
  }

  // Calculate deterministic readiness score (NEVER set by AI)
  const computedScore = readiness_score(parsedCard);

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

