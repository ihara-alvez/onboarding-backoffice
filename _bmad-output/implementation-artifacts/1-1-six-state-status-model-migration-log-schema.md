---
baseline_commit: 2a8aa036a5e73cec22b33cc14e93127bf104bacb
---

# Story 1.1: Six-State Status Model, Migration & Log Schema

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a manager,
I want the onboarding record to track one of six lifecycle statuses (`draft`, `pending_approval`, `ready_for_day_1`, `in_progress`, `blocked`, `completed`),
so that I can see exactly where each onboarding stands instead of today's binary `created`/`approved` flag.

## Acceptance Criteria

1. Given an existing onboarding record with status `created`, when the migration runs, then its status becomes `draft` and no other record data is lost.
2. Given an existing onboarding record with status `approved`, when the migration runs, then its status becomes `ready_for_day_1` if `start_date` is absent or in the future, or `in_progress` if `start_date` is today or in the past, and no other record data is lost.
3. Given the list or detail view is opened, when an onboarding's status is displayed, then it shows one of the six new values, never `created`/`approved`.
4. Given the migration completes, when the status-transition-history and Action Log storage schemas are created, then they are ready to receive entries from later stories (schema/types only — no UI yet).

## Tasks / Subtasks

- [x] Task 1: Backend status model + migration (AC: 1, 2, 4)
  - [x] In `backend/src/types.ts`, change `OnboardingStatus` from `"created" | "approved"` to `"draft" | "pending_approval" | "ready_for_day_1" | "in_progress" | "blocked" | "completed"`.
  - [x] Add `ActionLogEntryType` and `ActionLogEntry` types (see Dev Notes for exact shape) and add `actionLog: ActionLogEntry[]` to `OnboardingRecord`.
  - [x] In `backend/src/store.ts`, add a `normalizeRecord()` function that: converts legacy `"created"` → `"draft"`; converts legacy `"approved"` → `"ready_for_day_1"` (no `startDate`, or `startDate` in the future) or `"in_progress"` (`startDate` today or past); defaults `actionLog` to `[]` if missing. See Dev Notes for the exact typing approach (legacy values are no longer valid `OnboardingStatus` members).
  - [x] Apply `normalizeRecord()` to every record read inside `readAll()`, so migration is self-healing on first write (see Dev Notes).
  - [x] In `backend/src/routes/onboardings.ts`'s `POST /` handler, change the hardcoded `status: "created"` to `status: "draft"` and add `actionLog: []` to the new record. **Do not** add success/failure branching here — that is Story 1.2's scope.
  - [x] In `backend/src/store.ts`'s `approveOnboarding()`, change the hardcoded `status: "approved"` to `status: "ready_for_day_1"`. **Do not** add `start_date`-conditional branching here — that is Story 1.4's scope.
  - [x] In `backend/src/routes/onboardings.ts`'s `POST /:id/approve` handler, change the idempotency guard `if (existing.status === "approved")` to `if (existing.status !== "draft")` — mirrors the old "already approved, no-op" semantics exactly (today only two states existed; now anything past `draft` is "already approved-ish"). **Do not** add a `pending_approval` gate here — that is Story 1.3/1.4's scope.
- [x] Task 2: Frontend type mirror (AC: 3, 4)
  - [x] In `frontend/src/api/types.ts`, mirror the exact same `OnboardingStatus` union and `ActionLogEntryType`/`ActionLogEntry` types, and add `actionLog: ActionLogEntry[]` to `OnboardingRecord` (non-optional — the backend now always populates it via `normalizeRecord()`, unlike the pre-existing optional `events?` field).
