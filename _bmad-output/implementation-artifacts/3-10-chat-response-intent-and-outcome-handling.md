---
baseline_commit: 04bccf8
---

# Story 3.10: Chat Response Intent and Outcome Handling

Status: ready-for-dev

## Story

As a manager,
I want responses to unrelated prompts to explain that they are out of scope,
so that the UI does not claim that an onboarding plan changed when it did not.

## Acceptance Criteria

1. Given a prompt unrelated to the onboarding process or plan, when the agent responds, then the transcript shows a clear out-of-scope or informational response and does not show `Plan updated`.
2. Given a prompt produces a valid onboarding-plan revision, when the revision is applied, then the success response may show `Plan updated` and the revised plan is displayed.
3. Given a prompt cannot be classified or the agent reports an error, when the response completes, then the chat shows an error or clarification state, preserves the previous plan, and does not claim success.
4. Given the response is classified, when the frontend renders the result, then it uses an explicit response/result contract rather than client-side keyword guessing.

## Tasks / Subtasks

- [ ] Define an explicit chat outcome contract shared across backend/frontend (AC: 1–4)
  - [ ] Model distinct revision-applied, informational/out-of-scope, clarification, and failure outcomes without using message-text keyword inference.
  - [ ] Preserve the existing record payload for successful revisions and make the outcome available in the stream completion/error contract.
- [ ] Classify and persist backend outcomes (AC: 1–3)
  - [ ] Update the AgentCore chat prompt/response handling or adapter so the classification is explicit and validated before mutating the stored record.
  - [ ] Apply a plan/action-log update only for a valid revision; unrelated, ambiguous, and failed responses must leave the previous plan intact.
  - [ ] Keep SSE validation and headers safe: all synchronous validation occurs before `writeHead`, and terminal events remain unambiguous.
- [ ] Render outcome-specific transcript states (AC: 1–4)
  - [ ] Replace the current assumption that every `chat_message` entry is a successful revision.
  - [ ] Render success, informational/out-of-scope, clarification, and failure copy from typed outcome data.
  - [ ] Ensure only the revision-applied outcome can display `Plan updated`.
- [ ] Verify regressions and contracts
  - [ ] Add/update backend tests for each outcome and preservation of the prior record on non-revision outcomes, using the existing test approach.
  - [ ] Run backend build/typecheck/tests and frontend build/lint.

## Dev Notes

### Current implementation and risk

- `backend/src/routes/onboardings.ts` currently sends the manager prompt to AgentCore, calls `applyChatRevision`, and emits `done` with an `OnboardingRecord` or `error` with a string. It does not carry an explicit intent/outcome classification.
- `backend/src/store.ts` currently records successful chat messages using the message format `Plan revised per chat request: "..."`; `frontend/src/components/ChatPanel.tsx` parses that string with a regex and treats every other chat-log message as failed/discarded. This is precisely the keyword/string coupling to remove or isolate behind a typed contract.
- `frontend/src/api/client.ts` currently casts the SSE `done` data directly to `OnboardingRecord`; `frontend/src/api/types.ts` has no chat-result type. Introduce the smallest explicit type compatible with the existing record flow and update the caller in `OnboardingDetailPage.tsx`.

### Contract guidance

- Prefer a discriminated union such as `revision_applied`, `informational`, `clarification`, and `error` with outcome-specific fields. The exact field names may follow the repository's conventions, but the discriminator must be machine-readable and validated.
- A successful revision outcome must include the updated persisted record (or an explicitly documented record reference followed by a fetch); informational/clarification outcomes must not include a misleading updated record.
- A backend/agent transport error is not an informational response. It must surface as an error/clarification state, preserve the previous plan, and avoid a success log entry.
- Do not have the frontend inspect phrases such as “updated”, “out of scope”, or “failed” to infer intent. Copy can be human-readable, but state selection must come from the discriminator.
- Keep the existing chat lock, approval race handling, session ID, AgentCore Memory behavior, streamed progress events, and read-only-after-approval guard unchanged unless a contract change requires a narrowly scoped adapter update.

### Storage and audit rules

- `OnboardingRecord.plan`/`narrative` and profile/project snapshots are historical data. Non-revision outcomes must not rewrite them.
- Action log entries must accurately describe the outcome. Do not record an apparent plan revision for an unrelated, rejected, or failed prompt.
- Preserve the existing discarded-after-approval behavior and make it a typed outcome if it is still emitted; do not silently turn it into success.
- No new external notification, permission provisioning, or real approval workflow is in scope.

### Architecture and project conventions

- Backend route handlers remain thin; validation/business logic belongs in `store.ts` or a focused chat outcome module, with discriminated-union fallible results rather than uncaught throws.
- SSE routes must perform all synchronous validation and risky pre-stream work before headers are sent. Once streaming begins, use the existing `progress`, `done`, and `error` event pattern with a documented terminal payload.
- Shared backend/frontend data shapes live in the existing centralized types files; do not create barrel files or add a second API client.
- Existing test files (`backend/src/chatSession.test.ts`, `backend/src/agentCoreClient.test.ts`) show the configured test approach. No new test framework is needed.

### Expected files

- Likely update: `backend/src/routes/onboardings.ts`, `backend/src/store.ts`, `backend/src/types.ts`, `frontend/src/api/client.ts`, `frontend/src/api/types.ts`, `frontend/src/components/ChatPanel.tsx`, `frontend/src/pages/OnboardingDetailPage.tsx`.
- Add a focused module only if the existing store/route boundaries become unclear; avoid broad refactors.
- Update this story file and `sprint-status.yaml` as part of the implementation workflow.

### Previous story and git intelligence

- Stories 2.3, 2.5, and 2.6 established the streamed chat path, read-only-after-approval behavior, and action-log recording. Preserve those contracts while making outcomes explicit.
- Story 3.8's current ChatPanel still displays a hard-coded successful “Plan updated” row for the regex-matched revision shape; this story must address that false-success risk before adding refresh behavior in Story 3.11.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story 3.10: Chat Response Intent and Outcome Handling`]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/DESIGN.md#Epic 3 Follow-up Enhancements`]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/EXPERIENCE.md#Key Flows`]
- [Source: `_bmad-output/planning-artifacts/prds/prd-onboarding-backoffice-2026-07-17/prd.md#FR-10: Manager Revision Chat`]
- [Source: `_bmad-output/planning-artifacts/prds/prd-onboarding-backoffice-2026-07-17/prd.md#FR-16: Streaming relay preserved`]
- [Source: `backend/src/routes/onboardings.ts`]
- [Source: `backend/src/store.ts`]
- [Source: `frontend/src/components/ChatPanel.tsx`]
- [Source: `_bmad-output/project-context.md#Critical Implementation Rules`]

## Dev Agent Record

### Agent Model Used

Codex GPT-5

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story context includes the current SSE, AgentCore, action-log, and frontend rendering contracts plus the false-success failure mode that motivated this story.

### File List

- `_bmad-output/implementation-artifacts/3-10-chat-response-intent-and-outcome-handling.md`

