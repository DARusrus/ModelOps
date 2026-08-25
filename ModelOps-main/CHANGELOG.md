# Changelog

All notable changes to the ModelOps project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-07-30

### Added
- **Model Readiness & Evaluation Portal (`/modelops`)**: Main frontend workflow allowing workflow engineers to submit model experiment parameters and evaluate readiness.
- **7-State UI Orchestration Machine**: Deterministic state handling covering `idle`, `loading`, `success`, `empty`, `validation-error`, `provider-error`, and `retry`.
- **Structured Result View (`ResultView`)**: Visual rendering of model identity, benchmarked performance metrics, intended use context, limitations, operational risks, automated verification test suite results, and reproducibility signature.
- **Deterministic Readiness Score Gauge (`ReadinessScore`)**: Color-coded 0–100 progress gauge with prominent **Human Governance Review Recommendation** callout (`REQUIRES_HUMAN_REVIEW`).
- **Tool Evidence Engine (`EvidencePanel`)**: Visually distinct indigo/violet terminal container isolating raw tool execution logs, dataset telemetry, test traces, and sha256 provenance signatures from LLM narrative.
- **Side-by-Side Run Comparison (`RunComparison`)**: Side-by-side model diff tool comparing candidate vs. baseline runs with directional metric delta badges (`IMPROVED`, `DEGRADED`, `UNCHANGED`).
- **Compliance Artifact Exporter (`ExportReport`)**: Export suite supporting PDF printing (`window.print()`), Markdown compliance report downloads (`.md`), and JSON audit schema downloads (`.json`).
- **React Error Boundary (`ErrorBoundary`)**: Production-grade client error boundary preventing raw stack trace exposure and providing friendly recovery paths.
- **Skeleton Loading Suite (`Skeletons`)**: Accessible pulse skeletons for form, result cards, score gauges, evidence panels, and comparison diffs.
- **Dynamic Code Splitting**: Performance optimization via `next/dynamic` lazy loading for heavy components (`RunComparison`, `ExportReport`, `EvidencePanel`).

### Changed
- **Server API Route (`/api/modelops`)**: Integrated server-side API route with backend service `processModelOpsRequest` and dev simulation header overrides (`x-simulate-error`, `x-simulate-empty`).
- **Environment Variable Parsing (`src/lib/env.ts`)**: Added build-safe fallbacks for missing environment secrets to ensure static page collection compiles cleanly.

### Fixed
- Fixed build-time Zod validation failure when building without local environment secrets.
- Fixed PowerShell script execution policy blocks by utilizing direct node execution wrappers.
- Fixed unhandled form retry states by retaining previous input state (`lastInput`) for seamless resubmission.

### Improved
- **WCAG 2.1 AA Accessibility**: Added explicit labels, field-level `aria-describedby` links, `:focus-visible` focus rings, and ARIA live regions across all interactive elements.
- **Responsive Layout**: Full mobile-first reflow verified across 375px mobile, 768px tablet, and 1280px+ desktop viewports.
