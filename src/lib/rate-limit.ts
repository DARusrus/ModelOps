/**
 * A lightweight, in-memory rate limiter to prevent API abuse.
 * Implements a true Token Bucket algorithm.
 */

type TokenBucket = {
  tokens: number;
  lastRefill: number;
};

const rateLimitMap = new Map<string, TokenBucket>();

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

export function isRateLimited(
  identifier: string,
  options: RateLimitOptions = { windowMs: 60000, maxRequests: 20 }
): boolean {
  const now = Date.now();
  let bucket = rateLimitMap.get(identifier);

  if (!bucket) {
    bucket = { tokens: options.maxRequests, lastRefill: now };
    rateLimitMap.set(identifier, bucket);
  }

  // Replenish tokens at a constant rate over the window
  const timePassed = Math.max(0, now - bucket.lastRefill);
  const refillRate = options.maxRequests / options.windowMs; // Tokens per millisecond
  const tokensToAdd = timePassed * refillRate;

  bucket.tokens = Math.min(options.maxRequests, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;

  // Check limit and consume a token if possible
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return false; // Allowed
  }

  return true; // Rate limited
}
