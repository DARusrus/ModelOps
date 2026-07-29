/**
 * Domain-specific Error classes for the ModelOps backend.
 */

export class ModelOpsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends ModelOpsError {
  public details?: { path: string; message: string }[];
  
  constructor(message: string, details?: { path: string; message: string }[]) {
    super(message);
    this.details = details;
  }
}

export class AIProviderErrorClass extends ModelOpsError {
  public provider: 'groq' | 'gemini' | 'fallback';
  public status_code?: number;
  public is_timeout?: boolean;
  
  constructor(provider: 'groq' | 'gemini' | 'fallback', message: string, status_code?: number, is_timeout?: boolean) {
    super(message);
    this.provider = provider;
    this.status_code = status_code;
    this.is_timeout = is_timeout;
  }
}

export class RateLimitError extends ModelOpsError {
  constructor(message: string = 'Too Many Requests') {
    super(message);
  }
}
