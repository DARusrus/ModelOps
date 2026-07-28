import { describe, it, expect } from 'vitest';
import { validateInput, CompareRequestSchema } from '../../src/lib/modelops/validators';

describe('ModelOps Validators', () => {
  describe('validateInput (ExperimentMetadataSchema)', () => {
    it('should pass with valid minimal input', () => {
      const validData = {
        model_name: 'TestModel',
        version: '1.0.1',
        dataset: 'TestDataset',
        intended_use: 'Testing the validator',
      };
      
      const result = validateInput(validData);
      expect(result.model_name).toBe('TestModel');
      expect(result.version).toBe('1.0.1');
      expect(result.metrics).toEqual({});
    });

    it('should map legacy "model" field to "model_name"', () => {
      const legacyData = {
        model: 'LegacyModel',
        dataset: 'TestDataset',
        intended_use: 'Testing legacy support',
      };
      
      const result = validateInput(legacyData);
      expect(result.model_name).toBe('LegacyModel');
    });

    it('should throw ZodError if required fields are missing', () => {
      const invalidData = {
        version: '1.0.0',
        // missing model_name, dataset, intended_use
      };
      
      expect(() => validateInput(invalidData)).toThrowError(/required/i);
    });

    it('should trim string values', () => {
      const dataWithSpaces = {
        model_name: '  SpacedModel  ',
        dataset: '  SpacedDataset  ',
        intended_use: '  Spaced Use  ',
      };
      
      const result = validateInput(dataWithSpaces);
      expect(result.model_name).toBe('SpacedModel');
      expect(result.dataset).toBe('SpacedDataset');
      expect(result.intended_use).toBe('Spaced Use');
    });

    it('should coerce string values in metrics to numbers', () => {
      const data = {
        model_name: 'Model',
        dataset: 'Dataset',
        intended_use: 'Use',
        metrics: {
          accuracy: "0.95",
          f1: "0.88"
        }
      };

      const result = validateInput(data);
      expect(result.metrics.accuracy).toBe(0.95);
      expect(result.metrics.f1).toBe(0.88);
    });
  });

  describe('CompareRequestSchema', () => {
    it('should validate a correct compare request', () => {
      const payload = {
        run1: {
          model_name: 'ModelA',
          metrics: { accuracy: 0.9 },
        },
        run2: {
          model_name: 'ModelA',
          metrics: { accuracy: 0.95 },
        }
      };

      const parsed = CompareRequestSchema.parse(payload);
      expect(parsed.run1.model_name).toBe('ModelA');
      expect(parsed.run2.metrics.accuracy).toBe(0.95);
    });

    it('should throw if run1 or run2 is missing', () => {
      const invalidPayload = {
        run1: { model_name: 'ModelA' }
      };

      expect(() => CompareRequestSchema.parse(invalidPayload)).toThrowError(/Required/);
    });
  });
});
