import { generateWithFallback } from '../ai/providers';
import { buildModelCardPrompt } from '../ai/prompts';
import { parseAndValidateAIResponse } from '../ai/validators';
import { readiness_score } from './tools';
import { ModelCardOutput, ModelCardOutputSchema } from './schema';
import { ExperimentMetadata } from '@/types';
import { logger } from '../logger';
import { LRUCache } from './lru';

import { calculateReadinessScore } from './readiness';
import { calculateRiskClassification } from './risk';
import { ReadinessScoreResult, RiskClassificationResult } from '@/types';

type ServiceResponse = {
  data: ModelCardOutput;
  provider: string;
  readiness: ReadinessScoreResult;
  risk: RiskClassificationResult;
};

const RESPONSE_CACHE = new LRUCache<string, ServiceResponse>(100);

export async function processModelOpsRequest(metadata: ExperimentMetadata): Promise<ServiceResponse> {
  const cacheKey = JSON.stringify(metadata);
  if (RESPONSE_CACHE.has(cacheKey)) {
    const cachedResult = RESPONSE_CACHE.get(cacheKey)!;
    logger.info(`[Service] Cache hit for model: "${metadata.model_name}" (v${metadata.version})`);
    return cachedResult;
  }

  logger.info(`[Service] Processing ModelOps evaluation for model: "${metadata.model_name}" (v${metadata.version})`);

  let parsedCard: Partial<ModelCardOutput>;
  let providerUsed = 'fallback';

  try {
    const prompt = buildModelCardPrompt(metadata);
    const aiResult = await generateWithFallback(prompt);
    providerUsed = aiResult.provider;
    logger.info(`[Service] AI generation completed via provider "${providerUsed}".`);
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
      overview: `This model is being reviewed for ${metadata.intended_use || 'its intended use'} with a conservative, metadata-driven assessment.`,
      executive_summary: `The evaluation is grounded in the submitted metadata and is intended to support governance review rather than claim full deployment maturity.`,
      architecture: metadata.framework ? `Architecture appears to be implemented using ${metadata.framework}.` : 'Architecture details are limited to the provided metadata.',
      architecture_analysis: metadata.framework ? `The implementation approach is consistent with a ${metadata.framework}-based workflow and should be validated through runtime testing.` : 'Architecture analysis remains limited until more implementation details are available.',
      training_details: metadata.training ? `Training context includes ${Object.entries(metadata.training).map(([k, v]) => `${k}=${v}`).join(', ')}.` : 'Training details are limited to the provided metadata.',
      training_analysis: 'Training analysis is intentionally conservative because explicit training outcomes are not available.',
      dataset_description: `The dataset context is ${metadata.dataset}.`,
      dataset_analysis: 'Dataset analysis is based on the provided metadata and should be expanded with representativeness and coverage review.',
      evaluation: 'Evaluation is limited to the submitted metrics and tests.',
      evaluation_analysis: 'The current evidence supports a preliminary assessment rather than a full production claim.',
      bias_analysis: metadata.risk_assessment?.bias || 'Bias and fairness review should be expanded with downstream evaluation evidence.',
      fairness: 'Fairness assessment remains preliminary and should be validated with domain-specific testing.',
      ethical_considerations: metadata.risk_assessment?.ethics || 'Ethical review should be documented before broad deployment.',
      ethical_analysis: 'Ethical analysis is intentionally cautious until governance evidence is available.',
      failure_cases: metadata.limitations?.length ? `Likely failure modes include ${metadata.limitations.slice(0, 3).join(', ')}.` : 'Likely failure modes should be documented before production release.',
      deployment_readiness: 'Ready for manual review in deterministic offline mode.',
      deployment_analysis: 'Deployment analysis emphasizes operational controls, monitoring readiness, and human review before rollout.',
      production_readiness: 'Production readiness remains provisional pending more evidence and review.',
      production_risks: 'Review operational and governance controls before production deployment.',
      monitoring: 'Monitoring should cover quality, drift, and incident response readiness.',
      monitoring_strategy: 'Monitoring should cover quality, drift, and incident response readiness.',
      rollback_strategy: 'A documented rollback plan should be maintained alongside deployment runbooks.',
      security_considerations: metadata.risk_assessment?.notes || 'Security considerations should be reviewed before deployment.',
      security_analysis: 'Security analysis should cover access, data handling, and deployment controls.',
      risk_assessment: metadata.risks?.length ? `Risk review highlights ${metadata.risks.slice(0, 3).join(', ')}.` : 'Risk assessment is pending additional evidence.',
      detected_issues: ['Limited evidence available for a full deployment assessment.'],
      suggested_fixes: ['Add explicit test cases and risk assessments to increase readiness score.'],
      recommendations: ['Conduct human governance review before production rollout.'],
      next_steps: ['Submit model card for human governance sign-off.'],
      references: [],
      evidence: [`Model name: ${metadata.model_name}`, `Dataset: ${metadata.dataset}`],
      confidence_notes: ['Assessment is based on metadata only and may be improved with richer evidence.'],
      assumptions: ['The analysis assumes the submitted metadata accurately reflects the deployed model.'],
    };
  }

  // Calculate readiness score and risk classification
  const computedReadiness = calculateReadinessScore(metadata);
  const computedRisk = calculateRiskClassification(metadata);

  // Set final card with deterministic score and human review decision
  const normalizedCard = ModelCardOutputSchema.parse(parsedCard);
  const finalCard: ModelCardOutput = {
    ...normalizedCard,
  };

  const finalResult = { 
    data: finalCard, 
    provider: providerUsed,
    readiness: computedReadiness,
    risk: computedRisk
  };
  RESPONSE_CACHE.set(cacheKey, finalResult);

  logger.info(`[Service] Evaluation finished. Readiness Score: ${computedReadiness.score}/100.`);
  return finalResult;
}

