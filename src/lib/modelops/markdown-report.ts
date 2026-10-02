import type { ModelCardOutput } from '@/types/modelops';

/** A readable summary, not a replacement for the authenticated JSON review ledger. */
export function generateMarkdownReport(card: ModelCardOutput, generatedAt = new Date().toISOString()) {
  const executed = (card.evidence_items || []).filter((item) => item.kind === 'test_run' && item.provenance !== 'ai_suggestion' && item.provenance !== 'missing');
  const lines = (items: string[]) => items.length ? items.map((item) => `- ${item}`).join('\n') : 'Not supplied.';
  return `# ModelOps Governance Report: ${card.model_name} (${card.version})
Generated: ${generatedAt}
Dataset: ${card.dataset}
Readiness score: ${card.readiness_score}/100
Rubric: ${card.rubric_version || 'legacy'}
Workflow state: ${card.workflow_state || 'Not loaded; consult the saved JSON dossier.'}
Generated decision: ${card.decision} (not a deployment approval)

This Markdown is a summary. Download the authenticated JSON dossier for persisted workflow, review history and integrity data. A score does not certify model safety.

## Intended use
${card.intended_use}

## Metrics reported by the submitter
${lines(Object.entries(card.metrics || {}).map(([key, value]) => `${key}: ${value}`))}

## Limitations
${lines(card.limitations || [])}

## Risks
${lines(card.risks || [])}

## Declared tests (execution/result not established by name alone)
${lines(card.tests || [])}

## Structured test records (submitted evidence, not independently verified)
${lines(executed.map((item) => `${item.label}: ${item.attributes?.test_result || 'Not supplied.'}; executed ${item.attributes?.executed_at || 'Not supplied.'}; reference ${item.reference || 'Not supplied.'}`))}

## Reproducibility
${card.reproducibility || 'Not supplied.'}

## Guidance sources
${lines(card.references || [])}

## Optional guidance (not experiment evidence or approval)
AI status: ${card.ai_suggestions?.status || 'deterministic_only'}
${lines(card.suggested_fixes || [])}

## Evidence references
${lines((card.evidence_items || []).map((item) => `${item.label}: ${item.provenance || 'submitted'}; reference ${item.reference || 'Not supplied.'}`))}
`;
}
