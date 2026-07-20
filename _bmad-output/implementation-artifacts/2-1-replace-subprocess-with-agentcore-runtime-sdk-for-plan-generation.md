# Story 2.1: Replace Subprocess with AgentCore Runtime SDK for Plan Generation

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a manager,
I want plan generation to run against the deployed AgentCore Runtime instead of a local Python subprocess,
so that generation is production-grade and reliable, and doesn't depend on a local Python environment.

## Acceptance Criteria

1. Given a manager creates an onboarding, when plan generation runs, then the request is sent via the AgentCore Runtime SDK (`@aws-sdk/client-bedrock-agentcore`, `BedrockAgentCoreClient` + `InvokeAgentRuntimeCommand`) against Agent Runtime ARN `arn:aws:bedrock-agentcore:us-east-1:419466290453:runtime/htmx_chatapp_iv-YICsef3YpI` (region `us-east-1`, qualifier `DEFAULT`), not via `child_process.spawn` into a Python interpreter.
2. Given the AgentCore call succeeds, when the response is received, then the resulting plan/narrative is stored exactly as today's subprocess-based flow would have stored it — no change to the `OnboardingRecord` shape from this story alone.
3. Given this story ships, when the local Python-subprocess path (`pythonBridge.ts` + `run_narrative.py`) is removed, then no fallback to it remains anywhere in the codebase.
4. Given no onboarding record exists yet — the very first AgentCore call for a brand-new onboarding — when that bootstrap call is made, then it uses a defined bootstrap session id rather than failing or reusing another onboarding's session; no reconciliation with the real record's id is needed since generation is single-turn.
5. Given the AgentCore Runtime streams NDJSON, when a response comes back, then it's translated into the existing `ProgressEvent` union, accumulating text deltas into the final narrative.
6. Given a `{usage, metrics}` event arrives, then it is logged server-side only — no new `ProgressEvent` variant.
7. Given the AgentCore-based generation path is live, then end-to-end latency/success rate show no regression (NFR2).
8. Given an onboarding is deleted while its initial generation is still streaming, then the in-flight call/stream is safely discarded without writing to the deleted record.

## Tasks / Subtasks

- [ ] Task 1: Dependency and file removal (AC: 3)
  - [ ] Add `@aws-sdk/client-bedrock-agentcore` to `backend/package.json` dependencies (check npm for the current published version at implementation time — this SDK ships as part of the regular `@aws-sdk/client-*` v3 family, same versioning scheme as any other AWS SDK v3 client).
  - [ ] Delete `backend/src/pythonBridge.ts` and `backend/python-bridge/run_narrative.py` entirely. No fallback path, no feature flag.
