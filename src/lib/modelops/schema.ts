import { z } from 'zod';

export const ModelCardOutputSchema = z.object({
  model_name: z.string(),
  version: z.string(),
  dataset: z.string(),
  metrics: z.record(z.any()),
  intended_use: z.string(),
  limitations: z.array(z.string()),
  risks: z.array(z.string()),
  tests: z.array(z.string()),
  reproducibility: z.string(),
  readiness_score: z.number(),
  decision: z.string(),
});

export type ModelCardOutput = z.infer<typeof ModelCardOutputSchema>;
