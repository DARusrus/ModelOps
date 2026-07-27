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
}

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

/** Standard API error response shape used by createErrorResponse() */
export interface APIErrorResponse {
  success: false;
  error: string;
  details?: { path: string; message: string }[];
}
