import { describe, it, expect } from 'vitest';
import { isReferenceApproved, checkReferences } from '../../src/lib/corpus/reference-checker';

describe('isReferenceApproved', () => {
  it('approves a URL that is in the source register', () => {
    expect(isReferenceApproved('https://mlflow.org/docs/latest/ml/model-registry/')).toBe(true);
  });

  it('rejects a URL that is not in the source register', () => {
    expect(isReferenceApproved('https://totally-made-up-source.example.com/paper')).toBe(false);
  });
  it('approves an internal doc path that is in the source register', () => {
    expect(isReferenceApproved('docs/model-card-template.md')).toBe(true);
  });
});

describe('checkReferences', () => {
  it('splits a mixed list into approved and unapproved references', () => {
    const result = checkReferences([
      'https://mlflow.org/docs/latest/ml/model-registry/',
      'https://fake-source.example.com',
    ]);
    expect(result.approved).toHaveLength(1);
    expect(result.unapproved).toHaveLength(1);
    expect(result.unapproved[0]).toBe('https://fake-source.example.com');
  });
});