- [x] Task 3: Fix the four existing UI touch-points so they compile and display sensibly with six values (AC: 3)
  - [x] Create `frontend/src/statusDisplay.ts` exporting `statusTone(status: OnboardingStatus): "primary" | "secondary" | "error"` — returns `"primary"` for `ready_for_day_1`/`in_progress`/`completed`, `"error"` for `blocked`, `"secondary"` for `draft`/`pending_approval`.
  - [x] `frontend/src/pages/OnboardingListPage.tsx`: replace `tone={r.status === "approved" ? "primary" : "secondary"}` with `tone={statusTone(r.status)}`.
  - [x] `frontend/src/pages/OnboardingDetailPage.tsx`: replace `tone={record.status === "approved" ? "primary" : "secondary"}` with `tone={statusTone(record.status)}`.
  - [x] `frontend/src/pages/OnboardingDetailPage.tsx`: replace the notification-banner condition `record.status === "approved" && record.notification` with just `record.notification &&` (logically equivalent — `notification` is only ever set by the approve action, so the status literal isn't needed).
  - [x] `frontend/src/pages/OnboardingDetailPage.tsx`: replace the Approve-button guard `record.status === "created"` with `record.status === "draft"`. Leave the button/endpoint itself unchanged (still one "Approve" action) — the `pending_approval` gate and button semantics are Story 1.3/1.4's scope, not this one.
- [x] Task 4: Verify (AC: 1, 2, 3, 4)
  - [x] Backend: `npm run build` and `npm run typecheck` in `backend/` — no test framework exists, don't add one.
  - [x] Frontend: `npm run build` and `npm run lint` in `frontend/`.
  - [x] Manually confirm via the running app: the two existing records in `backend/data/onboardings.json` (both currently `"approved"`, neither has `startDate` set) should display as `ready_for_day_1` after this story, not `"approved"`.

## Dev Notes

- **This is a narrow, foundational story — do not implement Stories 1.2–1.8's logic here.** Its only job is: (a) the new 6-value type exists everywhere, (b) old data migrates losslessly, (c) the app still compiles and behaves sensibly with temporary placeholder values at the two points where old code produced a status no longer in the type. Over-building (e.g. adding real success/failure branching, or the `pending_approval` gate) is scope creep into later stories that are deliberately sequenced after this one so a second developer (Track B) can start building read-side displays against a stable schema immediately.
- **The riskiest part of this story is the migration cast.** `backend/src/store.ts`'s `readAll()` currently does `JSON.parse(...) as OnboardingRecord[]` — once `OnboardingStatus` no longer includes `"created"`/`"approved"`, that cast would silently lie about the type of on-disk legacy data (TypeScript won't catch it, because `JSON.parse` returns `any`). Do NOT just re-cast and hope; write `normalizeRecord()` to accept a loosely-typed raw shape (e.g. `Record<string, unknown>` or a small local `status: string` type for the raw record), read the raw `status` string, map `"created"`/`"approved"` explicitly, and only then return a value truly typed as `OnboardingRecord`. Call `normalizeRecord()` on every record inside `readAll()` (not in a one-off migration script — this app has no migration runner, and mutating on every read is self-healing: the next `writeAll()` from any caller, e.g. `deleteOnboarding`, persists the migrated value going forward).
- **Existing on-disk data to migrate against:** `backend/data/onboardings.json` currently has 2 records, both `status: "approved"`, neither with a `startDate` field at all (confirmed by reading the file) — both should migrate to `"ready_for_day_1"` per AC2's "absent start_date" branch. Use this as your manual verification case.
- **`ActionLogEntry` schema (add to `backend/src/types.ts` and mirror in `frontend/src/api/types.ts`):**
  ```ts
  export type ActionLogEntryType =
    | "status_change"
    | "approve"
    | "delete"
    | "chat_message"
    | "generation_failure"
    | "retry";

  export interface ActionLogEntry {
    id: string;
    timestamp: string; // ISO 8601
    actor: "manager" | "system";
    type: ActionLogEntryType;
    message: string;
    fromStatus?: OnboardingStatus;
    toStatus?: OnboardingStatus;
  }
  ```
  Design decision made now (not left for Track A/B to each invent their own): **Progress (Story 1.7) is a filtered view over this same `actionLog` array**, not a separate array — avoids duplicate writes and two schemas drifting apart. Filter on **`entry.toStatus !== undefined`**, not on a specific `type` value — several entry types represent a transition (`status_change`, `generation_failure`, `retry`, `approve`), so `toStatus` presence is the general rule, not an enumerated type check. `actor` is always `"manager"` or `"system"` (never a named individual — no manager auth exists, per NFR4). This story only adds the types and an empty-array default; no code needs to push real entries yet (that starts in Story 1.2) and nothing renders it yet (that's Story 1.8).
- **Don't add tone-mapping logic in more than one place.** Two pages (`OnboardingListPage.tsx`, `OnboardingDetailPage.tsx`) both need a status→Chip-tone mapping; put it once in `frontend/src/statusDisplay.ts` and import it, per the project's "no barrel files, import concrete files directly" convention — this is a plain module file, not a re-export barrel.
- Follow `_bmad-output/project-context.md` throughout: `strict: true` on both tsconfigs (explicit param/return types, no implicit `any`); 2-space indent, double quotes, semicolons; PascalCase for the one new... actually `statusDisplay.ts` is a non-component module, so camelCase filename (already reflected above); no ESLint config (frontend lint is `oxlint`).
- No architecture.md exists for this project; PRD FR-1 and FR-4's Design Notes (see References) are the authoritative source for the status values and the migration mapping rule — nothing in the epics/PRD conflicts with the plan above.

### Project Structure Notes

- Brownfield change to the existing React + Express app — no scaffolding, no starter template.
- Files to UPDATE: `backend/src/types.ts`, `backend/src/store.ts`, `backend/src/routes/onboardings.ts`, `frontend/src/api/types.ts`, `frontend/src/pages/OnboardingListPage.tsx`, `frontend/src/pages/OnboardingDetailPage.tsx`.
- File to CREATE: `frontend/src/statusDisplay.ts` (camelCase, non-component module, per project naming convention).
- No new dependencies, no new routes, no new files on the backend side.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1: Six-State Status Model, Migration & Log Schema]
- [Source: _bmad-output/planning-artifacts/prds/prd-onboarding-backoffice-2026-07-17/prd.md#FR-1] — six-state lifecycle + migration assumption
- [Source: _bmad-output/planning-artifacts/prds/prd-onboarding-backoffice-2026-07-17/prd.md#FR-4] — start_date-based `ready_for_day_1`/`in_progress` rule used by the migration
- [Source: backend/src/types.ts] — current `OnboardingStatus`, `OnboardingRecord`
- [Source: backend/src/store.ts] — current `readAll`/`writeAll`/`approveOnboarding`
- [Source: backend/src/routes/onboardings.ts] — current creation handler (hardcoded `status: "created"`)
- [Source: frontend/src/api/types.ts] — current frontend mirror of `OnboardingStatus`/`OnboardingRecord`
- [Source: frontend/src/pages/OnboardingListPage.tsx] — Chip tone usage to fix
- [Source: frontend/src/pages/OnboardingDetailPage.tsx] — Chip tone, notification banner, Approve-button guard to fix
- [Source: frontend/src/components/Chip.tsx] — only 3 tones exist (`primary`/`secondary`/`error`)
- [Source: backend/data/onboardings.json] — 2 existing records, both `"approved"`, no `startDate`
- [Source: _bmad-output/project-context.md] — TS strictness, naming, no-barrel-files, no test framework rules

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

None — no failures encountered. Verification commands run: `backend/npm run build`, `backend/npm run typecheck`, `frontend/npm run build`, `frontend/npm run lint` (all clean), plus an ad-hoc `npx tsx -e '...'` script calling `listOnboardings()` to confirm the two pre-existing `onboardings.json` records (both legacy `"approved"`, no `startDate`) read back as `"ready_for_day_1"` with `actionLog: []`, while the on-disk file itself still shows the legacy `"approved"` value (confirming migration is read-time/self-healing, not an eager rewrite, per the story's design).

### Completion Notes List

- Six-state `OnboardingStatus` union and `ActionLogEntry`/`ActionLogEntryType` schema added to `backend/src/types.ts`, mirrored exactly in `frontend/src/api/types.ts`.
- `normalizeRecord()` added to `backend/src/store.ts`, applied inside `readAll()`; migrates legacy `"created"`→`"draft"` and `"approved"`→`"ready_for_day_1"`/`"in_progress"` (by `startDate`), defaults `actionLog` to `[]`. Verified against real on-disk data — see Debug Log References.
- Two placeholder values introduced exactly where old code produced a status no longer in the type (`POST /` creation → `"draft"`; `approveOnboarding()` → `"ready_for_day_1"`), both explicitly commented in code as placeholders for Stories 1.2/1.4.
- `/approve` route's idempotency guard changed from `status === "approved"` to `status !== "draft"`, preserving today's exact no-op-if-already-approved behavior under the new 6-value model.
- New `frontend/src/statusDisplay.ts` (`statusTone()`) centralizes the Chip-tone mapping used by both `OnboardingListPage.tsx` and `OnboardingDetailPage.tsx`. Notification-banner condition simplified to a plain `record.notification` check (no longer needs a status literal). Approve-button guard updated to `status === "draft"`.
- No test framework exists in this project (per `_bmad-output/project-context.md`) and none was added — validation was via `build`/`typecheck`/`lint` plus the manual on-disk-data verification above, matching the story's own Task 4.

### File List

- `backend/src/types.ts` (modified)
- `backend/src/store.ts` (modified)
- `backend/src/routes/onboardings.ts` (modified)
- `frontend/src/api/types.ts` (modified)
- `frontend/src/statusDisplay.ts` (new)
- `frontend/src/pages/OnboardingListPage.tsx` (modified)
- `frontend/src/pages/OnboardingDetailPage.tsx` (modified)

## Change Log

- 2026-07-20 — Implemented Story 1.1: six-state status model, legacy-data migration, and Action Log schema. All 4 tasks complete, all 4 ACs satisfied and verified. Status → review.

### Review Findings

- [x] [Review][Patch] Reject or safely normalize unknown persisted status values instead of casting them to `OnboardingStatus` [backend/src/store.ts:36-38] — AC3 requires every displayed status to be one of the six current values; an unexpected value in persisted JSON now fails normalization instead of reaching the API and frontend.
- [x] [Review][Defer] Handle a valid JSON store whose root value is not an array [backend/src/store.ts:41-42] — deferred, pre-existing; `readAll()` already assumed an array and would fail at `.map()` before this story.
