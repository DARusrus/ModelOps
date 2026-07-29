# AI Usage & Architecture Notes

This project uses a pragmatic AI workflow: structured prompting for quality, provider failover for resilience, and deterministic fallback output for reliability.

## 1. Provider strategy

The AI layer is implemented in [src/lib/ai/providers.ts](src/lib/ai/providers.ts) and uses:

- Groq as the primary provider for fast generation.
- Gemini as the fallback provider when Groq fails or is unavailable.
- A deterministic offline fallback when both providers fail or keys are absent.

The provider selection is transparent to the caller and is returned in the `/api/modelops` response as `provider`.

## 2. Prompt engineering

The prompt builder in [src/lib/ai/prompts.ts](src/lib/ai/prompts.ts) asks the model to produce a structured model card grounded in the provided metadata. The instructions emphasize:

- Staying within the submitted evidence.
- Avoiding invented metrics or tests.
- Marking gaps as limitations or warnings when evidence is missing.
- Returning JSON rather than markdown prose.

## 3. Output validation and sanitization

Raw AI output is parsed and sanitized by [src/lib/ai/validators.ts](src/lib/ai/validators.ts). The validation path:

1. Removes code fences when present.
2. Attempts to recover malformed JSON safely.
3. Merges metadata into the response when critical fields are missing.
4. Validates the result against [src/lib/modelops/schema.ts](src/lib/modelops/schema.ts).
5. Preserves deterministic readiness and risk scoring from the backend rather than trusting the model.

## 4. Backend traceability

The service layer in [src/lib/modelops/service.ts](src/lib/modelops/service.ts) logs processing and provider usage, while the API route returns timing and request metadata in the response envelope.

