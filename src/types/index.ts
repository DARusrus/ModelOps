export interface ExperimentMetadata {
  model_name: string;
  version: string;
  dataset: string;
  metrics: Record<string, number>;
  intended_use: string;
  framework?: string;
  task_type?: string;
  input_shape?: string;
  data_types?: string[];
  hyperparameters?: Record<string, unknown>;
  limitations?: string[];
  risks?: string[];
  tests?: string[];
  reproducibility?: string;
  // 9-section extended metadata
  model_type?: string;
  architecture?: string;
  developed_by?: string;
  release_date?: string;
  license?: string;
  primary_uses?: string;
  out_of_scope_uses?: string;
  target_users?: string;
  factors?: string;
  environment?: string;
  decision_thresholds?: string;
  variation_approaches?: string;
  eval_preprocessing?: string;
  data_split?: string;
  training_dataset?: string;
  data_volume?: string;
  disaggregated_results?: string;
  subgroup_benchmarks?: string;
  uses_sensitive_data?: boolean;
  impacts_human_life?: boolean;
  risks_and_harms?: string;
  mitigations?: string;
  recommendations?: string;
}

export interface AIProviderResponse {
  raw_text: string;
  provider: 'groq' | 'gemini' | 'offline';
  latency_ms: number;
}

export interface AIProviderError {
  provider: 'groq' | 'gemini';
  message: string;
  status_code?: number;
  is_timeout?: boolean;
}

export interface ReadinessScoreResult {
  score: number;
  justification: {
    criteria: string;
    points: number;
    max_points: number;
    passed: boolean;
    reason: string;
  }[];
  breakdown: Record<string, number>;
}

export interface MetricDiff {
  metric_name: string;
  run1_value: number;
  run2_value: number;
  delta: number;
  direction: 'improved' | 'degraded' | 'unchanged';
}

export interface CompareRunsOutput {
  model_name_1: string;
  version_1: string;
  model_name_2: string;
  version_2: string;
  metrics_diff: MetricDiff[];
  readiness_score_1: number;
  readiness_score_2: number;
  readiness_delta: number;
  summary: string[];
}

export interface ToolRuleViolation {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
  rule_id?: string;
}
