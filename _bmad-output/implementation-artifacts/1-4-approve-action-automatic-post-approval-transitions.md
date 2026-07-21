---
baseline_commit: 61ef271c13a0108a0f84b2beeba333fee790a982
---

# Story 1.4: Approve Action — Automatic Post-Approval Transitions

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a manager,
I want approving a pending onboarding to automatically place it in the correct next stage based on the start date,
so that I don't have to manually track when someone's day one arrives.

## Acceptance Criteria

1. Given a `pending_approval` onboarding with `start_date` absent or in the future, when the manager approves it, then status becomes `ready_for_day_1`.
2. Given a `pending_approval` onboarding with `start_date` today or earlier, when the manager approves it, then status becomes `in_progress`.
3. Given an onboarding in `ready_for_day_1` whose `start_date` arrives, when the record is fetched (any view/read), then status is computed and displayed as `in_progress`, comparing against server/UTC time, not the viewing manager's local timezone.
4. No discrete Action Log entry is created for this read-time flip (per FR8's stated exception).
5. Given an onboarding not in `pending_approval`, when Approve is attempted, then the action is rejected. (Already enforced by Story 1.3's gate — no new work here, listed for completeness.)

## Tasks / Subtasks

- [x] Task 1: Two distinct pieces of date logic — don't conflate them (AC: 1, 2, 3, 4)
  - [x] In `backend/src/store.ts`, add `computeApprovalStatus(startDate?: string): "ready_for_day_1" | "in_progress"` — a pure function used **only at the moment of approval** to decide the real, written, logged transition: returns `"in_progress"` if `startDate` is set and its parsed date is `<= Date.now()`, else `"ready_for_day_1"`. Since `startDate` is a date-only string (`YYYY-MM-DD`, from an `<input type="date">`), `new Date(startDate)` parses to that day's UTC midnight — comparing it directly against `Date.now()` correctly implements "today or earlier, in server/UTC time" with no extra timezone handling needed.
  - [x] Add `computeEffectiveStatus(record: OnboardingRecord): OnboardingStatus` — a **separate** pure function used on every *read*, not at approval time: if `record.status === "ready_for_day_1"` and `record.startDate` has since passed (`new Date(record.startDate).getTime() <= Date.now()`), return `"in_progress"`; otherwise return `record.status` unchanged. This is the AC3/AC4 read-time-only flip — it never writes anything and never logs anything.
- [x] Task 2: Wire the real (approval-time) transition (AC: 1, 2)
  - [x] In `approveOnboarding()`, replace Story 1.3's placeholder hardcoded `"ready_for_day_1"` with `computeApprovalStatus(all[idx].startDate)`. Append the `ActionLogEntry` with `type: "approve"`, `toStatus` set to whatever `computeApprovalStatus` returned (not always `"ready_for_day_1"` — it can legitimately be `"in_progress"` if approved on/after the start date).
- [x] Task 3: Wire the computed (read-time) flip (AC: 3, 4)
  - [x] In `listOnboardings()` and `getOnboarding()`, map each returned record through `{ ...record, status: computeEffectiveStatus(record) }` before returning. **The underlying stored value in `onboardings.json` is never rewritten to `"in_progress"` by this flip** — only the object returned to callers (API responses) reflects it. This means the persisted array can legitimately contain a `ready_for_day_1` record whose date has passed is effectively `in_progress` — that's correct, expected behavior, not a bug.
- [x] Task 4: Verify (AC: 1, 2, 3, 4, 5)
  - [x] `npm run build`/`typecheck` in `backend/`.
  - [x] Manually verify via focused store assertions: approval transitions for absent, past, and future start dates; read-time effective flip without persistence or log mutation; and rejection for non-`pending_approval` records.

## Dev Notes

- **Two different date computations exist now, and it's important not to merge them into one function:** `computeApprovalStatus` runs once, at the moment `approveOnboarding()` executes, and its result is written and logged (a real, auditable transition). `computeEffectiveStatus` runs on every single read of every record, forever, and never writes or logs anything (the read-time-only flip FR8 explicitly says has "no discrete occurrence to log"). Story 1.5 (mark-complete) will need to check a `pending_approval`... no — an `in_progress` onboarding before allowing completion; **it must check the *effective* status (`computeEffectiveStatus(record)`), not the raw stored `status` field**, since a `ready_for_day_1` record whose date has passed is *effectively* `in_progress` even though the stored value hasn't changed. Get this wrong and mark-complete will incorrectly refuse onboardings that have clearly started.
- **Story 1.1's migration function (`normalizeRecord`) already implements the same date-comparison rule inline**, for converting legacy `"approved"` records. That's fine as-is (it was written before this story existed) — you may optionally refactor it to call this story's new `computeApprovalStatus` instead of duplicating the comparison, but it's not required; both implementations compute the same thing.
- **Nothing changes on the frontend for this story.** The Chip status display (`statusTone()`, Story 1.1) and the Approve button's visibility gate (`pending_approval`, Story 1.3) both already work correctly against whatever status value the API returns — since `getOnboarding`/`listOnboardings` now return the *effective* status, the frontend automatically displays `in_progress` once the date passes, with zero frontend code changes.
- **Don't add a scheduled job, cron, or background timer.** The PRD is explicit that this flip has no discrete server-side occurrence — it's purely a function of "what does `computeEffectiveStatus` return right now, given the current wall-clock time," recomputed fresh on every request.

### Project Structure Notes

- Single file touched: `backend/src/store.ts` (UPDATE only — `approveOnboarding`, `listOnboardings`, `getOnboarding`, plus two new exported pure functions). No route or frontend changes.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4: Approve Action — Automatic Post-Approval Transitions]
- [Source: _bmad-output/planning-artifacts/prds/prd-onboarding-backoffice-2026-07-17/prd.md#FR-4] — including its Design Notes on the read-time-only flip
- [Source: backend/src/store.ts] — `approveOnboarding`, `listOnboardings`, `getOnboarding` to modify
- [Source: frontend/src/pages/CreateOnboardingPage.tsx] — confirms `startDate` is a plain `YYYY-MM-DD` string from `<input type="date">`
- [Source: _bmad-output/implementation-artifacts/1-3-manual-submission-for-approval-with-atomic-race-safety.md] — the `"ready_for_day_1"` placeholder and discriminated-result shape this story builds on

## Dev Agent Record

### Agent Model Used
Codex (GPT-5)

### Debug Log References
- `npm run typecheck` and `npm run build` passed.
- Focused `npx tsx` assertions passed after sandbox IPC permission escalation.

### Completion Notes List
- Added separate approval-time and read-time status computations using UTC date-only parsing.
- Approval now writes and logs the computed transition, while reads expose an effective status without mutating storage or creating a log entry.
- Verified with backend typecheck/build and focused store assertions covering all acceptance criteria.

### File List
- `backend/src/store.ts`
- `_bmad-output/implementation-artifacts/1-4-approve-action-automatic-post-approval-transitions.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log
- 2026-07-21: Implemented approval-time date transitions and read-time effective status projection.
- 2026-07-21: Addressed code review finding — malformed start dates are now explicitly rejected or left unchanged during effective-status projection.

### Review Findings
- [x] [Review][Patch] Reject or explicitly handle malformed `startDate` values instead of treating `NaN` as `ready_for_day_1` [backend/src/store.ts:45-55]

Review resolution: Added strict UTC date-only validation; approval rejects malformed dates and read-time projection leaves them unchanged.