- [ ] Task 2: New `agentCoreClient.ts` module (AC: 1, 2, 4, 5, 6)
  - [ ] Create `backend/src/agentCoreClient.ts` exporting the **identical interface shape** the old `pythonBridge.ts` exported — `NarrativeArgs` (`employeeName`/`employeeEmail`/`profileId`/`projectId`), `NarrativeOutcome` (`{ ok: true; narrative: string } | { ok: false; error: string }`), and `runNarrative(args, onEvent?): Promise<NarrativeOutcome>` — so `routes/onboardings.ts`'s call site needs **only its import statement changed**, nothing else.
  - [ ] **Prompt (AC 1, use verbatim — this is the exact text `run_narrative.py` sends today, confirmed by reading it; do not invent a different one)**:
    ```
    Generate the onboarding plan for employee '{employeeName}' (email {employeeEmail}) with profile '{profileId}' on project '{projectId}'. Use the load_profile and load_project tools to get the data and then generate_onboarding_plan to produce a detailed step by step plan in Markdown. Show me the checklist.
    ```
  - [ ] **Bootstrap session id (AC 4):** generate a fresh `crypto.randomUUID()` inside `agentCoreClient.ts` for each generation call — 36 characters, clears the 33+ character `runtimeSessionId` minimum. It is **never** the onboarding's eventual real id (which doesn't exist yet — `routes/onboardings.ts` assigns `id: crypto.randomUUID()` to the record only *after* `runNarrative` resolves), never persisted, never reused. This is safe specifically because generation is single-turn with no Memory continuity requirement — resolves the "bootstrap session id" item `addendum.md` flagged as open for architecture.
  - [ ] **Payload (JSON, UTF-8-encoded via `new TextEncoder().encode(...)` into the `payload` field, matching `addendum.md`'s confirmed contract):**
    ```json
    { "prompt": "<the prompt above>", "userId": "backoffice-manager", "sessionId": "<bootstrap session id>", "modelId": "anthropic.claude-haiku-4-5", "modelApi": "messages" }
    ```
    (`guardrailId`/`guardrailVersion`/`guardrailEnabled` are optional per the confirmed contract — omit them for this story; nothing here requires guardrail configuration.)
  - [ ] Call `client.send(new InvokeAgentRuntimeCommand({ agentRuntimeArn, runtimeSessionId: sessionId, payload }))` — `runtimeSessionId` passed identically at the top level *and* inside the payload's `sessionId` field (both required, confirmed by the reference Python client at `dayone/agentcore/chatapp/app/agentcore/client.py`).
  - [ ] **Stream parsing — read `response.response` (the streaming body) as chunks, incrementally UTF-8-decode (Node's `TextDecoder` with `{ stream: true }`, mirroring the reference client's incremental-decoder pattern), split on `\n`, parse each non-empty line as JSON.** For each parsed line: `{"error": true, "message": ...}` → the agent's own reported failure, treat as `{ ok: false, error: message }` and stop; `event.contentBlockDelta.delta.text` → accumulate into the running narrative string AND emit `{ type: "text", text, complete: false }` via `onEvent` (emit one final `{ type: "text", text: "", complete: true }` once the stream ends); `event.contentBlockDelta.delta.reasoningContent.text` → emit `{ type: "reasoning", text }`; `{"type": "tool_use", "tool_name": ...}` → emit `{ type: "tool_call", tool: tool_name, count }` (increment a local counter per call, same pattern as the old bridge's `tool_count`); `{"usage": ..., "metrics": ...}` → log server-side (`console.log`/similar) only, no `ProgressEvent` emitted. Skip anything else (this deployment uses Anthropic Claude via the Messages API, not Nova — the reference Python client's Nova-specific XML-stripping branches don't apply and shouldn't be ported).
  - [ ] **The final `narrative` is the accumulated `text`-delta string** — there is no separate "final answer" field in the response; the deployed agent (`dayone/agentcore/agent/my_agent.py`) only yields incremental deltas. If no text was ever accumulated and no error line arrived, return `{ ok: false, error: "Agent stream ended without producing a response" }`.
  - [ ] Wrap the whole `client.send(...)` + stream-read in `try/catch` — catch SDK-level exceptions (`ValidationException`, `ThrottlingException`, `InternalServerException`/similar, per the Node SDK's typed error classes) and any other error, converting to `{ ok: false, error: ... }`. Never let this function throw past its own boundary — its callers (the SSE route handler) rely on the discriminated result, not try/catch, per this project's fallible-async-operation convention.
- [ ] Task 3: Wire it in (AC: 1, 2)
  - [ ] In `backend/src/routes/onboardings.ts`, change the import from `import { runNarrative, ProgressEvent } from "../pythonBridge";` to `import { runNarrative } from "../agentCoreClient"; import { ProgressEvent } from "../types";` (import `ProgressEvent` directly from `types.ts` now — no need for the pass-through re-export the old bridge module did). No other change to this file for this story — the call site (`await runNarrative({ employeeName, employeeEmail, profileId, projectId }, onEvent)`) is unchanged.
- [ ] Task 4: Update setup docs (AC: 1)
  - [ ] In `README.md`, update the "Prerequisites"/"Running it" sections: remove the `dayone/.venv`, `BEDROCK_MODEL_ID`, and Python-subprocess-specific setup instructions; note that AWS credentials now need Bedrock AgentCore invoke permissions directly from this Node process (same `AWS_PROFILE`/`AWS_REGION` env vars the SDK's default credential chain already picks up — no new env-var wiring required beyond what's already documented). `DAYONE_REPO_PATH` stays relevant (still used by `catalog.ts` to read `profiles/*.yaml`/`projects/*.yaml` directly) but is no longer used for spawning Python.
- [ ] Task 5: Verify (AC: 1–8)
  - [ ] `npm run build`/`typecheck` in `backend/` (this will surface any AWS SDK type mismatches immediately).
  - [ ] Manually create an onboarding against the real deployed runtime, confirm the narrative renders correctly in the detail view exactly as before, and that tool-call/reasoning/text progress events stream live in `CreateOnboardingPage`'s console exactly as they did with the old subprocess bridge.
  - [ ] Confirm no reference to `pythonBridge`/`run_narrative.py` remains anywhere (`grep -rn "pythonBridge\|run_narrative" backend/`).

## Dev Notes

- **This story's prompt/payload/parsing details came from reading three real, working reference sources directly (not guessed):** `backend/python-bridge/run_narrative.py` (today's exact prompt text), `dayone/agentcore/agent/my_agent.py` (the deployed agent's actual `invoke` entrypoint — confirms payload fields read, tool list, event shapes yielded), and `dayone/agentcore/chatapp/app/agentcore/client.py` (a working, production Python client already parsing this exact runtime's NDJSON stream — its `_invoke_stream_sync`/`_parse_ndjson_line` methods are the ground truth for what shapes actually appear on the wire). Port the *logic*, not the Python-specific bits (Nova XML stripping, the async/thread-bridging machinery that only exists because Python's boto3 streaming body is sync — Node's AWS SDK v3 stream handling doesn't need that workaround).
- **`response.response`'s exact TypeScript type** depends on the SDK's streaming-blob-body typing for a Node runtime (likely a `Readable`/async-iterable of `Uint8Array`, per AWS SDK v3 convention for other streaming clients like S3's `GetObject`) — check the actual type the installed `@aws-sdk/client-bedrock-agentcore` version exposes for `InvokeAgentRuntimeCommandOutput.response` and iterate it accordingly (`for await (const chunk of response.response)` is the typical pattern for Node-targeted SDK v3 streaming bodies).
- **Don't try to reuse `pythonBridge.ts`'s `NARRATIVE_TIMEOUT_MS` (40s) pattern verbatim** — AgentCore Runtime invocations have their own service-side behavior; if a client-side timeout still feels warranted, that's a judgment call for this story, but it's not a stated requirement here (NFR2 only requires parity, not a specific new timeout value).
- **AC8 (delete-mid-stream)** only needs a narrow guard here: since `saveOnboarding()` only runs *after* `runNarrative()` resolves (per the existing `POST /` handler structure), there's no record to accidentally write to mid-stream for the *initial-generation* case specifically — a delete can't target a record whose `id` doesn't exist yet. The more meaningful delete-mid-stream case (an *existing* record being deleted while its chat revision streams) is Story 2.3's responsibility, not this one; this story's AC8 is effectively already satisfied by the existing code structure, not something new to build.

### Project Structure Notes

- Files to CREATE: `backend/src/agentCoreClient.ts`.
- Files to DELETE: `backend/src/pythonBridge.ts`, `backend/python-bridge/run_narrative.py` (and the now-empty `backend/python-bridge/` directory, if nothing else lives there).
- Files to UPDATE: `backend/package.json` (new dependency), `backend/src/routes/onboardings.ts` (import swap only), `README.md` (setup instructions).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1: Replace Subprocess with AgentCore Runtime SDK for Plan Generation]
- [Source: _bmad-output/planning-artifacts/prds/prd-onboarding-backoffice-2026-07-17/prd.md#FR-14, FR-16, NFR2]
- [Source: _bmad-output/planning-artifacts/prds/prd-onboarding-backoffice-2026-07-17/addendum.md] — connection ARN/region, payload contract, NDJSON→ProgressEvent mapping proposal
- [Source: backend/python-bridge/run_narrative.py] — exact current prompt text, ported verbatim
- [Source: backend/src/pythonBridge.ts] — interface shape (`NarrativeArgs`/`NarrativeOutcome`/`runNarrative`) to preserve
- [Source: backend/src/routes/onboardings.ts] — call site, unchanged beyond the import
- [Source: /home/ialvez/workspace/dayone/agentcore/agent/my_agent.py] — deployed agent's actual `invoke` entrypoint, payload fields read, tool list, event shapes yielded (read-only reference, this file is never modified)
- [Source: /home/ialvez/workspace/dayone/agentcore/chatapp/app/agentcore/client.py] — working reference NDJSON parser/AgentCore invocation for this exact runtime (read-only reference)
- [Source: _bmad-output/project-context.md] — discriminated-result convention for fallible operations, never throw uncaught

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
