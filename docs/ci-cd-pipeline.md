# ModelOps — CI/CD Pipeline Explanation

This document explains the Continuous Integration (CI) and Continuous Deployment (CD) pipeline we built for the ModelOps project. It is designed to act as a strict security and quality gatekeeper before any code goes live.

---

## What is CI/CD?
- **CI (Continuous Integration):** Every time someone pushes code or opens a Pull Request, GitHub automatically runs a checklist of tests to make sure the new code doesn't break anything.
- **CD (Continuous Deployment):** If all the tests pass, Vercel automatically takes the code and deploys it live to the internet.

---

## The Rules We Integrated (The CI Gate)

Our pipeline is located in `.github/workflows/ci.yml`. When you push code to `main` or `dev`, GitHub runs these exact steps in order. If **any** step fails, the entire pipeline stops and the code is blocked from merging.

### Rule 1: Dependency Installation (`npm ci`)
- **What it does:** Installs all the exact packages required to run the project.
- **How it works:** It uses `package-lock.json` to ensure that GitHub Actions uses the exact same versions of software that we used on our local machines. This prevents the "it works on my machine" problem.

### Rule 2: Code Linting (`eslint src`)
- **What it does:** Scans the code for bad syntax, poor formatting, and messy code structures.
- **How it works:** It enforces our code quality standards. For example, if a developer leaves unused variables or bad imports in their code, the linter will spot it and fail the build.

### Rule 3: TypeScript Type-Checking (`tsc --noEmit`)
- **What it does:** Verifies that all the data types across the entire application match up perfectly.
- **How it works:** TypeScript prevents bugs by ensuring you don't accidentally pass a `string` when the app expects a `number`. This step checks the entire codebase without actually building the files, ensuring no hidden type errors sneak into production.

### Rule 4: Unit & Integration Testing (`npm test`)
- **What it does:** Runs all 72 automated tests in our system (using Vitest) to ensure the logic works.
- **How it works:** We configured the tests to run in an isolated environment. Even though the real app needs GROQ and Gemini API keys, the tests use mock data and our deterministic fallback functions. If someone breaks the readiness scoring formula, this step catches it instantly.

### Rule 5: Production Build Simulation (`npm run build`)
- **What it does:** Forces the Next.js framework to compile the entire application exactly as it would for a live server.
- **How it works:** This is the ultimate final check. If the code builds successfully here, we guarantee that it will build successfully on Vercel. It prevents the embarrassment of merging a Pull Request only to watch the live deployment crash.

---

## The Deployment (The CD Gate)

Once the GitHub Actions pipeline finishes with a green checkmark ✅, the CD side takes over.

### Vercel Integration
- **What it does:** Hosts the application and makes it available to the public.
- **How it works:** Vercel is connected directly to our `main` branch. The moment a Pull Request is merged into `main`, Vercel pulls the code, reads our secure environment variables (`GROQ_API_KEY`, `GEMINI_API_KEY`, etc.) that we hid in the dashboard, and deploys a brand new version of the site to `model-ops.vercel.app` within seconds. 

### Automated Vulnerability Blocking
- **What it does:** Vercel acts as a secondary security gate.
- **How it works:** As we saw earlier today, if Vercel detects that we are using an outdated version of Next.js that has a known security vulnerability, it will intentionally **block the deployment** and refuse to go live until we update our `package.json` to a safe version.
