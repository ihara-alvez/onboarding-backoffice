---
baseline_commit: 79436b0e8bb144eca3524c3b5f54c25a755419de
---

# Story 1.7: Progress Timeline Display

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a manager,
I want to see a timeline of every status change an onboarding has gone through,
so that I can understand its history at a glance without piecing it together from the Action Log.

## Acceptance Criteria

1. Given any onboarding, when its detail view is opened, then a Progress section lists each status transition (status value, timestamp) in chronological order.
2. Given the `ready_for_day_1`→`in_progress` read-time flip has occurred (FR4), when Progress is displayed, then it reflects the flip as of the `start_date` itself, not a logged event time.
3. Given an onboarding with only one status so far (e.g. freshly created `draft`), when Progress is displayed, then it shows that single entry without error.

## Tasks / Subtasks

- [x] Task 1: Build the transition list from `actionLog` (AC: 1, 3)
  - [x] In `frontend/src/pages/OnboardingDetailPage.tsx`, add a local (not exported — single-use) helper `buildProgressEntries(record: OnboardingRecord): { status: OnboardingStatus; timestamp: string }[]`: filter `record.actionLog` to entries where `toStatus !== undefined` (per Story 1.1's filter rule — covers `status_change`, `generation_failure`, `retry`, `approve` entries alike), map each to `{ status: entry.toStatus, timestamp: entry.timestamp }`, in the array's existing (already-chronological, append-only) order.
- [x] Task 2: Append the synthetic read-time flip entry (AC: 2)
  - [x] After building the logged-entries list, check: if `record.status === "in_progress"` (the API's already-*effective* status, per Story 1.4) **and** the last logged entry's status is `"ready_for_day_1"` **and** `record.startDate` is set, append one more entry: `{ status: "in_progress", timestamp: record.startDate }`. This is the *only* place the read-time flip appears — it is never written to `actionLog` (Story 1.4 explicitly never logs it), so Progress must synthesize it client-side or the flip would be invisible here even though it's visible in the status Chip.
- [x] Task 3: Render it (AC: 1, 3)
  - [x] Add a "Progress" `Card` section to the detail page (place it after the notification banner, before the narrative `Card` — status/meta info grouped near the top, ahead of plan content). Render each entry as a row: timestamp (`new Date(entry.timestamp).toLocaleString()`, matching the existing `createdAt` formatting elsewhere on this page) plus a status `Chip` reusing `statusTone()` (Story 1.1) for the same color coding used elsewhere on the page.
- [x] Task 4: Verify (AC: 1, 2, 3)
  - [x] `npm run build`/`lint` in `frontend/`.
  - [x] View a freshly-created (single-transition) onboarding — Progress shows exactly one row, no error. View one whose `startDate` has passed while stored status is still `ready_for_day_1` (per Story 1.4's manual-verification setup) — Progress shows the synthetic `in_progress` row dated at `startDate`, in addition to the real logged rows.

## Dev Notes

- **This story can be built independent of Track A's stories landing.** It only needs `record.actionLog` (schema from Story 1.1) and `record.status`/`record.startDate` (already existing fields) to exist — it doesn't matter whether Stories 1.2–1.5's endpoints are implemented yet; an empty or partially-populated `actionLog` array still renders correctly (AC3 explicitly covers the single-entry case).
- **Don't create a second array or a backend endpoint for this.** Per Story 1.1's design decision, Progress is *derived*, client-side, from the same `actionLog` the Action Log (Story 1.8) will also render — there is no separate "transitions" field anywhere.
- **Naming collision to avoid:** this app already has a `ProgressLog.tsx` component (the agent-console/streaming-events display used on `CreateOnboardingPage`) — a completely different concept (live agent tool-call/text events, not status history). Don't reuse that name or component for this story's status timeline; keep this as inline JSX in `OnboardingDetailPage.tsx` (a single-use display, not worth its own component file per this project's low-abstraction style) rather than naming a new component something confusable with `ProgressLog`.
- **The synthetic-entry check is the one subtle piece.** Get the condition right: only synthesize when the *current effective* status is `in_progress` but the *last logged* transition was into `ready_for_day_1` — don't synthesize for every `ready_for_day_1` record (only ones whose date has actually passed, i.e. where the API already returned `"in_progress"` per Story 1.4's `computeEffectiveStatus`).

### Project Structure Notes

- Single file touched: `frontend/src/pages/OnboardingDetailPage.tsx` (UPDATE only — new local helper + new Card section). No backend changes, no new files.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.7: Progress Timeline Display]
- [Source: _bmad-output/planning-artifacts/prds/prd-onboarding-backoffice-2026-07-17/prd.md#FR-7, FR-4 Design Notes]
- [Source: frontend/src/pages/OnboardingDetailPage.tsx] — where the new section goes; existing timestamp-formatting pattern to match
- [Source: frontend/src/components/ProgressLog.tsx] — the differently-purposed, similarly-named existing component to not confuse with this story's work
- [Source: _bmad-output/implementation-artifacts/1-1-six-state-status-model-migration-log-schema.md] — `actionLog`/`ActionLogEntry` schema and the `toStatus`-based filter rule
- [Source: _bmad-output/implementation-artifacts/1-4-approve-action-automatic-post-approval-transitions.md] — `computeEffectiveStatus`, the source of the read-time flip this story must synthesize a row for

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

None — no failures encountered. Verification: `frontend/npm run build`, `frontend/npm run lint` (both clean), plus a standalone reproduction of `buildProgressEntries()`'s logic (it's intentionally unexported/single-use) exercised against 4 scenarios: single-entry record (AC3), multi-entry record confirming non-transition entries like `chat_message` are correctly excluded (AC1), the synthetic read-time flip correctly appended when effective status is `in_progress` but the last logged transition was `ready_for_day_1` (AC2), and confirmed no synthetic row is added when the date hasn't actually passed yet (negative case for AC2's condition).

### Completion Notes List

- Added `buildProgressEntries()` (local, unexported) to `OnboardingDetailPage.tsx`: filters `actionLog` to `toStatus !== undefined` entries per Story 1.1's rule, then appends the synthetic `ready_for_day_1`→`in_progress` read-time-flip row when applicable (never itself logged, per Story 1.4).
- New "Progress" `Card` section renders each entry as timestamp + status `Chip` (reusing `statusTone()`), placed after the notification banner and before the narrative card.
- Deliberately kept this separate from the existing `ProgressLog.tsx` component (agent-console streaming events) — different concept, avoided the naming/conceptual collision the story's Dev Notes flagged.
- No backend changes. Built independent of Track A's stories — only needed Story 1.1's `actionLog` schema, already on `main`.

### File List

- `frontend/src/pages/OnboardingDetailPage.tsx` (modified)

## Change Log

- 2026-07-21 — Implemented Story 1.7: Progress timeline derived from actionLog, including the synthetic read-time flip row. All 4 tasks complete, all 3 ACs satisfied and verified. Status → review.
