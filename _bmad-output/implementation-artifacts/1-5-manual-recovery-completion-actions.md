---
baseline_commit: 99f99a43fe096c39d4c2aa36e58653f0ae58f11f
---

# Story 1.5: Manual Recovery & Completion Actions

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a manager,
I want to manually retry a blocked onboarding and mark an in-progress onboarding complete,
so that I can recover from generation failures and close out finished onboardings myself.

## Acceptance Criteria

1. Given a `blocked` onboarding, when the manager retries generation, then status returns to `draft` on success, or remains/returns to `blocked` on repeat failure, and the Action Log records the retry attempt and its outcome.
2. Given an `in_progress` onboarding, when the manager marks it complete, then status becomes `completed` and the Action Log records the action and timestamp.
3. Given an onboarding not in `blocked`, when retry-generation is attempted, then the action is rejected.
4. Given an onboarding not in `in_progress`, when mark-complete is attempted, then the action is rejected.

## Tasks / Subtasks

- [x] Task 1: Extract the shared SSE-generation helper (AC: 1) — do this before duplicating the logic
  - [x] In `backend/src/routes/onboardings.ts`, extract the existing `POST /` handler's SSE boilerplate (the `res.writeHead(...)`, `collectedEvents`/`onEvent`, final `sseWrite(res, "done", ...)` + `res.end()`) into a shared function, e.g. `streamGeneration(res, args: NarrativeArgs, buildRecord: (outcome: NarrativeOutcome, events: ProgressEvent[]) => OnboardingRecord): Promise<void>`. Both `POST /` and this story's new retry route will call it — avoids duplicating the SSE relay logic verbatim across two handlers.
- [x] Task 2: Retry-generation endpoint (AC: 1, 3)
  - [x] Add `retryGeneration` handling: a new `POST /api/onboardings/:id/retry` route. Do the status check (`getOnboarding(id)?.status === "blocked"`) as plain synchronous validation *before* calling `streamGeneration` — same reasoning as the existing `POST /` handler's pre-stream validation (headers can't downgrade to a JSON error once an SSE stream starts). Return 404/409 JSON errors for not-found/wrong-status, matching the pattern established in Story 1.3.
  - [x] **Reuse the record's already-stored `profile`/`project` snapshot** (`record.profile`, `record.project`) to rebuild the plan via `buildOnboardingPlan()` — do **not** re-fetch fresh YAML via `getProfile`/`getProject` for the retry. This follows the existing "snapshot at creation time" rule (`_bmad-output/project-context.md`): the onboarding's snapshot was already taken once, at original creation; a retry re-attempts *generation*, it doesn't re-snapshot.
  - [x] Re-invoke `runNarrative({ employeeName, employeeEmail, profileId, projectId }, onEvent)` — same call shape as the original creation. On success: `status: "draft"`, `narrative`: the new narrative, `narrativeError: undefined`, append an `ActionLogEntry` (`actor: "manager"`, `type: "retry"`, `fromStatus: "blocked"`, `toStatus: "draft"`, `message: "Retry succeeded"`). On failure: `status: "blocked"` (unchanged), `narrativeError`: the new error, append an `ActionLogEntry` (`type: "retry"`, `toStatus: "blocked"`, `message`: the failure reason) — same "exactly one entry, use `retry` type to carry both the transition and the reason" pattern Story 1.2 established for `generation_failure`.
- [x] Task 3: Mark-complete endpoint (AC: 2, 4)
  - [x] In `backend/src/store.ts`, add `markCompleted(id: string): { ok: true; record: OnboardingRecord } | { ok: false; error: string }`. **Check `computeEffectiveStatus(record) === "in_progress"`, not the raw stored `status` field** (Story 1.4's read-time flip means a `ready_for_day_1` record whose start date has passed is *effectively* `in_progress` even though the stored value hasn't changed — this function must honor that or it will wrongly reject valid completions). Reject otherwise. On success: `status: "completed"`, append an `ActionLogEntry` (`actor: "manager"`, `type: "status_change"`, `fromStatus: "in_progress"`, `toStatus: "completed"`, `message: "Marked complete"`).
  - [x] Add `POST /api/onboardings/:id/complete` route calling `markCompleted()`, same 404/409/200 mapping pattern as the other action routes.
- [x] Task 4: Frontend (AC: 1, 2, 3, 4)
  - [x] In `frontend/src/api/client.ts`, extract the SSE-frame-parsing loop already inside `createOnboardingWithProgress` (from the `reader.read()` loop onward) into a shared helper, e.g. `streamRequest<T>(url, options, onProgress): Promise<T>`, and rewrite `createOnboardingWithProgress` to call it. Add `retryGeneration(id: string, onProgress): Promise<OnboardingRecord>` calling the same helper against `POST /api/onboardings/:id/retry`.
  - [x] Add `markCompleted(id: string): Promise<OnboardingRecord>` to `client.ts` (`POST` to `/complete`, plain `handle<OnboardingRecord>`, no streaming needed).
  - [x] In `frontend/src/pages/OnboardingDetailPage.tsx`: add a "Retry generation" `Button`, visible when `record.status === "blocked"`. Keep it simple — a loading/disabled state while the SSE call is in flight (mirror the existing `approving`/`deleting` boolean pattern), discarding or ignoring the intermediate progress events; **don't** rebuild `CreateOnboardingPage`'s full live-console UI here, that's scope beyond what any AC requires.
  - [x] Add a "Mark complete" `Button`, visible when the record's status (as returned by the API, which is already the *effective* status per Story 1.4) is `"in_progress"`.
