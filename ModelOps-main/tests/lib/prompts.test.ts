import { describe, it, expect } from 'vitest';
import { buildModelCardPrompt } from '../../src/lib/ai/prompts';
import { ExperimentMetadata } from '../../src/types';

describe('buildModelCardPrompt', () => {
  const fullMetadata: ExperimentMetadata = {
    model_name: 'SentimentBERT',
    version: '2.1.0',
    dataset: 'IMDB-Reviews-50k',
    metrics: { accuracy: 0.93, f1_score: 0.91 },
    intended_use: 'Sentiment classification of product reviews',
    framework: 'PyTorch',
    task_type: 'Text Classification',
    input_shape: '(batch, 512)',
    data_types: ['text', 'labels'],
    hyperparameters: { learning_rate: 0.001, epochs: 10 },
    limitations: ['English only', 'Max 512 tokens'],
    risks: ['Bias in training data'],
    tests: ['Unit tests', 'Integration tests'],
    reproducibility: 'MLflow run abc-123',
  };

  it('should include all core metadata fields in the prompt', () => {
    const prompt = buildModelCardPrompt(fullMetadata);

    expect(prompt).toContain('SentimentBERT');
    expect(prompt).toContain('2.1.0');
    expect(prompt).toContain('IMDB-Reviews-50k');
    expect(prompt).toContain('Sentiment classification of product reviews');
  });

  it('should include framework and task type', () => {
    const prompt = buildModelCardPrompt(fullMetadata);

    expect(prompt).toContain('PyTorch');
    expect(prompt).toContain('Text Classification');
  });

  it('should include metrics in the prompt', () => {
    const prompt = buildModelCardPrompt(fullMetadata);

    expect(prompt).toContain('accuracy');
    expect(prompt).toContain('0.93');
    expect(prompt).toContain('f1_score');
  });

  it('should include hyperparameters in the prompt', () => {
    const prompt = buildModelCardPrompt(fullMetadata);

    expect(prompt).toContain('learning_rate');
    expect(prompt).toContain('0.001');
  });

  it('should include anti-hallucination instructions', () => {
    const prompt = buildModelCardPrompt(fullMetadata);

    expect(prompt).toContain('DO NOT fabricate');
    expect(prompt).toContain('valid JSON only');
  });

  it('should include limitations and risks', () => {
    const prompt = buildModelCardPrompt(fullMetadata);

    expect(prompt).toContain('English only');
    expect(prompt).toContain('Bias in training data');
  });

  it('should handle missing optional fields gracefully', () => {
    const minimalMetadata: ExperimentMetadata = {
      model_name: 'MinimalModel',
      version: '1.0',
      dataset: 'SmallData',
      metrics: {},
      intended_use: 'Testing',
    };

    const prompt = buildModelCardPrompt(minimalMetadata);

    expect(prompt).toContain('MinimalModel');
    expect(prompt).toContain('Not specified'); // Default for missing fields
    expect(prompt).toContain('None specified'); // Default for hyperparameters
  });

  it('should request JSON output format', () => {
    const prompt = buildModelCardPrompt(fullMetadata);

    expect(prompt).toContain('REQUIRED JSON OUTPUT FORMAT');
    expect(prompt).toContain('model_name');
    expect(prompt).toContain('ai_analysis');
    expect(prompt).toContain('evidence');
  });
});
