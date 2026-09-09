import { describe, it, expect } from 'vitest';
import { validateInput } from '../../src/lib/modelops/validators';
import { isPublicNonSensitiveEvaluation, processModelOpsRequest } from '../../src/lib/modelops/service';

describe('ModelOps Evaluation Service & Pipeline', () => {
  it('should validate valid metadata input correctly', () => {
    const rawInput = {
      model_name: 'BERT-Sentiment',
      version: '1.0.0',
      dataset: 'IMDB Reviews',
      intended_use: 'Classifying sentiment in user reviews',
      metrics: { f1: 0.91 },
    };

    const validated = validateInput(rawInput);
    expect(validated.model_name).toBe('BERT-Sentiment');
    expect(validated.version).toBe('1.0.0');
    expect(validated.dataset).toBe('IMDB Reviews');
    expect(validated.data_classification).toBe('unclassified');
  });

  it('should support legacy shorthand "model" attribute', () => {
    const rawInput = {
      model: 'Legacy-ResNet',
      dataset: 'CIFAR-10',
      intended_use: 'Image classification',
    };

    const validated = validateInput(rawInput);
    expect(validated.model_name).toBe('Legacy-ResNet');
  });

  it('should process model evaluation and produce a compliant Model Card', async () => {
    const metadata = {
      model_name: 'LLM-Evaluator',
      version: '2.1.0',
      dataset: 'Governance-Corpus',
      intended_use: 'Automated compliance checking',
      metrics: { precision: 0.94, recall: 0.89 },
      tests: ['Regression test suite', 'Security vulnerability scan'],
    };

    const result = await processModelOpsRequest(metadata);

    expect(result.model_name).toBe('LLM-Evaluator');
    expect(result.version).toBe('2.1.0');
    expect(result.readiness_score).toBeGreaterThan(0);
    expect(result.decision).toBe('pending_human_review');
    expect(result.experiment_info).toBeDefined();
  });

  it('should evaluate identical requests without retaining request data in a process cache', async () => {
    const metadata = {
      model_name: 'Repeat-Test-Model',
      version: '1.0.0',
      dataset: 'Repeat-Dataset',
      intended_use: 'Testing repeat evaluation',
      metrics: { accuracy: 0.99 },
    };

    const firstResult = await processModelOpsRequest(metadata);
    const secondResult = await processModelOpsRequest(metadata);

    expect(secondResult).toEqual(firstResult);
    expect(secondResult).not.toBe(firstResult);
  });

  it('permits external AI only for an explicit public, non-sensitive declaration', () => {
    expect(isPublicNonSensitiveEvaluation({ data_classification: 'public', uses_sensitive_data: false })).toBe(true);
    expect(isPublicNonSensitiveEvaluation({ data_classification: 'public', uses_sensitive_data: true })).toBe(false);
    expect(isPublicNonSensitiveEvaluation({ data_classification: 'internal', uses_sensitive_data: false })).toBe(false);
    expect(isPublicNonSensitiveEvaluation({ data_classification: 'unclassified', uses_sensitive_data: false })).toBe(false);
  });
});
