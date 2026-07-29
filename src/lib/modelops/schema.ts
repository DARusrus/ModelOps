import { z } from 'zod';

export const ModelCardOutputSchema = z.object({
  model_name: z.string().min(1),
  version: z.string().min(1),
  dataset: z.string().min(1),
  intended_use: z.string().default('Intended use not provided.'),
  input_shape: z.string().default('Not specified'),
  data_types: z.array(z.string()).default([]),
  reproducibility: z.string().default('Not specified'),
  risks: z.array(z.string()).default([]),
  tests: z.array(z.string()).default([]),
  distribution_summary: z.string().default('No distribution summary provided.'),

  // AI Generated Sections
  overview: z.string().default('No overview provided.'),
  executive_summary: z.string().default('Executive summary not provided.'),
  architecture: z.string().default('Architecture details not provided.'),
  architecture_analysis: z.string().default('Architecture analysis not provided.'),
  training_details: z.string().default('Training details not provided.'),
  training_analysis: z.string().default('Training analysis not provided.'),
  dataset_description: z.string().default('Dataset details not provided.'),
  dataset_analysis: z.string().default('Dataset analysis not provided.'),
  evaluation: z.string().default('Evaluation details not provided.'),
  evaluation_analysis: z.string().default('Evaluation analysis not provided.'),
  bias_analysis: z.string().default('Bias analysis not provided.'),
  fairness: z.string().default('Fairness assessment not provided.'),
  ethical_considerations: z.string().default('Ethical considerations not provided.'),
  ethical_analysis: z.string().default('Ethical analysis not provided.'),
  limitations: z.array(z.string()).default([]),
  failure_cases: z.string().default('Failure cases not provided.'),
  deployment_readiness: z.string().default('Deployment readiness not assessed.'),
  deployment_analysis: z.string().default('Deployment analysis not provided.'),
  production_readiness: z.string().default('Production readiness not assessed.'),
  production_risks: z.string().default('Production risks not assessed.'),
  monitoring: z.string().default('Monitoring strategy not provided.'),
  monitoring_strategy: z.string().default('Monitoring strategy not provided.'),
  rollback_strategy: z.string().default('Rollback strategy not provided.'),
  security_considerations: z.string().default('Security considerations not provided.'),
  security_analysis: z.string().default('Security analysis not provided.'),
  risk_assessment: z.string().default('Risk assessment not provided.'),

  // Array outputs
  detected_issues: z.array(z.string()).default([]),
  suggested_fixes: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  next_steps: z.array(z.string()).default([]),
  references: z.array(z.string()).default([]),
  evidence: z.array(z.string()).default([]),
  confidence_notes: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),

  // Legacy / fallback fields mapped in provider
  experiment_info: z.string().default('No experiment details recorded'),
  metrics: z.record(z.string(), z.coerce.number()).default({}),
  warnings: z.array(z.string()).default([]),
});

export type ModelCardOutput = z.infer<typeof ModelCardOutputSchema>;


