# ModelOps — ML Experiment, Model Card & Readiness Assistant

> A lightweight ML governance workspace for student ML teams, research labs, and small AI engineering teams.

---

## What It Does

ModelOps lets you submit ML experiment metadata and receive a structured, evidence-based model card — with no invention, no hallucination, and no auto-approval.

**Production workflow:**

```
User submits experiment metadata (model, dataset, metrics)
        ↓
Server validates input (Zod schema — before any AI is called)
        ↓
AI drafts a model card strictly from the submitted evidence
        ↓
readiness_score() evaluates documentation completeness (deterministic)
        ↓
compare_runs() produces side-by-side metric diffs (deterministic)
        ↓
Structured result is returned for human review
```

**Non-negotiable rule:** If evidence is missing, the gap is flagged. Nothing is ever invented.

---

## Team — Team 11

| Name | Role |
|------|------|
| **Ahmed Amir Rusrus** *(Lead)* | Integration Lead / Solution Architect |
| Moamen Elkholy | AI & Backend Engineer |
| Mohamed Said Mohamed Barakat | Product UI & Workflow Engineer |
| Zein ElDin Mohamed Farouk | Knowledge, Tools & Quality Engineer |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, TypeScript strict) |
| AI — Primary | Groq (`llama-3.3-70b-versatile`) |
| AI — Fallback | Google Gemini (`gemini-1.5-flash`) |
| Validation | Zod |
| Testing | Vitest |
| Deployment | Vercel |

---

## Local Setup

### Prerequisites

- Node.js 18+
- A Groq API key — [console.groq.com](https://console.groq.com)
- A Gemini API key — [ai.google.dev](https://ai.google.dev)

### Steps

```bash
# 1. Clone the repository
git clone <repo-url>
cd ModelOps-main

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Open .env.local and fill in your API keys

# 4. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Copy `.env.example` to `.env.local` and set the following:

| Variable | Description | Required |
|----------|-------------|----------|
| `GROQ_API_KEY` | Groq API key for primary AI generation | Yes |
| `GEMINI_API_KEY` | Google Gemini API key for fallback + structured output | Yes |
| `NEXT_PUBLIC_APP_URL` | Public base URL (use `http://localhost:3000` for local dev) | No |

> **Security:** `.env.local` is git-ignored. Never commit API keys. Both keys are server-side only — they never reach the client bundle.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run all tests with Vitest |

---

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the full system design including:

- Production data flow diagram
- Module ownership table (who owns what)
- Actual file structure
- API surface and contracts
- Security rules
- Provider strategy (Groq primary / Gemini fallback / deterministic offline)

---

## API Reference

See [`docs/api-contracts.md`](docs/api-contracts.md) for full request/response examples for both endpoints:

- `POST /api/modelops` — generate model card
- `POST /api/modelops/compare` — compare two experiment runs

---

## Running Tests

```bash
# All tests
npm test

# Watch mode during development
npx vitest
```

Tests live in `tests/` and cover:

- API route validation (valid input, invalid input, missing fields)
- `readiness_score()` scoring logic across all rubric categories
- `compare_runs()` metric diff and direction detection
- End-to-end workflow

---

## Known Limitations

See [`docs/known-gaps-and-limitations.md`](docs/known-gaps-and-limitations.md) for a full honest account. Key items:

- Metric direction detection is name-based (`loss`/`error` = lower is better; all others = higher is better)
- Missing metrics in one run default to 0, which can produce misleading "improved" labels — flagged in `tool-rules.ts`
- Test quality is not evaluated — only presence is checked in `readiness_score()`
- Source register currently covers MLflow documentation only

---

## Out of Scope

The following will not be built and must not be added:

- Model training inside the app
- Claiming fairness or safety without evidence
- Auto-approving deployment without explicit human review

---

## Deployment

The production build is deployed to Vercel. See [`docs/release-checklist.md`](docs/release-checklist.md) for the full production gate procedure.

Environment variables must be set in the Vercel dashboard under **Project → Settings → Environment Variables** — not in the repository.
