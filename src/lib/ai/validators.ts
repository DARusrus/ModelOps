import { ModelCardOutputSchema } from '@/domain/modelops/model-card';
import type { EvidenceItem } from '@/domain/modelops/evidence';
import type { ExperimentMetadata } from '@/types';
import { buildEvidenceCard } from '@/lib/modelops/card';
import { resolveGuidance } from '@/lib/corpus/guidance';
import { PROMPT_TEMPLATE_VERSION } from './prompts';

/** The provider selects reviewed guidance; arbitrary provider prose is never a card fact. */
export function parseAndValidateAIResponse(rawText: string, metadata: ExperimentMetadata, evidence: readonly EvidenceItem[] = metadata.evidence_items || []) {
  const guidance = resolveGuidance(JSON.parse(rawText), evidence);
  return ModelCardOutputSchema.parse({
    ...buildEvidenceCard(metadata),
    ai_analysis: 'The AI selected source-backed guidance below. It did not verify experiment facts or approve deployment.',
    suggested_fixes: guidance.map((entry) => entry.text),
    references: Array.from(new Set(guidance.map((entry) => entry.source))),
    ai_suggestions: {
      status: 'ai_suggestion_available', prompt_template_version: PROMPT_TEMPLATE_VERSION,
      items: guidance.map((entry) => ({ field: 'suggested_fix', text: entry.text, provenance: 'ai_suggestion' })),
    },
  });
}
