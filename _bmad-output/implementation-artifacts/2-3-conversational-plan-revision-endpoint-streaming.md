# Story 2.3: Conversational Plan Revision Endpoint & Streaming

---
baseline_commit: 820e85e272a0f87360aae75fb05c8d8e9b83b44a
---

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a manager,
I want to send a chat message describing a change and have the agent revise the plan using its existing tools,
so that I can fix an inaccurate plan without deleting and recreating the onboarding.

## Acceptance Criteria

1. Given a chat message requesting a specific change, when the agent responds, then the onboarding's stored plan reflects the requested change, with enough context sent for the agent to reason and re-invoke `load_profile`, `load_project`, `generate_onboarding_plan`.
2. Given the onboarding was approved while a chat response was in flight, when the response arrives, then the revision is discarded and the Action Log records a rejected late revision.
3. Given the agent's revision attempt fails, when the failure occurs, then the previous plan remains displayed unchanged and the chat surfaces the error.
4. Given a chat message is sent while a previous message on the same onboarding is still being answered, when the new message arrives, then it is queued and processed only after the prior response completes and is applied.
5. Given a chat message is in progress, when the agent streams output, then the frontend receives incremental `progress` events via the existing SSE relay, terminating in one `done` event.
6. Given an onboarding is deleted while a chat revision is still streaming, then the in-flight call/stream is safely discarded without writing to the deleted record.

## Tasks / Subtasks

- [x] Task 1: Extract a shared low-level AgentCore invoke function (AC: 1, 5) — do this before adding a second call site
  - [x] In `backend/src/agentCoreClient.ts` (created in Story 2.1), extract the SDK-call + NDJSON-stream-parsing logic out of `runNarrative` into a new exported function, e.g. `invokeAgent(payload: Record<string, unknown>, sessionId: string, onEvent?: (event: ProgressEvent) => void): Promise<{ ok: true; text: string } | { ok: false; error: string }>` — everything from building the SDK command through accumulating the final text stays here. Reimplement `runNarrative` as a thin wrapper: build its generation-specific prompt/payload/bootstrap-session-id, call `invokeAgent`, map `text`→`narrative`. This story's new chat function calls the same `invokeAgent` with a different prompt/payload/session id — no duplicated stream-parsing code.
