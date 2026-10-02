import { EvaluationCatalogQuerySchema, type EvaluationCatalogQuery } from '@/domain/modelops/api-contracts';

const queryKeys = [
  'q',
  'state',
  'creator',
  'created_from',
  'created_to',
  'readiness_min',
  'readiness_max',
  'sort',
  'limit',
  'cursor',
] as const;

/** Parse only the documented catalog parameters; unexpected input is rejected. */
export function parseEvaluationCatalogQuery(searchParams: URLSearchParams): EvaluationCatalogQuery {
  const unknownKeys = Array.from(new Set(Array.from(searchParams.keys()))).filter(
    (key) => !queryKeys.includes(key as (typeof queryKeys)[number]),
  );
  if (unknownKeys.length > 0) throw new Error('INVALID_CATALOG_QUERY');

  const input: Record<string, string> = {};
  for (const key of queryKeys) {
    const values = searchParams.getAll(key);
    if (values.length > 1) throw new Error('INVALID_CATALOG_QUERY');
    if (values[0]?.trim()) input[key] = values[0];
  }
  return EvaluationCatalogQuerySchema.parse(input);
}

/** Search is schema-limited to characters that cannot alter PostgREST filter grammar. */
export function evaluationSearchFilter(search: string): string {
  const normalized = search.trim().replace(/\s+/g, ' ');
  return `model_name.ilike.*${normalized}*,model_version.ilike.*${normalized}*`;
}

export function inclusiveEndDate(date: string): string {
  const nextDay = new Date(`${date}T00:00:00.000Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return nextDay.toISOString();
}
