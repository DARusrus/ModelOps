import { describe, expect, it } from 'vitest';
import { parseAndValidateAIResponse } from '../../src/lib/ai/validators';
import { approvedGuidance, resolveGuidance } from '../../src/lib/corpus/guidance';
import { isReferenceApproved } from '../../src/lib/corpus/reference-checker';

const metadata = { model_name: 'Test', version: '1', dataset: 'D', intended_use: 'Tests', metrics: { accuracy: 0.9 }, risks: ['Submitted risk'], tests: ['Declared test'] };

describe('source-backed provider selection', () => {
  it('renders only exact approved text and sources while preserving submitted facts', () => {
    const result = parseAndValidateAIResponse('{"guidance_ids":["human_review","missing_metrics","human_review"]}', metadata);
    expect(result.metrics).toEqual(metadata.metrics);
    expect(result.risks).toEqual(metadata.risks);
    expect(result.tests).toEqual(metadata.tests);
    expect(result.decision).toBe('pending_human_review');
    expect(result.readiness_score).toBe(0);
    expect(result.ai_suggestions.status).toBe('ai_suggestion_available');
    expect(result.suggested_fixes).toHaveLength(2);
    expect(result.suggested_fixes.every((text) => approvedGuidance.some((entry) => entry.text === text))).toBe(true);
    expect(result.references.every(isReferenceApproved)).toBe(true);
  });

  it.each(['', 'not JSON', '{}', '[]', 'null', '"prose"', '{"guidance_ids":[]}', '{"guidance_ids":["invented_source"]}', '{"guidance_ids":[123]}', '{"guidance_ids":["human_review"],"decision":"approved"}'])('rejects invalid provider selection %s rather than labelling it available', (raw) => {
    expect(() => parseAndValidateAIResponse(raw, metadata)).toThrow();
  });

  it('rejects guidance that contradicts the supplied evidence', () => {
    expect(() => resolveGuidance({ guidance_ids: ['missing_metrics'] }, [{ kind: 'metric', label: 'accuracy', value: '0.9', provenance: 'submitted', reference: 'run-1', attributes: { unit: 'ratio', evaluation_reference: 'run-1' } }])).toThrow('UNSUPPORTED_GUIDANCE');
  });

  it('does not substitute a model type, data split or volume for unknown facts', () => {
    const result = parseAndValidateAIResponse('{"guidance_ids":["human_review"]}', { ...metadata, model_type: 'NLP', data_split: '80/20', data_volume: '100 rows' });
    expect(result.input_shape).toBe('Not supplied.');
    expect(result.data_types).toEqual([]);
    expect(result.distribution_summary).toBe('Not supplied.');
    expect(result.metadata).toMatchObject({ model_type: 'NLP', data_split: '80/20', data_volume: '100 rows' });
    expect(result.evidence).toContain('Developed by: Not supplied.');
    expect(result.framework).toBeUndefined();
  });
});
