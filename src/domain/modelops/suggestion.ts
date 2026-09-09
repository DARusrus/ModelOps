import { z } from 'zod';

export const SuggestionFieldSchema = z.enum(['analysis', 'warning', 'detected_issue', 'suggested_fix', 'next_step']);
export const SuggestionItemSchema = z.object({ field: SuggestionFieldSchema, text: z.string().trim().min(1).max(2000), provenance: z.literal('ai_suggestion') }).strict();
export const SuggestionSetSchema = z.object({ status: z.enum(['deterministic_only', 'provider_unavailable', 'ai_suggestion_available']), prompt_template_version: z.string().trim().min(1).max(50), items: z.array(SuggestionItemSchema).max(100) }).strict();
export type SuggestionSet = z.infer<typeof SuggestionSetSchema>;
