---
baseline_commit: 69523d5694c3678e5d988ab56af9788be0f9e5d9
---

# Story 1.3: Manual Submission for Approval with Atomic Race Safety

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a manager,
I want to explicitly send a `draft` onboarding for approval,
so that I signal the plan is final without anyone approving an unfinished draft by mistake.

## Acceptance Criteria

1. Given a `draft` onboarding, when the manager clicks "Send for approval," then status becomes `pending_approval` and an Action Log entry records it.
2. Given a `pending_approval` onboarding, when a plan revision is applied instead of approving (the trigger itself, chat, is Epic 2 scope — this verifies the status service behaves correctly when invoked), then status automatically reverts to `draft` and the Action Log records the reversion.
3. Given a revert-to-draft and an Approve click happen at nearly the same moment, when the status change is written, then whichever completes first wins atomically — status is re-checked at write time, never cached from an earlier read. If the revert wins, the pending Approve attempt fails with an explicit "plan changed, please review again" error rather than silently applying or no-oping.
4. Given an onboarding not in `draft`, when "Send for approval" is attempted, then the action is rejected.

## Tasks / Subtasks

- [x] Task 1: `sendForApproval` and `revertToDraft` store functions (AC: 1, 2, 4)
  - [x] In `backend/src/store.ts`, add `sendForApproval(id: string): { ok: true; record: OnboardingRecord } | { ok: false; error: string }`: reject (return `ok: false`) if the record doesn't exist or `status !== "draft"`; otherwise set `status: "pending_approval"`, append an `ActionLogEntry` (`actor: "manager"`, `type: "status_change"`, `fromStatus: "draft"`, `toStatus: "pending_approval"`, `message: "Sent for approval"`), write, return `ok: true`.
  - [x] Add `revertToDraft(id: string, reason: string): { ok: true; record: OnboardingRecord } | { ok: false; error: string }`: reject if the record doesn't exist or `status !== "pending_approval"`; otherwise set `status: "draft"`, append an `ActionLogEntry` (`actor: "manager"`, `type: "status_change"`, `fromStatus: "pending_approval"`, `toStatus: "draft"`, `message: reason`), write, return `ok: true`. **Nothing calls this yet** — Epic 2's Story 2.3 (chat message handling) will call it directly as an imported function when a manager sends a chat message on a `pending_approval` onboarding. No route/endpoint for it in this story.
- [x] Task 2: Tighten and harden the approve gate (AC: 3)
  - [x] Change `approveOnboarding()` in `backend/src/store.ts` to return the same discriminated-result shape as Task 1's functions, and move its status guard from Story 1.1's placeholder (`!== "draft"`) to `!== "pending_approval"`. On rejection, return `{ ok: false, error: "Cannot approve: plan changed, please review again" }` — reuse this exact message for any non-`pending_approval` status at approve time (see Dev Notes for why one message covers both "never sent for approval" and "reverted mid-race").
  - [x] Keep `approveOnboarding()`'s status write as Story 1.1's placeholder value (`"ready_for_day_1"`) for now — Story 1.4 replaces it with real `start_date`-conditional branching. This story only tightens the gate and return shape, not the transition logic.
  - [x] Update `backend/src/routes/onboardings.ts`'s `POST /:id/approve` handler to match the new return shape: call `approveOnboarding(id)` directly (remove the existing separate `getOnboarding()` precheck + `existing.status === "approved"` idempotency shortcut entirely — see Dev Notes on why this is an intentional behavior change, not a regression). Map `{ ok: false }` to 404 if the error is a not-found message, otherwise 409; map `{ ok: true }` to 200 with `result.record`.
- [x] Task 3: New "Send for approval" endpoint (AC: 1, 4)
  - [x] Add `POST /api/onboardings/:id/send-for-approval` in `backend/src/routes/onboardings.ts`, calling `sendForApproval()` and mapping its result the same way as Task 2's approve handler (404 not-found, 409 wrong-status, 200 success).
