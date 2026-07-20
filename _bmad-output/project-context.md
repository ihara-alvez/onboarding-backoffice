---
project_name: 'onboarding-backoffice'
user_name: 'Ihara'
date: '2026-07-17'
sections_completed: ['technology_stack', 'language_specific', 'framework_specific', 'testing', 'code_quality', 'workflow', 'critical_rules']
status: 'complete'
rule_count: 32
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Backend**: Node.js, TypeScript 5.5, Express 4.19 — compiled CommonJS via `tsc`, dev via `tsx watch`
- **Frontend**: React 19.2, Vite 8.1, TypeScript ~6.0, Tailwind CSS v4 (CSS-first `@theme`, no `tailwind.config.js`), react-router-dom v7
- **Linting**: `oxlint` (frontend only, not ESLint)
- **No test framework configured** — do not assume Jest/Vitest conventions exist
- Frontend `tsconfig` requires `import type` for type-only imports (`verbatimModuleSyntax: true`) and disallows TS-only runtime syntax like enums (`erasableSyntaxOnly: true`)

## Critical Implementation Rules

### Language-Specific Rules

- Both tsconfigs use `strict: true` — always type params/returns explicitly, no implicit `any`
- Backend: ES `import`/`export` syntax compiled to CommonJS (`esModuleInterop`) — standard default imports work
- Route handlers must not throw uncaught — catch risky sync/async work explicitly and return `{ error: string }` JSON with an appropriate status code
- Fallible async operations (e.g. subprocess calls) use a discriminated-union result (`{ ok: true, ... } | { ok: false, error }`) instead of throwing — callers check `.ok`, not try/catch
- Comments are sparse, explain *why* not *what* — don't add explanatory comments for self-evident code

### Framework-Specific Rules

**React:**

- Function components + hooks only; no class components, no global state library — state is local per-page via `useState`/`useEffect`
- Prop interfaces named `<Component>Props`, defaults via destructuring (not `defaultProps`)
- Styling is Tailwind utility classes only, referencing MD3 tokens defined in `index.css` `@theme` (e.g. `bg-primary`, `text-body-medium`) — never hardcode colors or use inline `style={}`
- For long-running actions with live feedback, swap the page's rendered view based on a `submitting`/loading boolean rather than navigating to a separate route

**Express:**

- One `Router()` per resource under `backend/src/routes/`, mounted at `/api/<resource>` in `server.ts`
- Keep route handlers thin — put validation/business logic in dedicated modules (e.g. `catalog.ts`, `planBuilder.ts`), routes just orchestrate and shape the HTTP response
- For SSE routes: do ALL synchronous validation and risky work BEFORE `res.writeHead(200, { "Content-Type": "text/event-stream" })` — headers are immutable once a stream starts, so late errors can't downgrade to a normal JSON error response

### Testing Rules

- No test framework is configured (no Jest/Vitest/Playwright, no test files exist) — don't assume test conventions or add tests unless the user explicitly asks to set up a framework first

### Code Quality & Style Rules

- Frontend lint tool is `oxlint` (`.oxlintrc.json`), not ESLint — don't add ESLint config/deps
- No Prettier config — match existing style: 2-space indent, double quotes, semicolons
- File naming: PascalCase for React components, camelCase for other TS modules
- No barrel (`index.ts` re-export) files — import concrete files directly
- Shared types live in one centralized `types.ts` per side (`backend/src/types.ts`, `frontend/src/api/types.ts`), not colocated per-component/feature

### Development Workflow Rules

- Commit messages: short, imperative, capitalized single-line summary (e.g. "Add approval toast notification and redirect to dashboard")
- No branching convention established yet — history so far is direct commits to `main`
- No CI/CD pipeline configured — `npm run build`/`npm run typecheck` (backend) and `npm run build`/`npm run lint` (frontend) are the only validation steps available

### Critical Don't-Miss Rules

- **Never modify anything under the sibling `dayone/` repo** — read-only access only (YAML + `build_agent()` unmodified); any customization hook belongs in `backend/python-bridge/run_narrative.py`
- `run_narrative.py`'s stdout/stderr contract is load-bearing: stdout = exactly one final JSON blob, stderr = NDJSON progress events. Don't add prints/logs that violate this split
- Onboarding records snapshot `profile`/`project` data at creation time (not just ids) — never change this to re-read YAML by id on view, it would rewrite history when source data changes
- Single project per onboarding is an intentional MVP scope cut (`dayone` spec allows plural `project_ids`) — don't silently expand this
- "Approve & send to employee" only simulates a notification — don't add real email/Slack integration without explicit request
- The local JSON file store (`backend/data/onboardings.json`) has no concurrency control — fine for single-user demo use, but don't assume it's safe under concurrent writers

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**

- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

Last Updated: 2026-07-17
