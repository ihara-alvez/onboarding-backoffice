# Onboarding Backoffice

A manager-facing web app to create, review, and approve developer onboardings — built on top of
the [`dayone`](../dayone) workshop repo's domain data (`profiles/`, `projects/`) and its real Lab 2
Strands agent (`agent/strands_agent.py`).

This is a **separate repo**, sibling to `dayone`. **`dayone` is never modified** — this app only
*reads* its YAML files and invokes its Strands agent via a subprocess. See
[Architecture](#architecture) for exactly how that works.

## What it does

1. **Create an onboarding** — pick an employee name/email, a profile (role), and a project. The
   backend calls the real `dayone` Strands agent live against Amazon Bedrock, and streams back what
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
- The `dayone` repo cloned as a **sibling directory** (`../dayone` relative to this repo), with:
  - Its own `.venv` created and `strands-agents`/`boto3`/`PyYAML` installed (see `dayone`'s own
    README/`WORKSHOP_LABS.md` for Lab 2 setup).
  - AWS credentials with Bedrock model access, and `AWS_REGION`/`BEDROCK_MODEL_ID` known — this app
    reuses whatever you already verified working for `dayone`'s Lab 2 (`python -m
    agent.strands_agent ...`). If that command doesn't work from `dayone` directly, fix that first —
    this app calls the exact same code path.

## Running it

Two processes, two terminals.

**1. Backend** (Express, port 8000):

```bash
cd backend
npm install   # first time only

export AWS_PROFILE=onboarding-workshop      # or however you authenticate to AWS
export AWS_REGION=us-east-1
export BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-5-20250929-v1:0
export DAYONE_REPO_PATH=/absolute/path/to/dayone   # optional — defaults to ../../dayone

npm run dev
```

You should see `onboarding-backoffice backend listening on http://localhost:8000`.
`dayone/.venv` is never activated in this shell — only a spawned child process touches it, via the
absolute path `$DAYONE_REPO_PATH/.venv/bin/python3`.

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
              builds the deterministic plan natively in TS, and shells out to Python
              for exactly one thing: the live agent narrative.
    python-bridge/run_narrative.py
              The ONLY file that touches Python/Strands. Imports dayone/agent/strands_agent.py's
              build_agent() unmodified, swaps in a custom callback_handler (streaming
              observability events to stderr instead of dayone's default stdout-printing one),
              and prints the final result as one JSON line on stdout.
    data/onboardings.json
              Local JSON persistence for onboarding records — entirely separate from dayone's
              own .local-progress/ state.
  frontend/   React + Vite + Tailwind v4, hand-rolled Material Design 3 tokens (no MD3
              component library — kept simple/low-risk).

dayone/                          (sibling repo, READ-ONLY from this app's perspective)
  profiles/*.yaml, projects/*.yaml   — read directly by backend/src/catalog.ts
  agent/strands_agent.py             — invoked via python-bridge/run_narrative.py, unmodified
```

### Why a Python subprocess for one piece of a TypeScript app

Strands Agents (the SDK `dayone/agent/strands_agent.py` is built on) is Python-only — there's no
TypeScript port. Rather than reimplementing agent reasoning/tool-calling in TS (which would stop
being "dayone's actual agent"), the backend spawns `dayone`'s own Python environment as a
subprocess for that one call, the same way you might shell out to `ffmpeg` or `pandoc` for a task
outside your main language. Everything else — reading YAML, building the deterministic plan, local
persistence, the approve action — is plain TypeScript.

### Live observability (not a blind spinner)

`run_narrative.py` sets `agent.callback_handler` to a custom function (mirroring
`strands.handlers.callback_handler.PrintingCallbackHandler`'s own logic) that emits one JSON event
per line to **stderr** as the agent works — a `tool_call` event each time the agent invokes
`load_profile`/`load_project`/`generate_onboarding_plan`, and `text` events for each streamed
response chunk. **stdout** stays reserved for exactly one JSON blob, printed once at the end — the
final narrative or an error — so parsing the "final result" never changed.

`backend/src/pythonBridge.ts` reads stderr line-by-line as it arrives (not buffered until the
process exits) and relays each parsed event to a caller-supplied callback in real time.
`POST /api/onboardings` uses that to stream Server-Sent Events to the browser: an `event: progress`
message per agent event, then one final `event: done` message carrying the complete onboarding
record. The frontend (`CreateOnboardingPage.tsx` + `ProgressLog.tsx`) reads this stream directly via
`fetch` + `ReadableStream` (not the browser's built-in `EventSource`, since that only supports GET)
and renders each tool call as it happens, with the streamed text accumulating live underneath.

**Important: this observability hook lives entirely in this repo's `run_narrative.py`, not in
`dayone`.** `dayone/agent/strands_agent.py::build_agent()` is called completely unmodified; we just
override `agent.callback_handler` on the returned object before invoking it — the same extension
point Strands itself uses internally, just pointed at our own event emitter instead of the default
stdout-printing one.

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
