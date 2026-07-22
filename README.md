# Onboarding Backoffice

A manager-facing web app to create, review, and approve developer onboardings — built on top of
the [`dayone`](../dayone) workshop repo's domain data (`profiles/`, `projects/`) and its deployed
AgentCore Runtime.

This is a **separate repo**, sibling to `dayone`. **`dayone` is never modified** — this app only
*reads* its YAML files and invokes the deployed AgentCore Runtime. See
[Architecture](#architecture) for exactly how that works.

## What it does

1. **Create an onboarding** — pick an employee name/email, a profile (role), and a project. The
   backend calls the deployed AgentCore Runtime live against Amazon Bedrock, and streams back what
   the agent is actually doing (tool calls, reasoning, streamed response text) in real time —
   not a blind loading spinner.
2. **Review the plan** — repositories to clone, expected permissions, day-1/week-1 checklist,
   suggested first tasks, docs, and risk notes, all rendered as structured sections (not a parsed
   Markdown blob), plus the agent's own live narrative response in a distinct panel.
3. **Approve & send to employee** — a manager-only action that flips the onboarding's status and
   records a simulated notification (no real email/Slack integration — that's out of scope for this
   workshop, see `dayone/WORKSHOP_OBJECTIVES.md`).

## Prerequisites

- Node.js 20+ and npm.
- The `dayone` repo cloned as a **sibling directory** (`../dayone` relative to this repo), so the
  backend can read its `profiles/*.yaml` and `projects/*.yaml` files.
- AWS credentials with permission to invoke the deployed Bedrock AgentCore Runtime directly from
  this Node process. The SDK's default credential chain uses `AWS_PROFILE` and `AWS_REGION`.

## Running it

Two processes, two terminals.

**1. Backend** (Express, port 8000):

```bash
cd backend
npm install   # first time only

export AWS_PROFILE=onboarding-workshop      # or however you authenticate to AWS
export AWS_REGION=us-east-1
export AGENT_RUNTIME_ARN=arn:aws:bedrock-agentcore:us-east-1:419466290453:runtime/htmx_chatapp_iava-q2e5r0DYmQ
export AGENTCORE_GUARDRAIL_ID=wb4578p8755b
export AGENTCORE_GUARDRAIL_VERSION=1
export DAYONE_REPO_PATH=/absolute/path/to/dayone   # optional — defaults to ../../dayone; YAML data only

npm run dev
```

You should see `onboarding-backoffice backend listening on http://localhost:8000`.
**2. Frontend** (Vite, port 5173):

```bash
cd frontend
npm install   # first time only
npm run dev
```

Open `http://localhost:5173`. The dev server proxies `/api/*` to the backend on port 8000.

## Production build

```bash
# backend
cd backend && npm run build && npm start    # compiles to dist/, then runs it

# frontend
cd frontend && npm run build                # outputs static files to dist/
```

The frontend's production build is a static site — serve `frontend/dist/` with any static file
server, pointed at wherever the backend actually runs (you'll need to adjust the `/api` proxy
target / add a reverse-proxy rule, since Vite's dev-only proxy config doesn't apply to the built
output).

## Architecture

```
onboarding-backoffice/          (this repo)
  backend/    Express + TypeScript. Reads dayone's profiles/projects YAML directly,
              builds the deterministic plan natively in TS, and invokes the deployed
              AgentCore Runtime for the live agent narrative. The runtime ARN and
              guardrail settings can be overridden with environment variables.
    src/agentCoreClient.ts
              Sends the generation prompt through the AgentCore Runtime SDK, parses its
              NDJSON response stream, and relays progress events to the SSE route.
    data/onboardings.json
              Local JSON persistence for onboarding records — entirely separate from dayone's
              own .local-progress/ state.
  frontend/   React + Vite + Tailwind v4, hand-rolled Material Design 3 tokens (no MD3
              component library — kept simple/low-risk).

dayone/                          (sibling repo, READ-ONLY from this app's perspective)
  profiles/*.yaml, projects/*.yaml   — read directly by backend/src/catalog.ts
  agent/strands_agent.py             — not used by this app's generation path
```

### Live observability (not a blind spinner)

The AgentCore Runtime streams NDJSON events for tool calls, reasoning, and response text.
`backend/src/agentCoreClient.ts` incrementally decodes that stream, accumulates the narrative, and
relays each progress event to a caller-supplied callback in real time. Usage and metrics events are
logged server-side only.

`POST /api/onboardings` uses that to stream Server-Sent Events to the browser: an `event: progress`
message per agent event, then one final `event: done` message carrying the complete onboarding
record. The frontend (`CreateOnboardingPage.tsx` + `ProgressLog.tsx`) reads this stream directly via
`fetch` + `ReadableStream` (not the browser's built-in `EventSource`, since that only supports GET)
and renders each tool call as it happens, with the streamed text accumulating live underneath.

### Snapshotting profile/project data

Each onboarding record stores a full copy of the `profile`/`project` data as it existed at creation
time, not just their ids. Reasoning: `profiles/*.yaml`/`projects/*.yaml` can change over time; if a
record only stored ids and re-read the files on every view, editing a profile later would silently
rewrite the history of onboardings that already happened under the old rules. Snapshotting also
means the detail page can render Repositories/Permissions/Checklist as real structured sections
straight from the stored data, with no Markdown parsing required.

## Known limitations (by design, for this MVP)

- No checklist/step-completion write actions (`mark_step_done` from `dayone`'s Lab 2 is
  intentionally not exposed here — this app is read + create + approve only).
- Single project per onboarding (not the plural `project_ids` from `dayone/docs/BACKOFFICE_SPEC.md`).
- "Approve & send to employee" only sets local state and a simulated notification record — no real
  email/Slack integration.
- Local JSON file storage, no database — fine for a single-user demo, not for concurrent multi-user
  production use.
