import { sourceRegister } from './source-register';

/**
 * Checks whether a single reference (URL or internal file path) exists
 * in the approved source register. Used to catch AI-generated "references"
 * that were never actually approved.
 *
 * Owner: Zein ElDin Mohamed Farouk
 */
export function isReferenceApproved(reference: string): boolean {
  const normalized = reference.trim().toLowerCase();
  return sourceRegister.some((entry) => entry.url.trim().toLowerCase() === normalized);
}

/**
 * Splits a list of references (e.g. from an AI-generated model card)
 * into approved and unapproved groups.
 */
export function checkReferences(references: string[]): {
  approved: string[];
  unapproved: string[];
} {
  const approved: string[] = [];
  const unapproved: string[] = [];
  for (const ref of references) {
    if (isReferenceApproved(ref)) {
      approved.push(ref);
    } else {
      unapproved.push(ref);
    }
  }
  return { approved, unapproved };
}
