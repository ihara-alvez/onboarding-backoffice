# Addendum — Onboarding Backoffice Lab 3 Capability Expansion

_Technical-how detail that doesn't belong in the PRD body but must survive into architecture._

## AgentCore Runtime connection details

- **Agent Runtime ARN:** `arn:aws:bedrock-agentcore:us-east-1:419466290453:runtime/htmx_chatapp_iv-YICsef3YpI`
- **Region:** `us-east-1`
- **Invocation SDK:** `@aws-sdk/client-bedrock-agentcore` (`BedrockAgentCoreClient` + `InvokeAgentRuntimeCommand`) — a Node/TypeScript SDK, directly usable from the existing Express backend (no need for a Python subprocess bridge to invoke it).
- **Session model:** `runtimeSessionId` must be 33+ characters; every new session id spins up a new MicroVM. This implies conversation continuity is achieved by **reusing the same `runtimeSessionId`** across turns of the same onboarding's chat/revision session — not yet confirmed against AWS docs, but consistent with the API shape. Flagged as an open question to verify during architecture.
- **Payload shape:** `payload` is a raw byte buffer (`Uint8Array`) — the example encodes plain text (`TextEncoder().encode(input_text)`). The current `run_narrative.py` bridge sends structured args (`--employee`, `--email`, `--profile`, `--project`) and expects an NDJSON stderr stream + single JSON stdout blob. The architecture phase needs to define the actual request/response payload contract for the AgentCore Runtime call (structured JSON encoded into the byte payload, matching or replacing today's prompt-construction logic in `run_narrative.py`).
- **Qualifier:** optional endpoint qualifier: defaults to `DEFAULT` if omitted.

## Relationship to the "other project" chat app

User-confirmed: the AgentCore Runtime above (`htmx_chatapp_iv`) is the **same deployed system** backing the "other project" chat app referenced for the future employee-facing frontoffice — a Lambda + CloudFront + ECR stack (`htmx-chatapp-iv`):

- `ChatAppRepositoryUri`: `419466290453.dkr.ecr.us-east-1.amazonaws.com/htmx-chatapp-iv`
- `CloudFrontDistributionId`: `E2S5VQQSGM45W1`
- `DeploymentMode`: `furl` (Lambda Function URL)
- `LambdaFunctionArn`: `arn:aws:lambda:us-east-1:419466290453:function:htmx-chatapp-iv-lambda`
- `LambdaFunctionUrl`: `https://duzl6pp1sqqa1.cloudfront.net`
- Stack ARN: `arn:aws:cloudformation:us-east-1:419466290453:stack/htmx-chatapp-iv-chatapp/33f96290-81ed-11f1-b315-0affcf775125`

**Implication for sequencing:** the AgentCore integration work in this PRD (§4.3) stands up the connection this app needs *now* (backoffice plan generation + manager chat/revision), and doing so also lays the groundwork the future frontoffice will reuse (same runtime, same agent) — even though the frontoffice itself remains out of scope for this PRD.

## Confirmed against the deployed agent's actual source (`dayone/agentcore/agent/my_agent.py` + `dayone/agentcore/chatapp/app/agentcore/{client,memory}.py`)

The `htmx_chatapp_iv` AgentCore Runtime already hosts the onboarding domain agent — `agent/tools/*.py`, `agent/prompts.py`, `agent/profiles/`, `agent/projects/` are registered in `my_agent.py` per `accelerator/INTEGRATION_PLAN.md`'s "Option C." Confirmed mechanics:

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

## Confirmed: MEMORY_ID is configured for this deployment

`dayone/agentcore/cdk/cdk-outputs.json` (`htmx-chatapp-iv-bedrock` stack output):
- `MemoryId`: `htmx_chatapp_iv_memory-EcqIoP3zBq`
- `MemoryArn`: `arn:aws:bedrock-agentcore:us-east-1:419466290453:memory/htmx_chatapp_iv_memory-EcqIoP3zBq`

`dayone/agentcore/cdk/lib/agent-stack.ts:519` wires this value into the runtime container as the `MEMORY_ID` env var `my_agent.py`'s `MemoryHook` reads. Chat continuity (FR-14) is achievable as designed — no deployment gap here.

## Proposed session/user identifiers (technical default, not a product decision)

- **`sessionId`**: reuse the onboarding's own `id` (already a UUID v4 — 36 characters, clears the 33+ char `runtimeSessionId` minimum). One stable id for that onboarding's whole chat lifetime; distinct onboardings never share a session.
- **`userId`**: a fixed placeholder (e.g. `"backoffice-manager"`), since this app has **no manager authentication/login system** — there is no real per-manager identity to pass. This is a pre-existing gap (the whole app is single-user-demo shaped per the current README), not something introduced by this feature.
- **Product-level consequence:** the Action Log (FR-7) can record *that* an approve/chat/delete action happened and *when*, but not *which manager* did it, until manager auth exists. `BACKOFFICE_SPEC.md`'s "every action must be audited" rule is only partially satisfiable today. Flagged as a Non-Goal in the PRD rather than silently assumed away.

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
