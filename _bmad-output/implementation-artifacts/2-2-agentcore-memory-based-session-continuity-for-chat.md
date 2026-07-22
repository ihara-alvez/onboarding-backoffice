# Story 2.2: AgentCore Memory-Based Session Continuity for Chat

---
baseline_commit: 820e85e272a0f87360aae75fb05c8d8e9b83b44a
---

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a manager,
I want my chat conversation with the agent to remember earlier turns within the same onboarding,
so that I don't have to repeat context every message.

## Acceptance Criteria

1. Given a chat session on one onboarding, when multiple messages are sent, then they share one stable `userId`/`sessionId` pair for that onboarding's chat lifetime.
2. Given two different onboardings' chats are active, when either sends a message, then they use distinct `sessionId`s and never see each other's context.
3. Given the deployment's AgentCore Memory resource (`MEMORY_ID`, confirmed configured), when a chat message is sent, then past turns are available to the agent — continuity is not automatic from reusing `sessionId` alone at the SDK-call level, but **is** automatic once `sessionId` is reused consistently (see Dev Notes — this is handled entirely server-side by the deployed agent, not by this app).
4. Given the deployment's `MEMORY_ID` were ever unset, when a chat is used, then the agent runs without history rather than erroring — a deployment-configuration risk this app logs but cannot compensate for.
5. Given an onboarding's chat accumulates messages across repeated auto-revert-to-draft and blocked↔draft retry cycles, then no cap or reset is implemented for this MVP — unbounded accumulation is accepted as-is.

## Tasks / Subtasks

- [x] Task 1: Session/user id scheme as a tiny shared module (AC: 1, 2)
  - [x] Create `backend/src/chatSession.ts` exporting: `CHAT_USER_ID = "backoffice-manager"` (fixed placeholder — no manager auth exists) and `getChatSessionId(onboardingId: string): string` — returns `onboardingId` directly. The onboarding's own `id` (a `crypto.randomUUID()`, 36 characters) already clears the AgentCore `runtimeSessionId` 33+ character minimum, so no padding/transformation is needed, just reuse it verbatim.
  - [x] Story 2.3 will import `CHAT_USER_ID`/`getChatSessionId` and pass them as the `runtimeSessionId` (top-level SDK param) *and* the payload's `userId`/`sessionId` fields on every chat call for that onboarding — that consistent reuse **is** the entire continuity mechanism from this app's side.
- [x] Task 2: Verify the mechanism actually works (AC: 1, 2, 3)
  - [x] No chat UI/endpoint exists yet (Story 2.3 builds it) — verify with a scratch script: call `InvokeAgentRuntimeCommand` twice using the **same** `runtimeSessionId`/`sessionId` (e.g. a throwaway UUID standing in for an onboarding id), first asking the agent to remember a fact, second asking it to recall that fact — confirm the second response reflects it. Then repeat with two **different** session ids and confirm no cross-contamination. Live verification passed with the `bedrock-workshop-iam` profile: the same session recalled `cobalt-orchid-7`, while a different session did not see `alpha-lantern-4`.
- [x] Task 3: Documentation-only — no code (AC: 3, 4, 5)
  - [x] No action needed for AC4 (MEMORY_ID is confirmed configured for this deployment, per `addendum.md`'s citation of `dayone/agentcore/cdk/cdk-outputs.json`) or AC5 (already a documented, accepted MVP decision) — this task exists only to confirm these are not silently forgotten, not to write new code.

## Dev Notes

- **The single most important thing to understand before touching this story: this app does NOT implement AgentCore Memory's `list_events`/`create_event` calls itself.** Reading `dayone/agentcore/agent/my_agent.py`'s `MemoryHook` (read-only reference) shows the *deployed agent* already does this automatically, server-side, keyed off `context.session_id` (which the AgentCore SDK derives from the `runtimeSessionId` parameter you pass to `InvokeAgentRuntimeCommand` — **not** from the payload's `sessionId` field, which the reference client only includes "for usage logs" per its own comment). This app's entire responsibility for Memory continuity is: **pass the same `runtimeSessionId` on every call for one onboarding's chat.** That's it. Do not write a Node-side Memory client, do not call any `bedrock-agentcore` memory APIs directly from this backend — attempting to would be duplicating logic the deployed agent already owns, and this app has no `MEMORY_ID`/memory-service credentials wired for that purpose anyway.
- **Why `sessionId` = the onboarding's own `id` and not something else:** it's already a stable, unique, 36-character UUID that exists for the onboarding's entire lifetime, satisfies the 33+ character minimum with zero transformation, and naturally gives one onboarding one continuous chat session (AC2) with no additional bookkeeping.
- **This is a genuinely small, focused story** — most of the "work" FR15 implies is already built into the deployed agent. Resist the temptation to build more here (e.g. a local cache of conversation history, a memory-inspection endpoint) — nothing in the PRD asks for it, and Story 2.3 is where the actual chat request/response wiring happens.

### Project Structure Notes

- File to CREATE: `backend/src/chatSession.ts` (two tiny exports, no dependencies beyond what Story 2.1 already added).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2: AgentCore Memory-Based Session Continuity for Chat]
- [Source: _bmad-output/planning-artifacts/prds/prd-onboarding-backoffice-2026-07-17/prd.md#FR-15]
- [Source: _bmad-output/planning-artifacts/prds/prd-onboarding-backoffice-2026-07-17/addendum.md] — session/user id scheme, MEMORY_ID confirmation
- [Source: /home/ialvez/workspace/dayone/agentcore/agent/my_agent.py] — `MemoryHook`, confirms continuity is agent-side and keyed off `context.session_id` (read-only reference)
- [Source: _bmad-output/implementation-artifacts/2-1-replace-subprocess-with-agentcore-runtime-sdk-for-plan-generation.md] — the AgentCore client/SDK setup this story's session-id module will be used alongside

## Dev Agent Record

### Agent Model Used

### Debug Log References

- 2026-07-22: Initial sandboxed `npm test` was blocked by `tsx` IPC `listen EPERM`; elevated run passed all 6 tests.
- 2026-07-22: Live AgentCore smoke script could not load credentials (`CredentialsProviderError`), so Task 2 remains open.
- 2026-07-22: Re-ran the live smoke script after Story 2.3 added the chat endpoint and shared session wiring; it still stopped before invocation because no AWS credentials were available.
- 2026-07-22: Live smoke verification passed with `AWS_PROFILE=bedrock-workshop-iam`; same-session recall succeeded and different-session isolation succeeded.

### Completion Notes List

- Added a shared chat session module that uses the fixed manager placeholder and returns each onboarding UUID unchanged for both AgentCore runtime and payload session identifiers.
- Added Node tests covering stable reuse and cross-onboarding isolation. The deployed AgentCore Memory continuity behavior remains owned by the runtime's server-side MemoryHook; no direct Memory API calls were added.
- Verified the configured MEMORY_ID and accepted unbounded accumulation decisions from the existing deployment addendum; no app-side fallback, cap, or reset was introduced.
- Live AgentCore verification passed using the configured `bedrock-workshop-iam` profile: repeated turns on one session retained context, while separate sessions remained isolated.

### File List

- `backend/src/chatSession.ts`
- `backend/src/chatSession.test.ts`
- `backend/package.json`

### Change Log

- 2026-07-22: Added shared AgentCore chat session/user id module and local coverage; live continuity and isolation verification passed; story moved to `review`.
