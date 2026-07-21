import { z } from 'zod';

export const ExperimentMetadataSchema = z.object({
  model: z.string(),
  dataset: z.string(),
});

export function validateInput(data: unknown) {
  return ExperimentMetadataSchema.parse(data);
}
