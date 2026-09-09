export type ReviewMode = 'self_attestation' | 'independent_review';

/** A positive approval must be independent only when the organization elects it. */
export function mayApproveCard(reviewMode: ReviewMode, cardCreatorId: string, actorId: string): boolean {
  return reviewMode !== 'independent_review' || cardCreatorId !== actorId;
}
