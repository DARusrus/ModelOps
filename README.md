# ModelOps

ModelOps is a production-ready Next.js application for evaluating machine learning experiment metadata, generating structured model card drafts, and producing governance-oriented readiness and risk assessments.

## What the app does

- Accepts experiment metadata through the web UI or API.
- Validates incoming payloads with Zod before any AI work begins.
- Uses Groq as the primary AI provider and Gemini as a fallback provider.
- Falls back to a deterministic metadata-driven model card when providers are unavailable.
- Computes readiness and risk outputs to support human review.

## Local setup

1. Copy `.env.example` to `.env.local` and add your provider keys.
2. Install dependencies with `npm install`.
3. Start the app with `npm run dev`.
4. Open `http://localhost:3000/modelops`.

## Environment variables

The application expects the following server-side variables:

- `GROQ_API_KEY`
- `GEMINI_API_KEY`

## Verification

Use the following commands for normal checks:

- `npm run lint`
- `npm run build`
- `npm test`

## Documentation

- [docs/architecture.md](docs/architecture.md)
- [docs/api-contracts.md](docs/api-contracts.md)
- [docs/ai-usage.md](docs/ai-usage.md)
- [docs/release-checklist.md](docs/release-checklist.md)
