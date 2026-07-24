---
baseline_commit: 04bccf8
---

# Story 3.13: Simplify Permissions Table

Status: ready-for-dev

## Story

As a manager,
I want the Permissions table to show only useful permission information,
so that the table is easier to scan.

## Acceptance Criteria

1. Given the Requested or Approved permissions table renders, when its columns are displayed, then it shows exactly `Permission` and `System`.
2. Given the simplified table renders, when it is inspected visually or with assistive technology, then no `Included` header, checkmark, or screen-reader-only Included label remains.
3. Given the permissions card renders, when the onboarding status changes, then Requested-versus-Approved title behavior remains unchanged and table overflow remains contained within the card.

## Tasks / Subtasks

- [ ] Remove the redundant Included column (AC: 1–2)
  - [ ] Remove the header, body cells, checkmark, and any accessible-only Included text from `PermissionsCard`.
  - [ ] Keep one row per permission and preserve Permission/System values and empty-state semantics.
- [ ] Preserve status and table behavior (AC: 3)
  - [ ] Keep `isApprovedStatus(record.status)` driving Requested versus Approved title copy.
  - [ ] Preserve the card's Viewed wrapper, table-local horizontal overflow, focusable region, caption, semantic table markup, and dark-mode tokens.
- [ ] Validate accessibility and regressions
  - [ ] Confirm headers are exactly two columns and each data cell aligns with them.
  - [ ] Run frontend build/lint and targeted source/markup checks.

## Dev Notes

### Current implementation to extend

- `frontend/src/pages/OnboardingDetailPage.tsx` `PermissionsCard` currently builds `permissionRows` and renders `Permission`, `System`, and `Included`; the Included cell uses a success-colored checkmark introduced by Story 3.7.
- The card is wrapped in `ReviewableCard`, so removal must not disturb Viewed collapse state or the fixed card order.
- `frontend/src/api/types.ts` permission data remains unchanged: AWS/CI-CD arrays and repository access still map into Permission/System rows.

### Required behavior and guardrails

- The rendered table must have exactly two `<th scope="col">` values: `Permission` and `System`; do not leave hidden or screen-reader-only Included content.
- Keep the existing `permissionRows` mapping and stable row keys unless a small cleanup is necessary. No backend/schema changes and no change to requested/approved data semantics.
- Continue using `isApprovedStatus()` for the title (`Requested permissions` vs `Approved permissions`) and preserve its six-state behavior.
- Keep `role="region"`, accessible table-region label, `tabIndex={0}`, `overflow-x-auto`, table caption, `min-w` behavior, and `scope="col"` semantics from Stories 3.5–3.8.
- Remove now-unused success styling/imports/classes only if they are unused after this change. Do not remove the global success token because Viewed checkboxes still use it.
- Verify both light and dark themes, empty permission arrays, long permission/system strings, and viewed/expanded states.

### Expected files

- Update: `frontend/src/pages/OnboardingDetailPage.tsx`.
- Read/preserve: `frontend/src/api/types.ts`, `frontend/src/index.css`, `frontend/src/statusDisplay.ts`.
- No new dependency, backend change, or API field.

### Previous story intelligence

- Story 3.5 established the semantic data-table contract and local overflow accessibility.
- Story 3.7 introduced the Included success glyph; this follow-up intentionally removes only that redundant presentation while preserving the shared `success` token for Viewed controls.
- Story 3.8 added dark-mode equivalents; no theme regression is allowed.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story 3.13: Simplify Permissions Table`]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/DESIGN.md#Data table`]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/DESIGN.md#Epic 3 Follow-up Enhancements`]
- [Source: `_bmad-output/implementation-artifacts/3-5-repositories-permissions-as-data-tables.md`]
- [Source: `_bmad-output/implementation-artifacts/3-7-viewed-checkbox-review-pattern.md`]
- [Source: `frontend/src/pages/OnboardingDetailPage.tsx`]

## Dev Agent Record

### Agent Model Used

Codex GPT-5

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story context preserves the table semantics, status-dependent title, local overflow, and Viewed/dark-mode behavior while removing only Included presentation.

### File List

- `_bmad-output/implementation-artifacts/3-13-simplify-permissions-table.md`

