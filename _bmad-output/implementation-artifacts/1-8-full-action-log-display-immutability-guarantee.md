# Story 1.8: Full Action Log Display & Immutability Guarantee

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a manager,
I want an append-only audit trail of every status change and manager action on an onboarding,
so that I have a complete, tamper-proof record I can trust for compliance or answering questions about what happened.

## Acceptance Criteria

1. Given any status transition, approve, or delete action occurs, when it completes, then exactly one new Action Log entry is appended, never edited or removed.
2. Given the detail view is opened, when the Action Log section renders, then entries appear in chronological order with timestamp and actor.
3. Given no manager authentication exists in this app (NFR4), when an entry is attributed, then it identifies "a manager" generically rather than a specific named individual — documented accepted behavior, not a defect.
4. Given the app's exposed actions (API/UI), when checked for an edit- or delete-Action-Log-entry capability, then no such capability exists anywhere in the app (NFR1).
5. Given the read-time-computed `ready_for_day_1`→`in_progress` flip (FR4), when the Action Log is viewed, then no entry exists for it — it's covered by Progress (Story 1.7), not the Action Log.

## Tasks / Subtasks

- [ ] Task 1: Render the full, unfiltered Action Log (AC: 2, 3, 5)
  - [ ] In `frontend/src/pages/OnboardingDetailPage.tsx`, add an "Action Log" section rendering `record.actionLog` **unfiltered** (contrast with Story 1.7's Progress section, which filters to `toStatus !== undefined` entries only — Action Log shows every entry: status transitions, approvals, and, once Epic 2 ships, chat messages too). Wrap it in the existing `Collapsible` component (mirror the "Agent console" section's exact pattern: `<Collapsible label={`Action log (${record.actionLog.length} entries)`}>`), placed near that Agent console section.
  - [ ] Render each entry as a row: `new Date(entry.timestamp).toLocaleString()`, the actor (`entry.actor` is already just `"manager"` or `"system"` per Story 1.1's schema — display it capitalized, e.g. "Manager"/"System", no further lookup needed since there's no named-individual data to show, per NFR4), and `entry.message`. Order is already chronological (the array is append-only, per Story 1.1's design) — no client-side sorting needed.
  - [ ] AC5 requires no code: since the read-time flip is never written to `actionLog` (Story 1.4), simply rendering the array as-is already satisfies "no entry exists for it."
- [ ] Task 2: Confirm immutability by inspection, not new code (AC: 1, 4)
  - [ ] There is no task here to *build* — verify (and note in Completion Notes) that no route in `backend/src/routes/onboardings.ts` exposes an edit- or delete-single-log-entry capability. `actionLog` entries are only ever appended (via `[...record.actionLog, newEntry]`, per Stories 1.2–1.5's pattern) inside store functions that also rewrite the whole record — there is no endpoint that targets an individual log entry by its own `id` for mutation.
- [ ] Task 3: Verify (AC: 1, 2, 3, 4, 5)
  - [ ] `npm run build`/`lint` in `frontend/`.
  - [ ] View an onboarding with several logged actions (e.g. one that's been sent for approval and approved, per Stories 1.3/1.4's manual verification) — confirm all entries render in order with sensible messages, and that the count in the Collapsible label matches.

## Dev Notes

- **Known, documented limitation: delete actions are not logged, and this story does not add that.** FR8/this story's own AC1 both list "delete" among the actions that should be logged, but this app's `actionLog` is a field *on* the `OnboardingRecord` itself — `deleteOnboarding()` removes the entire record (see `backend/src/store.ts`), including its `actionLog`, so there is no persisted place left to show a "deleted" entry for a record that no longer exists (its detail view 404s immediately after). Building a delete log would require a separate, cross-record audit store, which nothing else in the PRD, addendum, or architecture calls for — that would be scope creep, not a requirement here. This is a deliberate interpretation to document (e.g. in Completion Notes), not a bug to silently work around or an omission to quietly fix.
- **This story is purely a display + verification story — almost no new logic.** All the actual log-writing happened in Stories 1.2 ("generation_failure"/"status_change" on create), 1.3 ("status_change" on send-for-approval/revert), 1.4 ("approve"), and 1.5 ("retry", "status_change" on complete). By the time this story is built, `actionLog` may already contain real entries from whichever of those have landed — or may still be empty/sparse if this (Track B) story is built before Track A's stories, per this epic's parallelization design. Either way, the rendering code must handle an empty or partial array gracefully (an empty `actionLog` should render the Collapsible with "(0 entries)" and no rows, not an error).
- **NFR4's "generic manager" framing is already baked into the schema** (Story 1.1's `actor: "manager" | "system"` union has no room for a named individual) — there's no lookup table or user-identity data anywhere in this app to resolve a name from, so there's nothing to accidentally leak here.

### Project Structure Notes

- Single file touched: `frontend/src/pages/OnboardingDetailPage.tsx` (UPDATE only — new Collapsible section). No backend changes, no new files, no new dependencies.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.8: Full Action Log Display & Immutability Guarantee]
- [Source: _bmad-output/planning-artifacts/prds/prd-onboarding-backoffice-2026-07-17/prd.md#FR-8, NFR1, NFR4]
- [Source: frontend/src/pages/OnboardingDetailPage.tsx] — existing `Collapsible`/"Agent console" pattern to mirror
- [Source: backend/src/store.ts] — `deleteOnboarding()`, confirming the per-record storage model that makes delete-logging structurally impossible here
- [Source: _bmad-output/implementation-artifacts/1-1-six-state-status-model-migration-log-schema.md] — `ActionLogEntry` schema this story renders
- [Source: _bmad-output/implementation-artifacts/1-7-progress-timeline-display.md] — the sibling story this one must stay visually/conceptually distinct from (filtered vs. unfiltered view of the same array)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
