# Addendum — Onboarding Backoffice Lab 3 Capability Expansion

_Technical-how detail that doesn't belong in the PRD body but must survive into architecture._

## AgentCore Runtime connection details

- **Agent Runtime ARN:** `arn:aws:bedrock-agentcore:us-east-1:419466290453:runtime/htmx_chatapp_iv-YICsef3YpI`
- **Region:** `us-east-1`
- **Invocation SDK:** `@aws-sdk/client-bedrock-agentcore` (`BedrockAgentCoreClient` + `InvokeAgentRuntimeCommand`) — a Node/TypeScript SDK, directly usable from the existing Express backend (no need for a Python subprocess bridge to invoke it).
- **Session model:** `runtimeSessionId` must be 33+ characters; every new session id spins up a new MicroVM. This implies conversation continuity is achieved by **reusing the same `runtimeSessionId`** across turns of the same onboarding's chat/revision session — not yet confirmed against AWS docs, but consistent with the API shape. Flagged as an open question to verify during architecture.
- **Payload shape:** `payload` is a raw byte buffer (`Uint8Array`) — the example encodes plain text (`TextEncoder().encode(input_text)`). The current `run_narrative.py` bridge sends structured args (`--employee`, `--email`, `--profile`, `--project`) and expects an NDJSON stderr stream + single JSON stdout blob. The architecture phase needs to define the actual request/response payload contract for the AgentCore Runtime call (structured JSON encoded into the byte payload, matching or replacing today's prompt-construction logic in `run_narrative.py`).
- **Qualifier:** optional endpoint qualifier — defaults to `DEFAULT` if omitted.

## Relationship to the "other project" chat app

User-confirmed: the AgentCore Runtime above (`htmx_chatapp_iv`) is the **same deployed system** backing the "other project" chat app referenced for the future employee-facing frontoffice — a Lambda + CloudFront + ECR stack (`htmx-chatapp-iv`):

- `ChatAppRepositoryUri`: `419466290453.dkr.ecr.us-east-1.amazonaws.com/htmx-chatapp-iv`
- `CloudFrontDistributionId`: `E2S5VQQSGM45W1`
- `DeploymentMode`: `furl` (Lambda Function URL)
- `LambdaFunctionArn`: `arn:aws:lambda:us-east-1:419466290453:function:htmx-chatapp-iv-lambda`
- `LambdaFunctionUrl`: `https://duzl6pp1sqqa1.cloudfront.net`
- Stack ARN: `arn:aws:cloudformation:us-east-1:419466290453:stack/htmx-chatapp-iv-chatapp/33f96290-81ed-11f1-b315-0affcf775125`

**Implication for sequencing:** the AgentCore integration work in this PRD (§4.3) stands up the connection this app needs _now_ (backoffice plan generation + manager chat/revision), and doing so also lays the groundwork the future frontoffice will reuse (same runtime, same agent) — even though the frontoffice itself remains out of scope for this PRD.

## Confirmed: agent source-code mechanics

Verified directly against the deployed agent's source (`dayone/agentcore/agent/my_agent.py` + `dayone/agentcore/chatapp/app/agentcore/{client,memory}.py`). The `htmx_chatapp_iv` AgentCore Runtime already hosts the onboarding domain agent — `agent/tools/*.py`, `agent/prompts.py`, `agent/profiles/`, `agent/projects/` are registered in `my_agent.py` per `accelerator/INTEGRATION_PLAN.md`'s "Option C." Confirmed mechanics:

- **Session continuity is NOT automatic from reusing `runtimeSessionId` alone.** Each invocation constructs a brand-new `Agent` object with no built-in history. Continuity comes entirely from an explicit `MemoryHook`:
  - On agent init: `mem_client.list_events(memory_id=MEMORY_ID, actor_id=userId, session_id=sessionId, max_results=50)` — retrieves past turns and injects them as text into the system prompt.
  - After each turn: `mem_client.create_event(memory_id=MEMORY_ID, actor_id=userId, session_id=sessionId, messages=[(text, role)])`.
  - **Implication:** this app must send a **stable `userId` + `sessionId` pair** across all of one onboarding's chat turns (e.g. `userId` = a per-manager or per-onboarding identifier, `sessionId` = the onboarding's own id, padded/formatted to the 33+ char `runtimeSessionId` requirement). If the deployment's `MEMORY_ID` env var is unset, the agent logs a warning and runs with **no memory at all** — architecture must confirm `MEMORY_ID` is actually configured for `htmx_chatapp_iv` before relying on multi-turn continuity.

