# Story 1.6: Requested vs. Approved Permission Labeling

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a manager,
I want the permission set labeled "Requested" before approval and "Approved" after,
so that I never mistake a pending grant for one that's actually been signed off.

## Acceptance Criteria

1. Given a `draft` or `pending_approval` onboarding, when its detail view is opened, then the permission set is labeled "Requested Permissions".
2. Given an onboarding in `ready_for_day_1`, `in_progress`, or `completed`, when its detail view is opened, then the same permission set is labeled "Approved Permissions," unchanged in content.
3. Given permissions remain simulated data, not live grants (NFR3), when either label is shown, then no real IAM/access provisioning occurs as part of displaying or relabeling — the label change is presentational only.

## Tasks / Subtasks

- [ ] Task 1: Shared "is this an approved-territory status" helper (AC: 1, 2)
  - [ ] In `frontend/src/statusDisplay.ts` (created in Story 1.1), add `isApprovedStatus(status: OnboardingStatus): boolean` — returns `true` for `ready_for_day_1`/`in_progress`/`completed`, `false` otherwise. This is the exact same three-value grouping Story 1.1's `statusTone()` already uses for its `"primary"` case — **refactor `statusTone()` to call `isApprovedStatus()` instead of repeating the same three-literal list**, so the grouping is defined once.
- [ ] Task 2: Conditional label (AC: 1, 2)
  - [ ] In `frontend/src/pages/OnboardingDetailPage.tsx`, change the "Expected permissions" `SectionTitle` (in the permissions `Card`) to render `isApprovedStatus(record.status) ? "Approved permissions" : "Requested permissions"` instead of the current static "Expected permissions" text. The rendered content below it (AWS/repository/CI-CD bullet lists) is unchanged — only the heading text is conditional.
- [ ] Task 3: Verify (AC: 1, 2, 3)
  - [ ] `npm run build`/`lint` in `frontend/`.
  - [ ] Manually view a `draft` onboarding (label: "Requested permissions") and an approved one, e.g. `ready_for_day_1` (label: "Approved permissions") — confirm the bullet-list content itself is byte-identical between the two, only the heading changed.
  - [ ] AC3 requires no new code at all — this story only ever reads `profile.permissions` (already-fetched, already-simulated data) and renders a heading string; confirm no IAM SDK, AWS call, or new provisioning logic was introduced anywhere in this change.

## Dev Notes

- **This is a pure display story — no backend changes, no new data.** `profile.permissions` (AWS/repositories/CI-CD) is already fetched and rendered today (see `OnboardingDetailPage.tsx`'s "Expected permissions" `Card`); this story only changes the section's heading text based on status.
- **Do this story's Track B work independent of Track A's actual endpoints landing.** Whatever `record.status` value the API currently returns (whether Stories 1.2–1.5 have shipped yet or not) is sufficient — `isApprovedStatus()` just needs the *type* to have all six values (already true after Story 1.1), not any particular story's transition logic to be implemented.
- **NFR3 is satisfied by omission, not by new code.** There is no IAM/AWS-provisioning code path anywhere in this app (confirmed — `dayone/docs/ARCHITECTURE.md`'s own MVP decisions keep permissions simulated); this story must not introduce one. The only thing to verify is that nothing new was added, not that something was removed.

### Project Structure Notes

- Files to UPDATE: `frontend/src/statusDisplay.ts` (add `isApprovedStatus`, refactor `statusTone`), `frontend/src/pages/OnboardingDetailPage.tsx` (conditional heading). No backend changes, no new files.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.6: Requested vs. Approved Permission Labeling]
- [Source: _bmad-output/planning-artifacts/prds/prd-onboarding-backoffice-2026-07-17/prd.md#FR-6, NFR3]
- [Source: frontend/src/pages/OnboardingDetailPage.tsx] — "Expected permissions" `Card`/`SectionTitle` to change
- [Source: _bmad-output/implementation-artifacts/1-1-six-state-status-model-migration-log-schema.md] — `statusDisplay.ts` and `statusTone()`, which this story extends

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
