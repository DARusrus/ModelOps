import type { ModelCardOutput } from '@/types';

export interface AIAssistantSuggestion {
  fieldName: string;
  fieldKey: keyof ModelCardOutput;
  problem: string;
  reason: string;
  suggestion: string;
  impact: string;
  confidence: number;
}

export function buildAIAssistantSuggestions(card: Partial<ModelCardOutput>): AIAssistantSuggestion[] {
  const suggestions: AIAssistantSuggestion[] = [];

  if (!card.executive_summary || String(card.executive_summary).trim().length < 20) {
    suggestions.push({
      fieldName: 'Executive Summary',
      fieldKey: 'executive_summary',
      problem: 'Missing or weak executive summary.',
      reason: 'The model card cannot explain the model’s purpose and readiness context clearly.',
      suggestion: 'Write a concise executive summary that explains the model purpose, intended use, and key governance status.',
      impact: 'Improves clarity and stakeholder confidence.',
      confidence: 0.95,
    });
  }

  if (!card.dataset_description || String(card.dataset_description).trim().length < 20) {
    suggestions.push({
      fieldName: 'Dataset Description',
      fieldKey: 'dataset_description',
      problem: 'Missing dataset description.',
      reason: 'The card does not explain what data was used or why it is relevant.',
      suggestion: 'Describe the dataset source, size, and representativeness in plain language.',
      impact: 'Improves transparency and trust.',
      confidence: 0.94,
    });
  }

  if (!card.architecture || String(card.architecture).trim().length < 20) {
    suggestions.push({
      fieldName: 'Architecture',
      fieldKey: 'architecture',
      problem: 'Architecture details are too thin.',
      reason: 'The architecture section should explain the modeling approach in a useful way.',
      suggestion: 'Add a short explanation of the model family, training approach, and deployment pattern.',
      impact: 'Strengthens technical understanding.',
      confidence: 0.9,
    });
  }

  if ((card.detected_issues?.length ?? 0) > 0 || (card.suggested_fixes?.length ?? 0) > 0) {
    suggestions.push({
      fieldName: 'Recommended Actions',
      fieldKey: 'suggested_fixes',
      problem: 'Action items are not yet consolidated.',
      reason: 'The current card does not present clear follow-up tasks for reviewers.',
      suggestion: 'Summarize the detected issues and recommended fixes into a concise list of next steps.',
      impact: 'Makes review and remediation easier.',
      confidence: 0.88,
    });
  }

  return suggestions;
}

export function applySuggestionToField(card: ModelCardOutput, suggestion: AIAssistantSuggestion): ModelCardOutput {
  if (suggestion.fieldKey === 'suggested_fixes') {
    return {
      ...card,
      suggested_fixes: [suggestion.suggestion],
    } as ModelCardOutput;
  }

  return {
    ...card,
    [suggestion.fieldKey]: suggestion.suggestion,
  } as ModelCardOutput;
}

export function applyAllSuggestions(card: ModelCardOutput, suggestions: AIAssistantSuggestion[]): ModelCardOutput {
  return suggestions.reduce((acc, suggestion) => applySuggestionToField(acc, suggestion), card);
}