- **Exact request payload** (JSON, UTF-8 encoded into the `payload` field, `runtimeSessionId` passed identically at the top level of the SDK call):

  ```json
  {
    "prompt": "<latest user message text only — history is server-side via Memory>",
    "userId": "<stable actor id>",
    "sessionId": "<same value as runtimeSessionId>",
    "modelId": "anthropic.claude-haiku-4-5",
    "modelApi": "messages",
    "guardrailId": "...", "guardrailVersion": "...", "guardrailEnabled": true
  }
  ```

- **Exact response shape:** an HTTP streaming body of NDJSON lines. Relevant event shapes (per `client.py`'s parser): `{"event": {"contentBlockDelta": {"delta": {"text": "..."}}}}` (token-level text), `{"event": {"contentBlockDelta": {"delta": {"reasoningContent": {"text": "..."}}}}}` (reasoning), `{"type": "tool_use", "tool_name": ..., "tool_input": ...}`, `{"type": "tool_result", ...}`, `{"usage": {...}, "metrics": {...}}` (token counts/latency), `{"error": true, "message": "..."}` on failure. This maps cleanly onto the existing `ProgressEvent` union (`status`/`tool_call`/`reasoning`/`text`) with a straightforward translation layer — no `run_narrative.py`/subprocess needed.

- **Streaming is confirmed token-level**, not chunked-but-buffered — `contentBlockDelta` events arrive incrementally as the model generates.

- **Decision: the local Python-subprocess path (`pythonBridge.ts` + `run_narrative.py`) is removed entirely**, not kept as a fallback (user confirmed).

- **The deployed agent's tool list has a fourth tool beyond the three this PRD relies on: `mark_step_done`** (`my_agent.py` imports it from `tools/track_progress.py` and includes it in the `tools=[...]` list passed to `Agent(...)`, alongside `load_profile`/`load_project`/`generate_onboarding_plan`). Its implementation writes a JSON file under `/tmp/onboarding-progress/` on the AgentCore Runtime container — the module's own docstring says this is "intentionally file-based for the workshop... in production, replace with DynamoDB writes." Since each `runtimeSessionId` spins up a fresh MicroVM (see "Session model" above) and `/tmp` isn't shared or exposed to this app, any call the agent makes to this tool during a Manager Revision Chat exchange is invisible and inert from this app's side — confirmed no impact on FR-7 (Progress) or FR-8 (Action Log). Resolves the `track_progress`-tool open question raised during Finalize reconciliation (2026-07-20).

## Confirmed: MEMORY_ID is configured for this deployment

`dayone/agentcore/cdk/cdk-outputs.json` (`htmx-chatapp-iv-bedrock` stack output):

- `MemoryId`: `htmx_chatapp_iv_memory-EcqIoP3zBq`
- `MemoryArn`: `arn:aws:bedrock-agentcore:us-east-1:419466290453:memory/htmx_chatapp_iv_memory-EcqIoP3zBq`

`dayone/agentcore/cdk/lib/agent-stack.ts:519` wires this value into the runtime container as the `MEMORY_ID` env var that `my_agent.py`'s `MemoryHook` reads. Chat continuity (FR-15) is achievable as designed — no deployment gap here.

## Proposed session/user identifiers (technical default, not a product decision)

- **`sessionId`**: reuse the onboarding's own `id` (already a UUID v4 — 36 characters, clears the 33+ char `runtimeSessionId` minimum). One stable id for that onboarding's whole chat lifetime; distinct onboardings never share a session.
- **`userId`**: a fixed placeholder (e.g. `"backoffice-manager"`), since this app has **no manager authentication/login system** — there is no real per-manager identity to pass. This is a pre-existing gap (the whole app is single-user-demo shaped per the current README), not something introduced by this feature.
- **Product-level consequence:** the Action Log (FR-8) can record _that_ an approve/chat/delete action happened and _when_, but not _which manager_ did it, until manager auth exists. `BACKOFFICE_SPEC.md`'s "every action must be audited" rule is only partially satisfiable today. Flagged as a Non-Goal in the PRD rather than silently assumed away.
- **Reconciled with FR-15:** FR-15's stated isolation guarantee ("distinct `userId`/`sessionId` pairs" per onboarding) is achieved by `sessionId` alone — `userId` is a single fixed placeholder shared by every onboarding, per the no-manager-auth gap above. FR-15's wording in `prd.md` has been corrected to attribute isolation to `sessionId`, not to both identifiers, so it no longer overclaims against this technical default.
- **Open for architecture — bootstrap session id.** FR-14's very first AgentCore call for a brand-new onboarding happens before FR-2 has determined success/failure, and before any record/id is persisted — but the session id proposed above is "the onboarding's own id." Architecture needs to define what session id the bootstrap call uses before an id exists, and whether/how any Memory events accumulated under a pre-persistence placeholder get reconciled with the real record's id.
- **Open for architecture — unbounded Memory accumulation.** Session id is reused for an onboarding's whole chat lifetime (see above), and FR-3's auto-revert-to-draft plus FR-5's blocked↔draft retry loop are both stated as repeatable with no cap. Nothing defines a reset/truncation point for the AgentCore Memory session, so a heavily-revised or repeatedly-retried onboarding could accumulate unbounded conversational context. Architecture should decide whether this needs a cap, a reset trigger (e.g. on "Send for approval"), or is acceptable as-is for MVP volumes.
- **By design, not a gap — chat-revision failures don't escalate to `blocked`.** Unlike FR-2's initial-generation failure (which has no prior plan to fall back on, so `blocked` is the only sane outcome), a failed chat revision (FR-10) always has a previous valid plan to leave untouched — escalating to `blocked` would discard a working plan over a transient chat error. The asymmetry between FR-2 and FR-10's failure handling is intentional, not an oversight.
- **Open for architecture — delete mid-stream.** Deleting an onboarding while its initial generation (FR-14) or a chat revision (FR-10) is still streaming (FR-16) isn't addressed by any FR. Architecture should define whether the in-flight AgentCore call is cancelled and whether the SSE stream is torn down cleanly, so a late `progress`/`done` event never tries to write to a deleted record.

## Proposed NDJSON → `ProgressEvent` mapping (technical default, not a product decision)

The existing frontend/backend already share a `ProgressEvent` union (`backend/src/types.ts`, mirrored in `frontend/src/api/types.ts`):

```ts
type ProgressEvent =
  | { type: "status"; message: string }
  | { type: "tool_call"; tool: string; count: number }
  | { type: "reasoning"; text: string }
  | { type: "text"; text: string; complete: boolean };
```

Proposed translation from AgentCore's NDJSON lines:

- `event.contentBlockDelta.delta.text` → `{ type: "text", text, complete: false }` (accumulate; emit one final `complete: true` when the stream ends)
- `event.contentBlockDelta.delta.reasoningContent.text` → `{ type: "reasoning", text }`
- `{"type": "tool_use", "tool_name": ...}` → `{ type: "tool_call", tool: tool_name, count: <running counter, mirrors today's run_narrative.py logic> }`
- `{"error": true, "message": ...}` → not a `ProgressEvent`; terminates the stream the same way today's `narrativeError` path does
- `{"usage": ..., "metrics": ...}` → no existing `ProgressEvent` variant covers token/latency metrics. Two options for architecture to choose between: (a) extend `ProgressEvent` with a new `metadata` variant, or (b) drop it from the live UI and log it server-side only (e.g. into the Action Log's revision entry). Not decided here.

## Minor reconciliation notes (Finalize pass, 2026-07-20)

Low-priority items surfaced while reconciling the PRD against `BACKOFFICE_SPEC.md`/`ARCHITECTURE.md`/`WORKSHOP_LABS.md`/`PRODUCT_SPEC.md`. None warranted a PRD-body change; kept here so they aren't lost.

- **Multi-project citation.** The PRD's Non-Goal cutting multi-project onboardings (§5) cites only `BACKOFFICE_SPEC.md`'s plural `project_ids`; `ARCHITECTURE.md`'s Backoffice component spec independently lists "Project or set of projects" as a minimum field, anticipating the same thing. Same decision, second source — worth citing both if this Non-Goal is ever revisited.
- **Guardrail fields undocumented in ARCHITECTURE.md.** The confirmed AgentCore payload contract above includes `guardrailId`/`guardrailVersion`/`guardrailEnabled`, which `ARCHITECTURE.md` never mentions. Not a contradiction — just newer detail than the architecture doc captures; architecture phase should absorb it.
- **Frontoffice has no defined later-lab home.** `WORKSHOP_LABS.md` defines no Lab 4 — Lab 3 is the workshop's terminal "path to production" lab. The employee-facing frontoffice this PRD defers (§2.2, §5) therefore has no defined lab to land in; it's a real product surface without an assigned workshop slot. Worth knowing if/when that work gets scheduled.
- **"Don't break the local path" tension.** `WORKSHOP_LABS.md`'s stated philosophy is that Lab 2 and Lab 3 are optional/additive and don't break the local (subprocess) path. This PRD's FR-14 removes that local path entirely, with no fallback — confirmed by the user, not a mistake, but an undiscussed tradeoff against the workshop's own stated principle (which targets the `dayone` repo, not this app, so it's not a literal violation).
- **Pedagogical vs. product success criteria.** `WORKSHOP_LABS.md` measures Lab 3 success by team comprehension/extensibility; this PRD substitutes product KPIs (SM-1–3). Reasonable for a PRD, just a different yardstick than the workshop doc uses — not a conflict, just worth naming if a workshop facilitator ever compares the two.
- **Zero-hallucination rule not re-asserted on the revision path.** `PRODUCT_SPEC.md`'s J1 journey states a tool-only, no-generative-content rule for repo/permission fields. FR-10 (conversational plan revision) re-invokes the same tools, so the rule likely already holds on the revised plan too — but the PRD never restates it explicitly for that path. Low-risk given the tool-reinvocation design.
- **No cross-reference to PRODUCT_SPEC.md's multi-tenant/multi-cohort deferred item.** `PRODUCT_SPEC.md` names a future multi-tenant/multi-cohort backoffice as deferred; this PRD's own Non-Goals never cross-reference it despite the obvious naming overlap with "the backoffice."
- **"Risks" plan field coverage unclear.** `PRODUCT_SPEC.md`'s J1 output includes a "risks/approvals" plan field. The PRD's detail-view completeness work (§4.1) names Permissions/Progress/Action Log as the missing sections but doesn't say whether Risks is already covered inline elsewhere or genuinely absent — the reconciling agent flagged this as low-confidence, not confirmed missing.
- **Notification timing divergence.** `BACKOFFICE_SPEC.md`'s "create onboarding" action list fires "send link to new employee" at creation time (step 8); the actual app fires this simulated notification at approval time instead. The PRD's Non-Goal (§5) notes the notification "stays simulated" but doesn't flag this timing difference from the spec.
- **Security rules 1/3 only implicitly covered.** `BACKOFFICE_SPEC.md`'s security rules 2 ("every action must be audited") and 4 ("permission templates must be versioned...") are explicitly addressed by this PRD's FRs/Non-Goals. Rules 1 ("must not grant sensitive production access without approval") and 3 ("employee should only see authorized information") are only accidentally satisfied — via the simulated-permissions Non-Goal and the no-employee-view Non-Goal respectively — never stated as intentional fulfillment of those specific rules.
