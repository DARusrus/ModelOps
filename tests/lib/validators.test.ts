import { describe, it, expect } from 'vitest';
import { parseAndValidateAIResponse } from '../../src/lib/ai/validators';
import { ExperimentMetadata } from '../../src/types';

const baseMetadata: ExperimentMetadata = {
  model_name: 'TestModel',
  version: '1.0.0',
  dataset: 'TestDataset',
  metrics: { accuracy: 0.95, f1: 0.92 },
  intended_use: 'Unit testing AI validation',
};

describe('parseAndValidateAIResponse', () => {
  it('should parse valid JSON and return a complete ModelCardOutput', () => {
    const validJson = JSON.stringify({
      model_name: 'TestModel',
      version: '1.0.0',
      dataset: 'TestDataset',
      overview: 'Test experiment',
      metrics: { accuracy: 0.95, f1: 0.92 },
      warnings: ['Test warning'],
      limitations: ['Test limitation'],
      detected_issues: [],
      suggested_fixes: [],
      next_steps: ['Deploy'],
      references: ['ref1'],
      evidence: ['evidence1'],
    });

    const result = parseAndValidateAIResponse(validJson, baseMetadata);

    expect(result.model_name).toBe('TestModel');
    expect(result.version).toBe('1.0.0');
    expect(result.metrics.accuracy).toBe(0.95);
    expect(result.overview).toBe('Test experiment');
  });

  it('should handle malformed JSON by falling back to metadata values', () => {
    const malformedJson = '{ this is not valid json !!!';

    const result = parseAndValidateAIResponse(malformedJson, baseMetadata);

    expect(result.model_name).toBe('TestModel');
    expect(result.dataset).toBe('TestDataset');
    expect(result.metrics.accuracy).toBe(0.95);
    expect(result.overview).toBe('No overview provided.');
  });

  it('should extract JSON from markdown code fences', () => {
    const markdownWrapped = '```json\n{"model_name": "Wrapped", "version": "2.0"}\n```';

    const result = parseAndValidateAIResponse(markdownWrapped, baseMetadata);

    expect(result.model_name).toBe('Wrapped');
    expect(result.version).toBe('2.0');
  });

  it('should sanitize non-numeric metric values', () => {
    const jsonWithBadMetrics = JSON.stringify({
      metrics: { accuracy: 0.9, loss: 'not_a_number', precision: '0.88' },
    });

    const result = parseAndValidateAIResponse(jsonWithBadMetrics, baseMetadata);

    expect(result.metrics.accuracy).toBe(0.9);
    expect(result.metrics.precision).toBe(0.88); // Coerced from string
    expect(result.metrics.loss).toBeUndefined(); // Non-numeric stripped
  });

  it('should fill missing fields from metadata', () => {
    const partialJson = JSON.stringify({
      overview: 'Custom analysis text',
    });

    const result = parseAndValidateAIResponse(partialJson, baseMetadata);

    // Falls back to metadata values for core fields
    expect(result.model_name).toBe('TestModel');
    expect(result.dataset).toBe('TestDataset');
    // Keeps the AI-provided field
    expect(result.overview).toBe('Custom analysis text');
  });

  it('should handle empty string input', () => {
    const result = parseAndValidateAIResponse('', baseMetadata);

    expect(result.model_name).toBe('TestModel');
    expect(result.dataset).toBe('TestDataset');
  });

  it('should handle AI response with extra conversational text around JSON', () => {
    const withPreamble = 'Sure! Here is the model card:\n```json\n{"model_name": "PreambleModel"}\n```\nLet me know if you need changes.';

    const result = parseAndValidateAIResponse(withPreamble, baseMetadata);

    expect(result.model_name).toBe('PreambleModel');
  });
});
