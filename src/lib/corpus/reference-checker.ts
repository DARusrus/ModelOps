/**
 * reference-checker.ts
 *
 * Validates AI-generated references against the approved source register.
 * The source register (src/lib/corpus/source-register.ts) is the single
 * authority for approved sources. Any reference the AI generates that does not
 * match a registered URL or source name is treated as UNAPPROVED.
 *
 * Design constraints:
 * - Never throws on malformed input.
 * - Handles undefined, null, empty arrays, non-string items safely.
 * - Deterministic: same input always produces same output.
 * - Does not silently approve unknown references.
 */

import { sourceRegister } from './source-register';

/**
 * Build a normalised set of approved tokens from the source register.
 * Both the `url` and the `source` name are treated as valid approval tokens
 * so that AI outputs that cite a source by name or by URL are both handled.
 */
function buildApprovedSet(): Set<string> {
  const approved = new Set<string>();
  for (const entry of sourceRegister) {
    if (entry.url && typeof entry.url === 'string' && entry.url.trim()) {
      approved.add(entry.url.trim().toLowerCase());
    }
    if (entry.source && typeof entry.source === 'string' && entry.source.trim()) {
      approved.add(entry.source.trim().toLowerCase());
    }
  }
  return approved;
}

/**
 * Normalise a reference string for comparison.
 * Trimming and lowercasing avoids false rejections due to whitespace or casing.
 */
function normalise(ref: string): string {
  return ref.trim().toLowerCase();
}

/**
 * Returns true if the given reference string matches an approved source
 * in the source register (by URL or by source name, case-insensitive).
 *
 * @param reference - a single reference string from AI output
 */
export function isReferenceApproved(reference: string): boolean {
  if (typeof reference !== 'string' || !reference.trim()) return false;
  const approved = buildApprovedSet();
  const norm = normalise(reference);
  // Exact match first
  if (approved.has(norm)) return true;
  // Prefix match: handle cases where the AI appended a path to an approved base URL
  for (const token of approved) {
    if (norm.startsWith(token) || token.startsWith(norm)) return true;
  }
  return false;
}

/**
 * Validates an array of AI-generated references against the source register.
 *
 * Safely handles:
 * - undefined / null input → treated as empty
 * - non-array input → treated as empty
 * - non-string array items → silently skipped
 * - empty strings → silently skipped
 *
 * Returns two lists:
 * - approvedReferences: references that matched the source register
 * - rejectedReferences: references that did NOT match (unapproved/hallucinated)
 *
 * @param references - the raw value of the `references` field from AI output
 */
export function checkReferences(references: unknown): {
  approvedReferences: string[];
  rejectedReferences: string[];
} {
  const approvedReferences: string[] = [];
  const rejectedReferences: string[] = [];

  if (!Array.isArray(references)) {
    return { approvedReferences, rejectedReferences };
  }

  for (const item of references) {
    if (typeof item !== 'string' || !item.trim()) {
      // Non-string or empty — skip silently (no side effects)
      continue;
    }
    if (isReferenceApproved(item)) {
      approvedReferences.push(item.trim());
    } else {
      rejectedReferences.push(item.trim());
    }
  }

  return { approvedReferences, rejectedReferences };
}
