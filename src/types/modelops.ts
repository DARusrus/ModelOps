/**
 * ModelOps Core Types & Contract
 * Scope: Mohamed Said Mohamed Barakat
 */

export interface ModelCardOutput {
  model_name: string;
  version: string;
  dataset: string;
  metrics: Record<string, number>;
  intended_use: string;
  limitations: string[];
  risks: string[];
  tests: string[];
  reproducibility: string;
  readiness_score: number;   // 0-100, deterministic — render as score/bar
  decision: string;          // human-reviewed label — show clearly, never buried
  // Optional extended governance evidence fields
  warnings?: string[];
  ai_analysis?: string;
  detected_issues?: string[];
  suggested_fixes?: string[];
  next_steps?: string[];
  evidence?: string[];
}

export type UIState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'empty'
  | 'validation-error'
  | 'provider-error'
  | 'retry';

export interface ModelOpsInput {
  model_name: string;
  version: string;
  dataset: string;
  metrics: Record<string, number>;
  intended_use: string;
  framework?: string;
  task_type?: string;
}

export interface MetricKeyValuePair {
  id: string;
  key: string;
  value: string;
}

export interface FormValidationErrors {
  model_name?: string;
  version?: string;
  dataset?: string;
  metrics?: string;
  intended_use?: string;
  // Generic, field-less error — e.g. the backend returned a single message
  // that isn't tied to one specific input (rate limiting, malformed JSON
  // body, etc). Rendered as a banner above the submit button instead of
  // being silently dropped.
  _form?: string;
}