- [x] Task 5: Verify (AC: 1, 2, 3, 4)
  - [x] `npm run build`/`typecheck` (backend), `npm run build`/`lint` (frontend).
  - [x] Manually force a `blocked` onboarding (per Story 1.2's verification approach), click Retry with `DAYONE_REPO_PATH` fixed, confirm it lands in `draft`. Manually get an onboarding to `in_progress` (approve with a past `startDate`, per Story 1.4), click Mark Complete, confirm `completed`.

### Review Findings

- [x] [Review][Patch] Guard shared SSE generation and persistence failures [backend/src/routes/onboardings.ts:37-59] — `streamGeneration` now emits a terminal SSE error and closes the response when `runNarrative`, record construction, or `saveOnboarding`/`updateOnboarding` fails; the client surfaces that error.
- [x] [Review][Defer] Concurrent retry requests can overwrite each other's full-record updates [backend/src/routes/onboardings.ts:128-176] — deferred, pre-existing local JSON store has no concurrency control and the project context explicitly scopes it to single-user demo use.
- [x] [Review][Defer] Retry and completion routes have no authentication/authorization guard [backend/src/routes/onboardings.ts:128-192] — deferred, the application currently has no authentication layer and existing state-changing routes use the same trust model.

## Dev Notes

- **Retry is a full re-generation, not just an error clear.** It re-runs both `buildOnboardingPlan` (cheap, deterministic, using the *stored* profile/project snapshot) and `runNarrative` (the actual agent call that failed before) — exactly mirroring the original creation flow, just against an existing record instead of a new one.
- **Why SSE for retry too:** the same 40-second-capable agent call that justified streaming for initial creation applies identically here — a blind 40-second spinner would be a worse experience than what already exists for creation. Task 1's extraction exists specifically so this story doesn't duplicate that relay logic.
- **`computeEffectiveStatus` reuse is the single most important correctness detail in this story** (see Story 1.4). If `markCompleted()` checks the raw `status` field instead, a manager who approved an onboarding with a future date, then waited past that date, would find "Mark complete" permanently unavailable even though the onboarding is visibly `in_progress` everywhere else in the UI.
- **`retry` vs `generation_failure` vs `status_change` action-log types:** all three represent a transition (`toStatus` set) per Story 1.1's design; `retry` specifically means "this was a manager-initiated re-attempt," distinguishing it from the original `generation_failure` (system-initiated, at creation) it's recovering from.
- No new dependencies. No changes to `pythonBridge.ts` — `runNarrative()`'s signature and behavior are reused as-is.

### Project Structure Notes

- Files to UPDATE: `backend/src/routes/onboardings.ts` (extract shared streaming helper, add retry + complete routes), `backend/src/store.ts` (add `markCompleted`), `frontend/src/api/client.ts` (extract shared SSE-parsing helper, add `retryGeneration`/`markCompleted`), `frontend/src/pages/OnboardingDetailPage.tsx` (two new buttons).
- No new files, no new dependencies.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.5: Manual Recovery & Completion Actions]
- [Source: _bmad-output/planning-artifacts/prds/prd-onboarding-backoffice-2026-07-17/prd.md#FR-5]
- [Source: backend/src/routes/onboardings.ts] — existing `POST /` SSE handler to extract from
- [Source: backend/src/pythonBridge.ts] — `runNarrative`/`NarrativeOutcome`, reused unchanged
- [Source: backend/src/planBuilder.ts] — `buildOnboardingPlan`, reused with the stored snapshot
- [Source: frontend/src/api/client.ts] — `createOnboardingWithProgress`'s SSE-parsing loop to extract
- [Source: _bmad-output/project-context.md] — snapshot-at-creation-time rule (retry must not re-snapshot), SSE pre-validation rule
- [Source: _bmad-output/implementation-artifacts/1-4-approve-action-automatic-post-approval-transitions.md] — `computeEffectiveStatus`, which this story's `markCompleted` must use

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

- Backend typecheck initially caught widened `status` literals in the retry record; explicitly typed the updated record as `OnboardingRecord`.
- No test framework is configured in this repository, so validation used the configured backend and frontend build/type/lint commands.

### Implementation Plan

- Extract one backend SSE relay for initial creation and retry, with each caller supplying record construction/persistence behavior.
- Add blocked-only retry generation using stored profile/project snapshots and append a manager retry action log entry for either outcome.
- Add effective-status-aware completion persistence and expose both actions through the API client and detail page controls.

### Completion Notes List

- Added `POST /api/onboardings/:id/retry` with pre-stream 404/409 validation, snapshot-based plan rebuilding, narrative retry, and retry outcome logging.
- Added `markCompleted()` and `POST /api/onboardings/:id/complete`, including the `ready_for_day_1` to effective `in_progress` date flip.
- Shared backend/frontend SSE handling between creation and retry; added disabled loading states and status-gated detail-page buttons.
- Code review patch applied: shared SSE generation now emits terminal error events and closes the response on generation or persistence failures; the frontend surfaces those errors.
- Validation passed: backend `npm run typecheck`, `npm run build`; frontend `npm run build`, `npm run lint`.

### File List

- `backend/src/routes/onboardings.ts`
- `backend/src/store.ts`
- `frontend/src/api/client.ts`
- `frontend/src/pages/OnboardingDetailPage.tsx`

### Change Log

- 2026-07-21: Implemented manual recovery and completion actions; validated backend and frontend quality checks.
- 2026-07-21: Addressed code review finding for terminal SSE error handling.