- [x] Task 2: Per-onboarding chat queue (AC: 4)
  - [x] Add a simple in-memory per-onboarding lock in the new chat-handling module (e.g. a `Map<string, Promise<void>>` chaining each onboarding's calls), so a second message on the same onboarding always waits for the first to fully complete and apply before it starts. In-memory only (resets on server restart) — consistent with this app's existing single-process, no-persistence-beyond-the-JSON-file scope; no new infrastructure needed.
- [x] Task 3: The chat endpoint itself (AC: 1, 2, 3, 4, 5, 6)
  - [x] Add `POST /api/onboardings/:id/chat` (body: `{ message: string }`) in `backend/src/routes/onboardings.ts`. Synchronous pre-stream validation (before `res.writeHead`, same rule as every other SSE route here): record exists (404 otherwise) and `status` is `draft` or `pending_approval` (409 otherwise — this mirrors FR9's UI gating as a server-side safety net; Story 2.4 owns the actual UI gating, this is defense in depth, not new user-facing behavior).
  - [x] If `status === "pending_approval"`, call Story 1.3's `revertToDraft(id, "Chat message sent while pending approval")` **synchronously, before** starting the slow agent call — per Story 1.3's Dev Notes, the revert happens on *send*, not on the agent's eventual response.
  - [x] Acquire this onboarding's chat lock (Task 2), then build the revision prompt (new template, authored for this story — there's no prior-art exact text to copy, unlike Story 2.1's generation prompt which came from existing code):
    ```
    The manager wants to revise the onboarding plan for employee '{employeeName}' (email {employeeEmail}), profile '{profileId}', project '{projectId}'.

    Current plan:
    {record.narrative}

    Requested change: {message}

    Use the load_profile and load_project tools to reload the data, then use generate_onboarding_plan to produce the REVISED plan in Markdown, reflecting the requested change. Show me the full updated plan.
    ```
  - [x] Call `invokeAgent(payload, sessionId, onEvent)` using `chatSession.ts`'s (Story 2.2) `CHAT_USER_ID`/`getChatSessionId(record.id)` — the *same* session id every time for this onboarding, giving the agent automatic Memory continuity (per Story 2.2 — this app does nothing extra for that beyond reusing the id).
  - [x] **On stream completion, re-fetch the record fresh before writing anything** (AC 2, 6): if it no longer exists (deleted mid-stream), discard silently, end the SSE stream, write nothing. If its status is no longer `draft` (i.e. it was approved while the response was in flight), discard the revision — do **not** overwrite `plan`/`narrative` — and append one `ActionLogEntry` (`actor: "manager"`, `type: "chat_message"`, `message: "Revision discarded: onboarding was approved before the response arrived"`). Otherwise (still `draft`, normal case): on `invokeAgent` success, update `narrative` to the new text (`plan` — the deterministic non-agent part — is unchanged, per FR-10 only the agent's narrative is revised) and append one `ActionLogEntry` (`type: "chat_message"`, `message: "Plan revised per chat request: \"<message>\""`). On `invokeAgent` failure, leave `narrative`/`plan` untouched, still append one `ActionLogEntry` (`type: "chat_message"`, message: the failure reason) so the *attempt* is auditable even though nothing changed. **Signal the failure differently than `POST /` does:** generation always writes *something* (even a `blocked` record), so its plain `done` event is enough; a failed chat revision leaves the record byte-identical to before the attempt, so the client can't tell "this attempt failed" from "here's the record you already had." Send a distinct `sseWrite(res, "error", { message: <failure reason> })` before ending the stream (no `done` event in this specific case) so Story 2.4's chat UI can unambiguously show an inline error rather than silently doing nothing.
  - [x] Release the chat lock in a `finally` block regardless of outcome, so a failure never permanently wedges that onboarding's queue.
- [x] Task 4: Verify (AC: 1–6)
  - [x] `npm run build`/`typecheck` in `backend/`.
  - [x] Implemented the requested manual scenarios in the endpoint flow; live AgentCore execution is pending an environment with AWS credentials, and is recorded in the debug log.

### Review Findings

- [x] [Review][Patch] Approval can be undone by a later queued chat before an earlier response is applied — AC2/AC4: pending-approval reversion and status revalidation now happen after acquiring the per-onboarding lock, so an earlier in-flight response is discarded before a later queued request can revert the record.

## Dev Notes

- **This story owns all the actual Action Log writing for chat — Story 2.6 does not duplicate it.** FR13 ("chat messages recorded in the Action Log") and FR10 (this story) both touch the exact same synchronous write; splitting the *write* itself across two stories would mean re-opening this story's code later for no reason. Story 2.6 is a verification-only pass confirming these entries render correctly and are distinguishable via Story 1.8's already-existing (generic, unfiltered) Action Log display — the same pattern Story 1.8 itself used for its own AC1/AC4 (verify, don't rebuild).
- **One log entry per completed exchange, not two** (contrast with the *separate* `status_change` entry Story 1.3's `revertToDraft` appends when applicable) — per epics.md's Story 2.6 AC language ("**an** entry exists identifying it as a revision request/response"), singular. A chat message on a `pending_approval` onboarding can legitimately produce *two* log entries total (the revert's `status_change` + this story's `chat_message`) — that's correct and expected, not a duplicate.
- **The revision prompt is new, authored territory — flag it as such, don't treat it as gospel.** Unlike Story 2.1's generation prompt (copied verbatim from `run_narrative.py`'s existing, working text), there is no prior chat-revision prompt anywhere in `dayone` to copy — this capability doesn't exist in the original CLI. The template above is a reasonable first attempt (full current narrative + explicit re-invocation instructions, matching FR-10's "enough context... to re-invoke its existing tools" requirement); treat it as adjustable based on real agent behavior during testing, not as an immutable spec.
- **`plan` vs `narrative`:** this app's `OnboardingRecord` has both a deterministic `plan` (built by `buildOnboardingPlan()`, pure TypeScript, no agent involvement) and an agent-generated `narrative`. A chat revision only ever changes `narrative` — there's no mechanism (or requirement) for the chat to alter the deterministic `plan` string.
- **Don't build a generic cancellation/abort system for AC6.** A simple "re-check existence and status before writing" guard at the point where the revision would be applied is sufficient — there's no explicit requirement to actively cancel the in-flight AgentCore call itself the instant a delete happens (the reference Python client's thread-`stop_event` pattern shows this is *possible* if ever needed, but nothing here requires it for MVP).

### Project Structure Notes

- Files to UPDATE: `backend/src/agentCoreClient.ts` (extract `invokeAgent`), `backend/src/routes/onboardings.ts` (new `/chat` route, per-onboarding lock).
- No new frontend files in this story — Story 2.4 owns the chat UI and its `api/client.ts` function.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3: Conversational Plan Revision Endpoint & Streaming]
- [Source: _bmad-output/planning-artifacts/prds/prd-onboarding-backoffice-2026-07-17/prd.md#FR-10, FR-16]
- [Source: _bmad-output/implementation-artifacts/2-1-replace-subprocess-with-agentcore-runtime-sdk-for-plan-generation.md] — `agentCoreClient.ts` to refactor
- [Source: _bmad-output/implementation-artifacts/2-2-agentcore-memory-based-session-continuity-for-chat.md] — `chatSession.ts`'s `CHAT_USER_ID`/`getChatSessionId`
- [Source: _bmad-output/implementation-artifacts/1-3-manual-submission-for-approval-with-atomic-race-safety.md] — `revertToDraft`, called synchronously at message-send time
- [Source: backend/src/store.ts] — `OnboardingRecord`'s `plan` vs `narrative` distinction

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

- 2026-07-22: Initial sandboxed `npm test` was blocked by `tsx` IPC `listen EPERM`; elevated test execution passed.
- 2026-07-22: Live AgentCore verification was unavailable because AWS credentials are not configured in this environment.

### Completion Notes List

- Extracted shared `invokeAgent` SDK invocation and NDJSON/SSE parsing; `runNarrative` now maps the shared text result to `narrative`.
- Added per-onboarding in-memory chat serialization and `POST /api/onboardings/:id/chat` with draft/pending-approval validation, automatic revert, streaming progress, and terminal events.
- Added fresh-store application guards for deleted, approved, successful, and failed in-flight revisions; chat attempts are recorded in the Action Log without changing the plan on failure.
- Backend `typecheck`, `npm test` (6 tests), and `npm run build` pass. Live AWS/AgentCore smoke testing remains unavailable due to missing credentials.
- Resolved code review finding: serialized pending-approval reversion with the chat lock to preserve the approved-state late-response guard.

### File List

- `backend/src/agentCoreClient.ts`
- `backend/src/agentCoreClient.test.ts`
- `backend/src/routes/onboardings.ts`
- `backend/src/store.ts`

### Change Log

- 2026-07-22: Implemented conversational plan revision endpoint, shared AgentCore invocation, per-onboarding queue, streaming relay, and safe late-result handling.
- 2026-07-22: Addressed code review finding for approval/chat queue ordering.
