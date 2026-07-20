# Story 1.2: Automatic Draft/Blocked Status on Generation Outcome

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a manager,
I want a newly created onboarding to automatically land in `draft` or `blocked` based on whether plan generation succeeded,
so that I immediately know whether the plan is ready for my review without checking logs manually.

## Acceptance Criteria

1. Given a manager creates an onboarding and plan generation succeeds, when the record is created, then its status is `draft`.
2. Given a manager creates an onboarding and plan generation fails (error or timeout), when the record is created, then its status is `blocked`.
3. Given a plan generation failure, when the onboarding lands in `blocked`, then an Action Log entry is created recording the failure reason and timestamp.
4. Given a plan generation success, when the onboarding lands in `draft`, then no Action Log entry claims a failure.

## Tasks / Subtasks

- [ ] Task 1: Branch status on generation outcome (AC: 1, 2)
  - [ ] In `backend/src/routes/onboardings.ts`'s `POST /` handler, replace the hardcoded `status: "draft"` (placeholder from Story 1.1) with `status: narrativeOutcome.ok ? "draft" : "blocked"`.
- [ ] Task 2: Log the outcome (AC: 3, 4)
  - [ ] In the same handler, build one `ActionLogEntry` and include it in the record's `actionLog` array at creation time (replacing Story 1.1's placeholder `actionLog: []`):
    - On success: `{ id: crypto.randomUUID(), timestamp: new Date().toISOString(), actor: "system", type: "status_change", message: "Plan generated successfully", toStatus: "draft" }`.
    - On failure: `{ id: crypto.randomUUID(), timestamp: new Date().toISOString(), actor: "system", type: "generation_failure", message: narrativeOutcome.error, toStatus: "blocked" }`.
  - [ ] `crypto` is already imported in this file (used for the record's own `id`) — reuse it, no new import needed.
- [ ] Task 3: Verify (AC: 1, 2, 3, 4)
  - [ ] `npm run build` / `npm run typecheck` in `backend/`.
  - [ ] Manually verify both paths: a normal create (existing profile/project ids) should land in `draft` with a `status_change` log entry; force a failure by temporarily setting `DAYONE_REPO_PATH` to a nonexistent path (so `pythonBridge.runNarrative` fails to spawn) and confirm the record lands in `blocked` with a `generation_failure` entry carrying the spawn-failure message.

## Dev Notes

- **This story only touches the creation path** (`POST /api/onboardings`). It does not touch the approve flow, `pending_approval`, or any UI — those are later stories. Today, this endpoint already computes `narrativeOutcome` (from `runNarrative()` in `pythonBridge.ts`) and uses `.ok` to decide `narrative`/`narrativeError`, but — before Story 1.1 — never varied `status` on it. Story 1.1 made `status` a 6-value type but still hardcoded `"draft"` unconditionally as a placeholder; this story is what actually wires the branching FR2 requires.
- **Exactly one log entry per creation, never two.** Don't add both a `status_change` and a `generation_failure` entry for the same failed creation — `generation_failure` alone carries both the transition (`toStatus: "blocked"`) and the reason (`message`), per Story 1.1's Dev Notes design decision that Progress (Story 1.7) filters on `toStatus !== undefined` regardless of `type`.
- **`narrativeOutcome.error`** (the failure message) already exists today as the `NarrativeOutcome` discriminated union's `error` field (see `backend/src/pythonBridge.ts`) — covers both a spawn failure and a 40-second timeout (`NARRATIVE_TIMEOUT_MS`). Use it verbatim as the log entry's `message`; don't re-derive or re-format it.
- **`actor: "system"`** here, not `"manager"` — this transition happens automatically on creation, no manager action triggered it (contrast with Story 1.3's "Send for approval," which is `actor: "manager"`).
- No frontend changes in this story — Progress/Action Log UI doesn't exist until Stories 1.7/1.8. The `blocked` status will render via Story 1.1's `statusTone()` helper (already returns `"error"` tone for `blocked`), so the list/detail Chips already display it correctly with no further change needed here.

### Project Structure Notes

- Brownfield, single file touched: `backend/src/routes/onboardings.ts` (UPDATE only, no new files).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2: Automatic Draft/Blocked Status on Generation Outcome]
- [Source: _bmad-output/planning-artifacts/prds/prd-onboarding-backoffice-2026-07-17/prd.md#FR-2]
- [Source: backend/src/routes/onboardings.ts] — `POST /` handler, `narrativeOutcome` already computed here
- [Source: backend/src/pythonBridge.ts] — `NarrativeOutcome` discriminated union, `NARRATIVE_TIMEOUT_MS`
- [Source: _bmad-output/implementation-artifacts/1-1-six-state-status-model-migration-log-schema.md] — `ActionLogEntry` schema and the `toStatus`-based Progress filter rule this story must follow

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
