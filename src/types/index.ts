export interface TrainingMetadata {
  epochs?: number;
  optimizer?: string;
  learning_rate?: number;
  batch_size?: number;
}

export interface HardwareMetadata {
  gpu?: string;
  cpu?: string;
  ram?: string;
}

export interface DeploymentMetadata {
  platform?: string;
  latency?: string;
  memory?: string;
  environment?: string;
}

export interface RiskAssessmentMetadata {
  ethics?: string;
  bias?: string;
  limitations?: string;
  notes?: string;
}

export interface ExperimentMetadata {
  model_name: string;
  version: string;
  dataset: string;
  metrics: Record<string, number>;
  intended_use: string;
  framework?: string;
  task_type?: string;
  input_shape?: string;
  license?: string;
  data_types?: string[];
  hyperparameters?: Record<string, unknown>;
  limitations?: string[];
  risks?: string[];
  tests?: string[];
  warnings?: string[];
  reproducibility?: string;

  // New nested metadata sections
  training?: TrainingMetadata;
  hardware?: HardwareMetadata;
  deployment?: DeploymentMetadata;
  risk_assessment?: RiskAssessmentMetadata;
}

export type ModelCardOutput = import('../lib/modelops/schema').ModelCardOutput;

export interface AIProviderResponse {
  raw_text: string;
  provider: 'groq' | 'gemini';
  latency_ms: number;
}

export interface AIProviderError {
  provider: 'groq' | 'gemini';
  message: string;
  status_code?: number;
  is_timeout?: boolean;
}

export interface ReadinessScoreResult {
  score: number; // 0-100
  decision: 'APPROVED' | 'REVIEW' | 'REJECTED';
  justification: {
    criteria: string;
    points: number;
    max_points: number;
    passed: boolean;
    reason: string;
  }[];
  breakdown: Record<string, number>;
  reasons: string[];
}

export interface RiskClassificationResult {
  level: 'Low' | 'Medium' | 'High' | 'Critical';
  explanation: string;
  reasons: string[];
}

export interface ReadinessResult extends ReadinessScoreResult {}

export interface RiskResult extends RiskClassificationResult {}

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

export interface ModelOpsEvaluationResponse {
  success: true;
  data: ModelCardOutput;
  readiness: ReadinessResult;
  risk: RiskResult;
  provider?: string;
  processing_time?: string;
  request_id?: string;
  timestamp?: string;
  recommendations?: string[];
  metadata?: {
    model_name: string;
    version: string;
    dataset: string;
  };
  warning?: string;
}

/** Standard API error response shape used by createErrorResponse() */
export interface APIErrorResponse {
  success: false;
  error: string;
  details?: { path: string; message: string }[];
}
