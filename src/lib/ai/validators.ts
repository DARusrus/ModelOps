import { ModelCardOutputSchema, type ModelCardOutput } from '@/domain/modelops/model-card';
import { ExperimentMetadata } from '@/types';
import { logger } from '../logger';
import { PROMPT_TEMPLATE_VERSION } from './prompts';

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
  const suggestionItems = [
    ['analysis', rawObj.ai_analysis],
    ...((Array.isArray(rawObj.warnings) ? rawObj.warnings : []).map((text) => ['warning', text])),
    ...((Array.isArray(rawObj.detected_issues) ? rawObj.detected_issues : []).map((text) => ['detected_issue', text])),
    ...((Array.isArray(rawObj.suggested_fixes) ? rawObj.suggested_fixes : []).map((text) => ['suggested_fix', text])),
    ...((Array.isArray(rawObj.next_steps) ? rawObj.next_steps : []).map((text) => ['next_step', text])),
  ].flatMap(([field, text]) => typeof text === 'string' && text.trim() ? [{ field, text: text.trim().slice(0, 2000), provenance: 'ai_suggestion' as const }] : []);

  // Identity, measurements, evidence, score, and decision always remain server-validated input.
  // The model can contribute only explicitly non-authoritative suggestion fields below.
  const mergedPayload = {
    model_name: metadata.model_name,
    version: metadata.version,
    dataset: metadata.dataset,
    experiment_info: `Evaluation record for ${metadata.model_name} ${metadata.version}.`,
    input_shape: metadata.input_shape || 'Not specified',
    data_types: metadata.data_types || [],
    distribution_summary: metadata.eval_preprocessing || 'Not supplied.',
    metrics: metadata.metrics || {},
    intended_use: metadata.intended_use,
    warnings: Array.isArray(rawObj.warnings) ? rawObj.warnings.slice(0, 50).map(String) : [],
    limitations: metadata.limitations || [],
    risks: metadata.risks || [],
    tests: metadata.tests || [],
    reproducibility: metadata.reproducibility || 'Not supplied.',
    readiness_score: 0, // Will be computed deterministically by readiness_score tool
    ai_analysis: String(rawObj.ai_analysis || 'AI evaluation complete.'),
    detected_issues: Array.isArray(rawObj.detected_issues) ? rawObj.detected_issues.slice(0, 50).map(String) : [],
    error_reasons: Array.isArray(rawObj.error_reasons) ? rawObj.error_reasons.slice(0, 50).map(String) : [],
    suggested_fixes: Array.isArray(rawObj.suggested_fixes) ? rawObj.suggested_fixes.slice(0, 50).map(String) : [],
    next_steps: Array.isArray(rawObj.next_steps) ? rawObj.next_steps.slice(0, 50).map(String) : [],
    references: [],
    evidence: [],
    decision: 'pending_human_review',
    ai_suggestions: { status: 'ai_suggestion_available', prompt_template_version: PROMPT_TEMPLATE_VERSION, items: suggestionItems },
  };

  // Safe parse against ModelCardOutputSchema
  const validated = ModelCardOutputSchema.parse(mergedPayload);
  return validated;
}
