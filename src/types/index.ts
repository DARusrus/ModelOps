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
  data_classification?: 'unclassified' | 'public' | 'internal' | 'confidential' | 'restricted';
  uses_sensitive_data?: boolean;
  impacts_human_life?: boolean;
  risks_and_harms?: string;
  mitigations?: string;
  recommendations?: string;
  evidence_items?: import('@/domain/modelops/evidence').EvidenceItem[];
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

export type MetricDiff = import('@/domain/modelops/api-contracts').MetricDiff;
export type CompareRunsOutput = import('@/domain/modelops/api-contracts').CompareRunsOutput;

export interface ToolRuleViolation {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
  rule_id?: string;
}
