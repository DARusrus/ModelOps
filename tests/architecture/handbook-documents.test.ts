import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { approvedGuidance } from '@/lib/corpus/guidance';
import { sourceRegister } from '@/lib/corpus/source-register';
import { isReferenceApproved } from '@/lib/corpus/reference-checker';
import { currentExperiments } from '../fixtures/modelops/current-experiments';
import { ExperimentMetadataSchema } from '@/domain/modelops/api-contracts';

const documents = [
  'README.md', 'docs/architecture.md', 'docs/api-contracts.md', 'docs/readiness-checklist.md',
  'docs/model-card-template.md', 'docs/known-gaps-and-limitations.md', 'docs/source-register.md',
  'docs/release-checklist.md', 'docs/contribution-matrix.md', 'docs/DEMO_SCRIPT.md',
];
describe('handbook document and example boundaries', () => {
  it('keeps canonical local Markdown links and runtime version documentation accurate', () => {
    for (const document of documents) {
      const content = readFileSync(document, 'utf8');
      for (const match of Array.from(content.matchAll(/\]\(([^)]+)\)/g))) {
        const link = match[1];
        if (/^https?:/.test(link) || link.startsWith('#')) continue;
        expect(existsSync(path.resolve(path.dirname(document), link.split('#')[0])), document + ': ' + link).toBe(true);
      }
    }
    const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(readFileSync('README.md', 'utf8')).toContain('Next.js ' + manifest.dependencies.next);
  });
  it('keeps every internal registered source present and every selected guidance source approved', () => {
    for (const source of sourceRegister) {
      if (!source.url.startsWith('https://')) expect(existsSync(source.url), source.url).toBe(true);
    }
    for (const guidance of approvedGuidance) expect(isReferenceApproved(guidance.source), guidance.id).toBe(true);
  });
  it('provides exactly five distinct, schema-valid current synthetic experiment inputs', () => {
    expect(currentExperiments).toHaveLength(5);
    expect(new Set(currentExperiments.map((item) => item.model_name + ':' + item.version)).size).toBe(5);
    for (const input of currentExperiments) expect(ExperimentMetadataSchema.safeParse(input).success).toBe(true);
  });
});
