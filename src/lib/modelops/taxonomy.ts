/**
 * Domain Taxonomy for ModelOps
 * Owner: Zein ElDin Mohamed Farouk
 *
 * This documents the REAL scoring rubric as implemented in
 * src/lib/modelops/tools.ts (readiness_score_detail). If tools.ts
 * changes, this file must be updated to match — it exists so anyone
 * can understand the scoring system without reading the code.
 */

// --- Scoring categories and their maximum points ---
export const SCORING_CATEGORIES = [
  {
    key: 'identification',
    label: 'Model Identification',
    max_points: 10,
    checks: ['model_name is non-empty (+5)', 'version is non-empty (+5)'],
  },
  {
    key: 'dataset',
    label: 'Dataset & Input Schema',
    max_points: 15,
    checks: [
      'dataset is non-empty (+7)',
      'input_shape is set and not "Not specified" (+4)',
      'data_types is a non-empty list (+4)',
    ],
  },
  {
    key: 'metrics',
    label: 'Evaluation Metrics',
    max_points: 25,
    checks: [
      '0 metrics = 0 pts',
      '1 metric = 10 pts',
      '2 metrics = 18 pts',
      '3+ metrics = 25 pts',
    ],
  },
  {
    key: 'governance',
    label: 'Governance, Risks & Limitations',
    max_points: 25,
    checks: [
      'limitations non-empty (+10)',
      'risks non-empty (+10)',
      'warnings non-empty (+5)',
    ],
  },
  {
    key: 'testing',
    label: 'Testing & Reproducibility',
    max_points: 25,
    checks: [
      'tests non-empty (+15)',
      'reproducibility present and not a generic placeholder like "Standard execution pipeline" (+10)',
    ],
  },
] as const;

// --- Required fields for a fully documented model card ---
// (matches ModelCardOutputSchema in schema.ts)
export const REQUIRED_FIELDS = [
  'model_name', 'version', 'dataset', 'input_shape', 'data_types',
  'metrics', 'intended_use', 'warnings', 'limitations', 'risks',
  'tests', 'reproducibility',
] as const;

// --- Score bands used to translate a number into a decision ---
export const READINESS_BANDS = [
  { min: 90, label: 'Ready for release' },
  { min: 70, label: 'Ready with reservations — human review required' },
  { min: 50, label: 'Not ready — major gaps present' },
  { min: 0, label: 'Not ready — critical information missing' },
];

// --- Risk severity levels (defined for future use — see tool-rules.ts note) ---
export type RiskSeverity = 'low' | 'medium' | 'high' | 'blocking';

export const RISK_SEVERITY_RULES: Record<RiskSeverity, string> = {
  low: 'Minor limitation, does not affect core use case.',
  medium: 'Notable limitation, should be disclosed to users.',
  high: 'Significant risk, requires mitigation plan before release.',
  blocking: 'Unacceptable risk — release must be rejected until resolved.',
};