- [x] Task 4: Frontend — new action and updated gating (AC: 1, 4)
  - [x] Add `sendForApproval(id: string): Promise<OnboardingRecord>` to `frontend/src/api/client.ts`, mirroring the existing `approveOnboarding()` pattern (`POST` to the new endpoint, `handle<OnboardingRecord>`).
  - [x] In `frontend/src/pages/OnboardingDetailPage.tsx`: add a "Send for approval" `Button`, visible when `record.status === "draft"`, with its own loading state (mirror `approving`/`handleApprove`'s structure). On success, update local state via `setRecord(updated)` — do **not** navigate away (contrast with `handleApprove`, which does navigate); the manager stays on the page to then click Approve.
  - [x] Change the existing Approve button's visibility guard from `record.status === "draft"` (Story 1.1's placeholder) to `record.status === "pending_approval"` — approve is no longer directly reachable from `draft`.
  - [x] No change needed to `handleApprove`'s error handling — `client.ts`'s `handle<T>()` already throws on any non-2xx response using the JSON body's `error` field, so the new "plan changed, please review again" message surfaces through the existing `catch (err) { setError(...) }` path with zero additional frontend error-handling code.
- [x] Task 5: Verify (AC: 1, 2, 3, 4)
  - [x] `npm run build`/`typecheck` (backend), `npm run build`/`lint` (frontend).
  - [x] Manually verify via the running app: create an onboarding (lands in `draft` per Story 1.2), click "Send for approval" (status → `pending_approval`, Approve button now visible), click Approve (status → `ready_for_day_1`, still Story 1.1's placeholder — full date logic is Story 1.4).
  - [x] `revertToDraft()` has no UI trigger yet (Epic 2 wires it) — verify it directly with a scratch script, e.g. `npx tsx -e '...'` importing `sendForApproval`/`revertToDraft`/`getOnboarding` from `store.ts` and asserting the status/log-entry results, consistent with this project having no test framework configured.
  - [x] Verify AC4's rejection path by calling `sendForApproval` twice in a row on the same record (second call should return `ok: false` since status is no longer `draft`).

## Dev Notes

- **Why the race-safety requirement is already satisfied by this app's existing style, if you don't break it.** `store.ts`'s `readAll`/`writeAll` use `fs.readFileSync`/`fs.writeFileSync` (synchronous), and every store function here does its read → status-check → mutate → write with **no `await` in between**. Node.js runs one request handler's synchronous code to completion before starting another's — so as long as `sendForApproval`, `revertToDraft`, and `approveOnboarding` each keep their read-check-write as one unbroken synchronous block (no `await`, no I/O yield), two "simultaneous" HTTP requests hitting them are naturally serialized by the event loop: whichever function's synchronous block runs first commits, and the second one's own status check (against the now-updated file) correctly sees the new state and rejects. **Do not introduce an `await` between reading the record and writing it back** in any of these three functions — that's the one way to reintroduce the race this story exists to prevent. (`_bmad-output/project-context.md` separately notes the JSON file store has "no concurrency control" for true multi-process concurrent writers — that caveat is about e.g. two separate `node` processes, not about this single-process, single-threaded synchronous-block guarantee, which is what actually protects this specific race.)
- **The race in practice:** Epic 2's Story 2.3 will call `revertToDraft()` synchronously, immediately upon receiving a chat message on a `pending_approval` onboarding — *before* the slow, async agent call even starts (per FR-10/FR-3: the revert is triggered by *sending* the message, not by the agent's eventual response). That immediate, synchronous revert is what makes it race-safe against a concurrent Approve click; this story's job is to make sure `approveOnboarding()`'s own read-check-write is equally tight so whichever request's synchronous block actually runs first wins cleanly.
- **One error message covers two different-looking but store-indistinguishable cases.** If someone calls approve on a `draft` onboarding that was *never* sent for approval, vs. one that *was* `pending_approval` but just got reverted by a race — both look identical to `approveOnboarding()` at read time (`status === "draft"`). The store layer cannot and should not try to distinguish "never sent" from "reverted mid-race" (there's nothing to distinguish them by). Use the PRD's exact specified message, "plan changed, please review again," for both — in normal UI usage this guard is defensive-only anyway, since the Approve button is only ever rendered when `status === "pending_approval"` (Task 4); a manager can only hit this error via a genuine race or a direct API call.
- **This is an intentional behavior change, not a regression.** Today's `/approve` endpoint silently returns 200 with the existing record if it's already `"approved"` (see the `existing.status === "approved"` shortcut being removed in Task 2). FR-3 explicitly requires tightening this: approval is *only* valid from `pending_approval`. The new behavior — reject with 409 if not `pending_approval` — is the PRD's stated requirement, not an accidental break of existing idempotency.
- **Don't implement `revertToDraft`'s trigger (chat) in this story.** It's a pure store-layer function with no caller yet. Resist the urge to wire a route/endpoint for it "so it's testable through the UI" — Epic 2 owns that wiring, and adding a premature endpoint here would need to be un-done or reconciled with Story 2.3's design later.
- **Don't implement Story 1.4's start-date branching here.** `approveOnboarding()`'s status write stays the literal string `"ready_for_day_1"` — a placeholder, same as Story 1.1 left it. Only the *gate* (`pending_approval` requirement) and *return shape* (discriminated result) belong to this story.

### Project Structure Notes

- Files to UPDATE: `backend/src/store.ts` (add `sendForApproval`/`revertToDraft`, refactor `approveOnboarding`), `backend/src/routes/onboardings.ts` (new route, refactor `/approve` handler), `frontend/src/api/client.ts` (new `sendForApproval`), `frontend/src/pages/OnboardingDetailPage.tsx` (new button, updated Approve guard).
- No new files, no new dependencies.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3: Manual Submission for Approval with Atomic Race Safety]
- [Source: _bmad-output/planning-artifacts/prds/prd-onboarding-backoffice-2026-07-17/prd.md#FR-3]
- [Source: backend/src/store.ts] — existing `approveOnboarding`, `readAll`/`writeAll` synchronous pattern
- [Source: backend/src/routes/onboardings.ts] — existing `/approve` route and its current pre-check pattern to remove
- [Source: frontend/src/api/client.ts] — `handle<T>()`'s existing error-surfacing behavior (no changes needed there)
- [Source: frontend/src/pages/OnboardingDetailPage.tsx] — `handleApprove`, its button, and where the new button/guard change goes
- [Source: _bmad-output/implementation-artifacts/1-1-six-state-status-model-migration-log-schema.md] — `ActionLogEntry` schema, Story 1.1's placeholder values this story replaces/builds on
- [Source: _bmad-output/project-context.md] — route handlers must not throw uncaught, discriminated-union result pattern for fallible operations

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Debug Log References

- Live `tsx` execution is blocked by the sandbox IPC permission; the same scratch verification passes with elevated IPC permissions.

### Completion Notes List

- Implemented synchronous, discriminated-result store transitions for sending, reverting, and approving onboarding plans.
- Added status-change action log entries for send-for-approval and revert-to-draft operations.
- Added the send-for-approval API route/client action and updated frontend button gating/loading behavior.
- Verified store race-safety sequence with a temporary scratch record; backend typecheck/build and frontend build/lint pass.
- Applied code-review patches for route error shaping and concurrent delete/send UI actions.

### File List

- `backend/src/store.ts`
- `backend/src/routes/onboardings.ts`
- `frontend/src/api/client.ts`
- `frontend/src/pages/OnboardingDetailPage.tsx`

### Change Log

- 2026-07-21: Implemented manual submission for approval with atomic synchronous status guards and frontend action gating.
- 2026-07-21: Addressed code review findings — 2 patches resolved; 2 pre-existing persistence/concurrency concerns deferred.

### Review Findings

- [x] [Review][Patch] Approval transition routes allow synchronous store errors to escape uncaught [backend/src/routes/onboardings.ts:117-132] — project-context requires route handlers to catch risky synchronous work and return an `{ error: string }` JSON response; both `POST /:id/approve` and the new `POST /:id/send-for-approval` call `readAll()`/`writeAll()` through the store without a `try/catch`, so malformed or unreadable store data can throw out of the handler instead of being shaped into the required error response. Fixed by returning HTTP 500 JSON errors from both handlers.
- [x] [Review][Patch] Delete remains enabled while send-for-approval is pending [frontend/src/pages/OnboardingDetailPage.tsx:254-259] — the new send action disables itself during its request, but the adjacent Delete control only checks `approving || deleting`; a manager can therefore issue send and delete concurrently and receive a misleading failure or stale page state. Fixed by including `sendingForApproval` in the Delete disabled guard.
- [x] [Review][Defer] Multi-process concurrent writers can still race [backend/src/store.ts:100-141] — deferred, pre-existing; the story explicitly scopes its guarantee to synchronous single-process event-loop serialization and documents the JSON store's lack of true multi-process concurrency control.
- [x] [Review][Defer] Direct JSON rewrite is not crash-safe [backend/src/store.ts:56-58] — deferred, pre-existing; the story's atomic-race requirement concerns serialized status transitions, not crash-safe persistence, and the direct rewrite predates this change.
