import { ExperimentMetadata } from '@/types';

export function buildModelCardPrompt(metadata: ExperimentMetadata): string {
  const metricsString = metadata.metrics && Object.keys(metadata.metrics).length > 0
    ? JSON.stringify(metadata.metrics, null, 2)
    : 'No quantitative metrics provided';

  const hyperparametersString = metadata.hyperparameters && Object.keys(metadata.hyperparameters).length > 0
    ? JSON.stringify(metadata.hyperparameters, null, 2)
    : 'None specified';

  return `You are an expert AI Model Card & Governance Assistant.
Generate a comprehensive, accurate Model Card JSON strictly grounded in the provided experiment metadata.

MANDATORY RULES:
1. DO NOT fabricate or invent metrics, evaluation numbers, dataset stats, or tests.
2. If any information is missing from the input, state that clearly in limitations/warnings rather than making assumptions.
3. Output MUST be valid JSON only. Do NOT include markdown wrappers, markdown code blocks (such as \`\`\`json), or conversational preamble/postscript.
4. Fill all JSON fields thoroughly based solely on the input data.

INPUT EXPERIMENT METADATA:
<model_name>${JSON.stringify(metadata.model_name)}</model_name>
<version>${JSON.stringify(metadata.version)}</version>
<dataset>${JSON.stringify(metadata.dataset)}</dataset>
<intended_use>${JSON.stringify(metadata.intended_use)}</intended_use>
<framework>${JSON.stringify(metadata.framework || 'Not specified')}</framework>
<task_type>${JSON.stringify(metadata.task_type || 'Not specified')}</task_type>
<input_shape>${JSON.stringify(metadata.input_shape || 'Not specified')}</input_shape>
<data_types>${JSON.stringify(metadata.data_types || [])}</data_types>
<reproducibility_notes>${JSON.stringify(metadata.reproducibility || 'Standard pipeline execution')}</reproducibility_notes>
<known_limitations>${JSON.stringify(metadata.limitations || [])}</known_limitations>
<identified_risks>${JSON.stringify(metadata.risks || [])}</identified_risks>
<tests_executed>${JSON.stringify(metadata.tests || [])}</tests_executed>
<metrics>
${metricsString}
</metrics>
<hyperparameters>
${hyperparametersString}
</hyperparameters>

REQUIRED JSON OUTPUT FORMAT (JSON OBJECT ONLY):
{
  "model_name": ${JSON.stringify(metadata.model_name)},
  "version": ${JSON.stringify(metadata.version)},
  "dataset": ${JSON.stringify(metadata.dataset)},
  "experiment_info": "Detailed synthesis of the experiment metadata, task type, framework, and parameters.",
  "input_shape": ${JSON.stringify(metadata.input_shape || 'Not specified')},
  "data_types": ${JSON.stringify(metadata.data_types || [])},
  "distribution_summary": "Analysis of data distribution or note if missing.",
  "metrics": ${JSON.stringify(metadata.metrics || {})},
  "intended_use": ${JSON.stringify(metadata.intended_use)},
  "warnings": ["List of warnings regarding model usage, data gaps, or evaluation concerns"],
  "limitations": ["List of explicitly documented or inferred operational limitations"],
  "risks": ["List of risks associated with deployment or usage"],
  "tests": ["List of unit, integration, or compliance tests performed"],
  "reproducibility": ${JSON.stringify(metadata.reproducibility || 'Standard execution pipeline')},
  "ai_analysis": "In-depth AI analysis of the experiment results, trade-offs, and governance posture.",
  "detected_issues": ["List of detected governance or technical issues"],
  "error_reasons": ["List of reasons for any governance failures or data missing"],
  "suggested_fixes": ["Actionable remediation steps"],
  "next_steps": ["Recommended next steps before deployment"],
  "references": ["Relevant document, repository, or dataset references"],
  "evidence": ["Evidence claims extracted strictly from the experiment metadata"]
}`;
}
