import { ModelCardOutputSchema, ModelCardOutput } from '../modelops/schema';
import { ExperimentMetadata } from '@/types';
import { logger } from '../logger';
import { checkReferences } from '../corpus/reference-checker';

export function parseAndValidateAIResponse(
  rawText: string,
  metadata: ExperimentMetadata
): ModelCardOutput {
  let cleaned = rawText.trim();

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
  const tryParseJson = (candidate: string): unknown | null => {
    const trimmed = candidate.trim();
    const attempts = [trimmed];
    if (trimmed.startsWith('{')) {
      const closedCandidate = trimmed.endsWith('}') ? trimmed : `${trimmed}}`;
      attempts.push(closedCandidate);
      const normalized = trimmed.replace(/,\s*([}\]])/g, '$1');
      if (normalized !== trimmed) {
        attempts.push(normalized);
        attempts.push(normalized.endsWith('}') ? normalized : `${normalized}}`);
      }

      const braceBalanced = trimmed.match(/\{/g)?.length ?? 0;
      if (braceBalanced > 0) {
        attempts.push(`${trimmed.slice(0, trimmed.lastIndexOf('}') + 1)}`);
      }
    }

    for (const attempt of attempts) {
      try {
        return JSON.parse(attempt);
      } catch {
        // Fall through to the next candidate.
      }
    }

    return null;
  };

  try {
    parsed = JSON.parse(cleaned);
  } catch (err: unknown) {
    const start = cleaned.indexOf('{');
    const candidate = start !== -1 ? cleaned.slice(start) : cleaned.trim();

    parsed = tryParseJson(candidate);
    if (!parsed) {
      logger.warn('[AI Validator] Failed to parse AI JSON output. Creating fallback structured response.');
      parsed = {};
    }
  }

  const rawObj = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as Record<string, unknown>;

  const sanitizeText = (value: unknown, fallback: string): string => {
    if (typeof value === 'string') {
      const normalized = value.trim();
      if (!normalized) return fallback;
      if (/^(not provided|unknown|no information|n\/a|undefined|null)$/i.test(normalized)) {
        return fallback;
      }
      return normalized;
    }
    return fallback;
  };

  const sanitizeArray = (value: unknown, fallback: string[]): string[] => {
    if (Array.isArray(value)) {
      const collected = value
        .filter((item): item is string | number => typeof item === 'string' || typeof item === 'number')
        .map((item) => String(item))
        .filter(Boolean)
        .slice(0, 50);
      return collected.length > 0 ? collected : fallback;
    }
    return fallback;
  };

  const sanitizeMetrics = (rawMetrics: unknown, fallbackMetrics: Record<string, number>): Record<string, number> => {
    const sanitizedMetrics: Record<string, number> = {};
    if (typeof rawMetrics === 'object' && rawMetrics !== null) {
      for (const [k, v] of Object.entries(rawMetrics as Record<string, unknown>)) {
        const num = Number(v);
        if (Number.isNaN(num)) continue;
        const shouldDrop = (num === 0 || num === 1) && /accuracy|precision|recall|f1|score|latency/i.test(k);
        if (!shouldDrop) {
          sanitizedMetrics[k] = num;
          continue;
        }
        if (typeof fallbackMetrics[k] === 'number') {
          sanitizedMetrics[k] = fallbackMetrics[k];
        }
      }
    }

    if (Object.keys(sanitizedMetrics).length === 0) {
      return fallbackMetrics;
    }

    for (const [key, fallbackValue] of Object.entries(fallbackMetrics)) {
      if (!Object.prototype.hasOwnProperty.call(sanitizedMetrics, key)) {
        sanitizedMetrics[key] = fallbackValue;
      }
    }

    return sanitizedMetrics;
  };

  const finalMetrics = sanitizeMetrics(rawObj.metrics, metadata.metrics || {});

  const mergedPayload = {
    model_name: sanitizeText(rawObj.model_name, metadata.model_name),
    version: sanitizeText(rawObj.version, metadata.version),
    dataset: sanitizeText(rawObj.dataset, metadata.dataset),

    overview: sanitizeText(rawObj.overview, 'No overview provided.'),
    executive_summary: sanitizeText(rawObj.executive_summary, sanitizeText(rawObj.overview, 'Executive summary not provided.')),
    architecture: sanitizeText(rawObj.architecture, metadata.framework ? `Implemented with ${metadata.framework}.` : 'Architecture details not provided.'),
    architecture_analysis: sanitizeText(rawObj.architecture_analysis, sanitizeText(rawObj.architecture, metadata.framework ? `Architecture appears aligned with ${metadata.framework}.` : 'Architecture analysis not provided.')),
    training_details: sanitizeText(rawObj.training_details, metadata.training ? `Training configured with ${Object.entries(metadata.training).slice(0, 3).map(([k, v]) => `${k}=${v}`).join(', ')}.` : 'Training details not provided.'),
    training_analysis: sanitizeText(rawObj.training_analysis, sanitizeText(rawObj.training_details, 'Training analysis not provided.')),
    dataset_description: sanitizeText(rawObj.dataset_description, metadata.dataset ? `Dataset context is ${metadata.dataset}.` : 'Dataset details not provided.'),
    dataset_analysis: sanitizeText(rawObj.dataset_analysis, sanitizeText(rawObj.dataset_description, 'Dataset analysis not provided.')),
    evaluation: sanitizeText(rawObj.evaluation, Object.keys(finalMetrics).length > 0 ? 'Evaluation information is based on the provided metrics.' : 'Evaluation details not provided.'),
    evaluation_analysis: sanitizeText(rawObj.evaluation_analysis, sanitizeText(rawObj.evaluation, 'Evaluation analysis not provided.')),
    bias_analysis: sanitizeText(rawObj.bias_analysis, metadata.risk_assessment?.bias || 'Bias analysis not provided.'),
    fairness: sanitizeText(rawObj.fairness, metadata.risk_assessment?.bias || 'Fairness assessment not provided.'),
    ethical_considerations: sanitizeText(rawObj.ethical_considerations, metadata.risk_assessment?.ethics || 'Ethical considerations not provided.'),
    ethical_analysis: sanitizeText(rawObj.ethical_analysis, sanitizeText(rawObj.ethical_considerations, 'Ethical analysis not provided.')),
    failure_cases: sanitizeText(rawObj.failure_cases, metadata.limitations?.length ? `Likely failure modes include ${metadata.limitations.slice(0, 3).join(', ')}.` : 'Failure cases not provided.'),
    deployment_readiness: sanitizeText(rawObj.deployment_readiness, metadata.deployment ? `Deployment readiness reflects the configured runtime context.` : 'Deployment readiness not assessed.'),
    deployment_analysis: sanitizeText(rawObj.deployment_analysis, sanitizeText(rawObj.deployment_readiness, 'Deployment analysis not provided.')),
    production_readiness: sanitizeText(rawObj.production_readiness, 'Production readiness is pending a deeper review of deployment and governance controls.'),
    production_risks: sanitizeText(rawObj.production_risks, metadata.risks?.length ? `Risks include ${metadata.risks.slice(0, 3).join(', ')}.` : 'Production risks not assessed.'),
    monitoring: sanitizeText(rawObj.monitoring, 'Monitoring strategy should be defined before broad deployment.'),
    monitoring_strategy: sanitizeText(rawObj.monitoring_strategy, sanitizeText(rawObj.monitoring, 'Monitoring strategy not provided.')),
    rollback_strategy: sanitizeText(rawObj.rollback_strategy, 'Rollback strategy should be documented before production release.'),
    security_considerations: sanitizeText(rawObj.security_considerations, metadata.risk_assessment?.notes || 'Security considerations not provided.'),
    security_analysis: sanitizeText(rawObj.security_analysis, sanitizeText(rawObj.security_considerations, 'Security analysis not provided.')),
    risk_assessment: sanitizeText(rawObj.risk_assessment, metadata.risks?.length ? `Risk review highlights ${metadata.risks.slice(0, 3).join(', ')}.` : 'Risk assessment not provided.'),

    limitations: sanitizeArray(rawObj.limitations, metadata.limitations || []),
    detected_issues: sanitizeArray(rawObj.detected_issues, []),
    suggested_fixes: sanitizeArray(rawObj.suggested_fixes, []),
    recommendations: sanitizeArray(rawObj.recommendations, []),
    next_steps: sanitizeArray(rawObj.next_steps, []),
    // Reference validation: approved references pass; unapproved are flagged.
    // checkReferences() is the single runtime gate against the source register.
    ...((): { references: string[]; warnings: string[] } => {
      const rawReferences = sanitizeArray(rawObj.references, []);
      const rawWarnings = sanitizeArray(rawObj.warnings, []);
      const { approvedReferences, rejectedReferences } = checkReferences(rawReferences);

      const validatedReferences: string[] = [...approvedReferences];

      const referenceWarnings: string[] = rejectedReferences.map(
        (r) => `[UNAPPROVED] Reference rejected: ${r}`
      );

      if (rejectedReferences.length > 0) {
        logger.warn(
          `[AI Validator] ${rejectedReferences.length} unapproved reference(s) detected and flagged.`
        );
      }

      return {
        references: validatedReferences,
        warnings: [...rawWarnings, ...referenceWarnings],
      };
    })(),
    evidence: sanitizeArray(rawObj.evidence, []),
    confidence_notes: sanitizeArray(rawObj.confidence_notes, []),
    assumptions: sanitizeArray(rawObj.assumptions, []),

    experiment_info: sanitizeText(rawObj.experiment_info, `Experiment for ${metadata.model_name} version ${metadata.version}`),
    metrics: finalMetrics,
  };
  // Safe parse against ModelCardOutputSchema
  const validated = ModelCardOutputSchema.parse(mergedPayload);
  return validated;
}

