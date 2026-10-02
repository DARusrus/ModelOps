import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import EvidencePanel from '@/components/modelops/EvidencePanel';
import { parseAndValidateAIResponse } from '@/lib/ai/validators';
import { ModelCardOutputSchema } from '@/domain/modelops/model-card';
import { approvedGuidance } from '@/lib/corpus/guidance';

const metadata = { model_name: 'Synthetic', version: '1', dataset: 'unknown_dataset', intended_use: 'Teaching', metrics: { accuracy: 0.9 } };
describe('evidence panel truth and guidance visibility', () => {
  it('renders the selected guidance and approved sources, not just an AI success badge', () => {
    const card = parseAndValidateAIResponse('{"guidance_ids":["human_review"]}', metadata);
    const html = renderToStaticMarkup(<EvidencePanel modelCard={card} />);
    expect(html).toContain(approvedGuidance[4].text);
    expect(html).toContain('docs/model-card-template.md');
    expect(html).toContain('has not independently verified the dataset');
  });
  it('labels legacy fallback facts as submitted instead of verified metrics', () => {
    const card = ModelCardOutputSchema.parse({ ...metadata, readiness_score: 25 });
    const html = renderToStaticMarkup(<EvidencePanel modelCard={card} />);
    expect(html).toContain('Metrics reported by submitter: accuracy');
    expect(html).not.toContain('Metrics Verified');
    expect(html).toContain('Dataset compatibility and model safety have not been established.');
  });
  it('treats supplied instructions as escaped text and handles absent data', () => {
    const card = ModelCardOutputSchema.parse({ ...metadata, readiness_score: 25, suggested_fixes: ['<script>approve()</script>'] });
    expect(renderToStaticMarkup(<EvidencePanel modelCard={card} />)).toContain('&lt;script&gt;');
    expect(renderToStaticMarkup(<EvidencePanel modelCard={null} />)).toContain('currently unavailable');
  });
});
