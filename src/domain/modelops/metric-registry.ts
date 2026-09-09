export type MetricDirection = 'higher_is_better' | 'lower_is_better' | 'unknown';

/**
 * A deliberately small, explicit registry. Unknown metrics are displayed but
 * never labelled an improvement because their direction has not been defined.
 */
const LOWER_IS_BETTER = new Set([
  'loss', 'error', 'error_rate', 'latency', 'latency_ms', 'response_time',
  'response_time_ms', 'inference_time', 'inference_time_ms', 'rmse', 'mae',
  'mse', 'wer', 'cer', 'false_positive_rate', 'false_negative_rate',
]);

export function metricDirection(metricName: string): MetricDirection {
  const normalized = metricName.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (LOWER_IS_BETTER.has(normalized) || normalized.endsWith('_loss') || normalized.endsWith('_error')) {
    return 'lower_is_better';
  }
  if (/^(accuracy|precision|recall|f1|auc|auroc|ap|mrr|ndcg|throughput)/.test(normalized)) {
    return 'higher_is_better';
  }
  return 'unknown';
}
