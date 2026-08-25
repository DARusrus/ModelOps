import { ModelCardOutputSchema, ModelCardOutput } from '../modelops/schema';
import { ExperimentMetadata } from '@/types';
import { logger } from '../logger';

export function parseAndValidateAIResponse(
  rawText: string,
  metadata: ExperimentMetadata
): ModelCardOutput {
  let cleaned = rawText.trim();

  // Extract JSON payload using string methods instead of expensive regex
  const firstTick = cleaned.indexOf('```');
  if (firstTick !== -1) {
    const firstNewline = cleaned.indexOf('\n', firstTick);
    const lastTick = cleaned.lastIndexOf('```');
    if (lastTick > firstTick) {
      cleaned = cleaned.slice(
        firstNewline > -1 && firstNewline < lastTick ? firstNewline + 1 : firstTick + 3,
        lastTick
      ).trim();
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err: unknown) {
    logger.warn('[AI Validator] Failed to parse AI JSON output. Creating fallback structured response.');
    parsed = {};
  }

  const rawObj = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as Record<string, unknown>;

  // Sanitize and coerce metrics safely
  const rawMetrics = rawObj.metrics;
  const sanitizedMetrics: Record<string, number> = {};
  if (typeof rawMetrics === 'object' && rawMetrics !== null) {
    for (const [k, v] of Object.entries(rawMetrics as Record<string, unknown>)) {
      const num = Number(v);
      if (!isNaN(num)) {
        sanitizedMetrics[k] = num;
      }
    }
  }
  const finalMetrics = Object.keys(sanitizedMetrics).length > 0 ? sanitizedMetrics : metadata.metrics || {};

  // Merge provided input metadata to guarantee zero missing critical values
  const mergedPayload = {
    model_name: String(rawObj.model_name || metadata.model_name),
    version: String(rawObj.version || metadata.version),
    dataset: String(rawObj.dataset || metadata.dataset),
    experiment_info: String(rawObj.experiment_info || `Experiment for ${metadata.model_name} version ${metadata.version}`),
    input_shape: String(rawObj.input_shape || metadata.input_shape || 'Not specified'),
    data_types: Array.isArray(rawObj.data_types) ? rawObj.data_types.slice(0, 50).map(String) : metadata.data_types || [],
    distribution_summary: String(rawObj.distribution_summary || 'Distribution data not provided'),
    metrics: finalMetrics,
    intended_use: String(rawObj.intended_use || metadata.intended_use),
    warnings: Array.isArray(rawObj.warnings) ? rawObj.warnings.slice(0, 50).map(String) : [],
    limitations: Array.isArray(rawObj.limitations)
      ? rawObj.limitations.slice(0, 50).map(String)
      : metadata.limitations || ['No limitations provided'],
    risks: Array.isArray(rawObj.risks)
      ? rawObj.risks.slice(0, 50).map(String)
      : metadata.risks || ['No risk analysis provided'],
    tests: Array.isArray(rawObj.tests)
      ? rawObj.tests.slice(0, 50).map(String)
      : metadata.tests || ['No tests specified'],
    reproducibility: String(rawObj.reproducibility || metadata.reproducibility || 'Standard pipeline execution'),
    readiness_score: 0, // Will be computed deterministically by readiness_score tool
    ai_analysis: String(rawObj.ai_analysis || 'AI evaluation complete.'),
    detected_issues: Array.isArray(rawObj.detected_issues) ? rawObj.detected_issues.slice(0, 50).map(String) : [],
    error_reasons: Array.isArray(rawObj.error_reasons) ? rawObj.error_reasons.slice(0, 50).map(String) : [],
    suggested_fixes: Array.isArray(rawObj.suggested_fixes) ? rawObj.suggested_fixes.slice(0, 50).map(String) : [],
    next_steps: Array.isArray(rawObj.next_steps) ? rawObj.next_steps.slice(0, 50).map(String) : [],
    references: Array.isArray(rawObj.references) ? rawObj.references.slice(0, 50).map(String) : [],
    evidence: Array.isArray(rawObj.evidence) ? rawObj.evidence.slice(0, 50).map(String) : [],
    decision: 'pending_human_review',
  };

  // Safe parse against ModelCardOutputSchema
  const validated = ModelCardOutputSchema.parse(mergedPayload);
  return validated;
}

