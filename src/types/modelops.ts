export class AIProviderErrorClass extends Error {
  provider: 'groq' | 'gemini' | 'offline';
  status_code?: number;
  is_timeout?: boolean;

  constructor(
    provider: 'groq' | 'gemini' | 'offline',
    message: string,
    status_code?: number,
    is_timeout?: boolean
  ) {
    super(message);
    this.name = 'AIProviderErrorClass';
    this.provider = provider;
    this.status_code = status_code;
    this.is_timeout = is_timeout;
    Object.setPrototypeOf(this, AIProviderErrorClass.prototype);
  }
}

export type UIState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'empty'
  | 'valid-error'
  | 'provider-error'
  | 'retry';

export type PreferredProvider = 'auto' | 'groq' | 'gemini' | 'offline';

export interface UserApiKeys {
  groqApiKey?: string;
  geminiApiKey?: string;
  preferredProvider?: PreferredProvider;
}

export interface MetricDefinition {
  name: string;
  value: number;
  unit?: string;
  description?: string;
  threshold?: number;
}

export interface ModelOpsInput {
  model_name: string;
  version: string;
  dataset: string;
  intended_use: string;
  metrics: Record<string, number>;
  framework?: string;
  task_type?: string;
  input_shape?: string;
  data_types?: string[];
  hyperparameters?: Record<string, unknown>;
  limitations?: string[] | string;
  risks?: string[] | string;
  tests?: string[] | string;
  warnings?: string[] | string;
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

export interface MetricDiff {
  metric_name: string;
  run1_value: number;
  run2_value: number;
  delta: number;
  direction: 'improved' | 'degraded' | 'unchanged';
}

export interface GovernanceAuditEntry {
  audit_id: string;
  model_name: string;
  version: string;
  readiness_score: number;
  policy_name: string;
  policy_status: 'POLICY_PASSED' | 'POLICY_BLOCKED';
  reviewer_name: string;
  reviewer_role: string;
  department: string;
  timestamp: string;
  notes: string;
  signature_hash: string;
}

export interface ModelCardOutput {
  model_name: string;
  version: string;
  dataset: string;
  metrics: Record<string, number>;
  intended_use: string;
  framework?: string;
  task_type?: string;
  input_shape?: string;
  data_types?: string[];
  limitations?: string[];
  risks?: string[];
  warnings?: string[];
  tests?: string[];
  reproducibility?: string;
  readiness_score: number;
  decision: 'pending_human_review';
  metadata?: {
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
    generated_at?: string;
    provider?: string;
  };
  audit_trail?: GovernanceAuditEntry[];
}

export interface AIProviderResponse {
  raw_text: string;
  provider: 'groq' | 'gemini' | 'offline';
  model_name?: string;
  latency_ms?: number;
}

// 1. Timeline Interface
export interface VersionHistoryPoint {
  version: string;
  release_date: string;
  readiness_score: number;
  metrics: Record<string, number>;
  primary_change?: string;
  status: 'improved' | 'regressed' | 'stable';
}

// 2. What Would It Take Interface
export interface SimulatedGapItem {
  id: string;
  category: 'identification' | 'dataset' | 'metrics' | 'governance' | 'testing';
  label: string;
  description: string;
  point_value: number;
  is_missing: boolean;
  field_key: keyof ModelOpsInput;
  suggested_value: any;
}

// 3. Governance Policy Interface
export interface ReadinessPolicy {
  id: string;
  name: string;
  domain: 'Healthcare' | 'Financial Fraud' | 'Generative AI' | 'Computer Vision' | 'General NLP' | 'Enterprise Standard';
  min_score: number;
  description: string;
  mandatory_rules: string[];
}
