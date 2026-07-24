---
baseline_commit: 993d4432c39e0d9ee7069e0340ae24d1b635c1c5
---

# Story 3.5: Repositories & Permissions as Data Tables

Status: done

## Story

As a manager,
I want Repositories and Permissions each shown as a compact table,
so that I can scan access and setup information row by row instead of parsing paragraph-style blocks or grouped chips.

## Acceptance Criteria

1. The Repositories card renders a table with exactly these columns: `Repository`, `Access`, `Setup`. Each row comes from `record.project.repositories` and uses the real `ProjectRepo.bootstrap` and `ProjectRepo.test` commands. Do not add a `Last synced` column; `ProjectRepo` has no such field.
2. The Permissions card renders a table with exactly these columns: `Permission`, `System`, `Included`. It lists every entry from `record.profile.permissions.aws`, `record.profile.permissions.repositories.access`, and `record.profile.permissions.ci_cd`, replacing the current grouped chip layout.
3. The Permissions card title continues to use `isApprovedStatus(record.status)`: `Requested permissions` before approval and `Approved permissions` for approved statuses. This is presentational only; no IAM provisioning occurs.
4. Each table is wrapped in an inner horizontally scrollable container (`overflow-x-auto`), so wide content cannot create page-level horizontal scrolling.

## Tasks / Subtasks

- [x] Task 1: Replace the repository grid in `RepositoriesCard` with semantic table markup (AC: 1, 4)
  - [x] Use `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, and `<td>` with the required column order.
  - [x] Keep repository name and description together in the Repository cell; keep the profile repository access in the Access cell; render `bootstrap` and `test` in the Setup cell without inventing or fetching fields.
  - [x] Preserve empty-state behavior safely if the repository array is empty.
- [x] Task 2: Replace grouped permission chips with a flattened permissions table (AC: 2, 4)
  - [x] Produce one row for each AWS entry with System `AWS`, one row for the repository access entry with System `Repositories`, and one row for each CI/CD entry with System `CI/CD`.
  - [x] Keep the exact permission strings as the Permission cell values; do not deduplicate, rename, or turn them into live access checks.
  - [x] Render the Included column as the semantic presentational check/tick required by the UX contract, using the existing approved/requested display context without changing the data model.
- [x] Task 3: Preserve surrounding behavior and visual tokens (AC: 3, 4)
  - [x] Keep the existing `isApprovedStatus()` title logic and card-level status treatment unless the table redesign requires only the explicitly specified layout change.
  - [x] Reuse `Card`, `SectionTitle`, existing MD3/Tailwind color tokens, borders, typography, and the existing Heroicons dependency; do not add a table library or backend endpoint.
  - [x] Ensure long command/permission text wraps or scrolls inside the table container, never on the page.
- [x] Task 4: Verify regression boundaries (AC: 1-4)
  - [x] Confirm the page still renders the existing Progress card and Plan chat aside unchanged; the aside remains `sticky top-16 h-[calc(100vh-4rem)]`.
  - [x] Confirm no duplicate grouped permission chips or old repository grid remain.
  - [x] Run `npm run build` and `npm run lint` from `frontend/`.

## Dev Notes

### Scope and implementation target

- Frontend-only story. Expected primary change: `frontend/src/pages/OnboardingDetailPage.tsx`.
- Do not modify backend routes, persistence, API types, `ProjectRepo`, `ProfilePermissions`, or simulated permission data. The API already supplies all required values.
- This story is the table slice of the Epic 3 redesign. Story 3.6 will restructure the remaining cards; Story 3.7 will add the Viewed collapse state around the resulting reviewable cards. Avoid implementing either story here.
- Story 3.4 is already done and `@heroicons/react@2.2.0` is installed. Do not add another icon package or unrelated icon changes.

### Current code to update and preserve

`frontend/src/pages/OnboardingDetailPage.tsx` currently contains:

- `RepositoriesCard` (around lines 130-157): a responsive `<div>` grid with a hidden-on-small-screen header, repository description, a secondary `Chip` for access, and a code block combining `repo.bootstrap` and `repo.test` with ` · `.
- `PermissionsCard` (around lines 159-177): the title already switches through `isApprovedStatus(record.status)`, but the body uses three `PermissionGroup` chip groups.
- `PermissionGroup` (around lines 179-188): remove or replace it once no consumers remain.
- The page render order currently puts Progress, Repositories, Permissions, checklist cards, and other existing content. Keep this story limited to the two target card bodies; do not duplicate or reorder the remaining plan cards as part of this story.

Preserve:

- `record.project.repositories` ordering and each `ProjectRepo` field (`name`, `description`, `clone_url`, `bootstrap`, `test`). `clone_url` is not a requested table column and should not be added.
- `record.profile.permissions.repositories.access` as the single repository access value applied to repository rows and as the Repositories-system permission row.
- `record.profile.permissions.aws` and `.ci_cd` exact ordering and values.
- `isApprovedStatus(record.status)` and the requested/approved title behavior.
- all existing lifecycle actions, chat behavior, notification behavior, progress calculations, and sticky chat layout.

### Data contract

Source types are duplicated consistently in frontend and backend but must not be changed for this story:

```ts
interface ProjectRepo {
  name: string;
  description: string;
  clone_url: string;
  bootstrap: string;
  test: string;
}

interface ProfilePermissions {
  aws: string[];
  repositories: { access: string };
  ci_cd: string[];
}
```

Recommended row mapping:

| Table | Source | System/Access | Included |
|---|---|---|---|
| Repositories | each `project.repositories` item | `profile.permissions.repositories.access` | not applicable; do not invent an Included repository column |
| Permissions | each `permissions.aws` string | `AWS` | presentational included tick |
| Permissions | `permissions.repositories.access` | `Repositories` | presentational included tick |
| Permissions | each `permissions.ci_cd` string | `CI/CD` | presentational included tick |

The acceptance criteria call the permission column `Included`; the data is simulated and all listed entries are the requested/approved set. Do not add a boolean to the API model or imply that the UI provisions access. A text checkmark or Heroicons check glyph is acceptable if it remains accessible and follows the UX token contract; if an icon is used, it is decorative beside an accessible Included value and should not cause duplicate announcements.

### Architecture and UX compliance

- No `architecture.md` exists in the configured planning artifacts. The governing technical contract for Epic 3 is `_bmad-output/planning-artifacts/epics.md` plus the UX spine:
  - `ux-designs/ux-onboarding-backoffice-2026-07-23/DESIGN.md`, Data table component and Colors sections.
  - `ux-designs/ux-onboarding-backoffice-2026-07-23/EXPERIENCE.md`, page structure and Data table interaction pattern.
- Use the existing React + TypeScript + Tailwind v4 stack. Use native semantic HTML tables; no new table dependency.
- Match the design contract: header typography uses `label-large`, row typography uses `body-medium`, header foreground uses `on-surface-variant`, row dividers use `outline-variant`, and badges/command surfaces may use `surface-variant`.
- The table wrapper must own horizontal scrolling (`overflow-x-auto`). Avoid `overflow-x-auto` only on an individual code cell if that still allows the table/page to expand; use a sensible minimum table width and wrapping/scrolling for long commands.
- Do not introduce the future `success` token in this story unless the existing codebase already has it. Story 3.7 owns the semantic success token and Viewed pattern; the table's Included tick should be implementation-ready for that contract without broad theme work here.

### Testing requirements

- No frontend Jest/Vitest/Playwright setup is configured. Follow the established validation: from `frontend/`, run `npm run build` and `npm run lint`.
- Perform targeted source review/search to verify:
  - both cards use semantic `<table>` structures and required headers;
  - `PermissionGroup`/grouped chip rendering is gone;
  - no `Last synced` field/column or invented permission fields exist;
  - `isApprovedStatus` remains used for the title;
  - `overflow-x-auto` is on each table container.
- If adding a small pure helper to flatten permission rows, keep it local to the page and type it explicitly; do not change API contracts for presentation.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story 3.5: Repositories & Permissions as Data Tables`] — story statement and acceptance criteria.
- [Source: `_bmad-output/planning-artifacts/epics.md#Epic 3: Onboarding Detail Page Redesign`] — sequencing, no-new-backend-endpoints rule, simulated permissions, and UX-DR4.
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/DESIGN.md#Components`] — data-table shell, column definitions, token usage, and scope boundaries.
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/EXPERIENCE.md#Component Patterns`] — table scroll behavior and status-title behavior.
- [Source: `frontend/src/pages/OnboardingDetailPage.tsx:130`] — current repository grid and permission chip implementation to replace.
- [Source: `frontend/src/api/types.ts:1`] — frontend `ProfilePermissions`, `ProjectRepo`, and `OnboardingRecord` contracts.
- [Source: `frontend/src/components/Card.tsx:1`] — existing card primitive and tokens.
- [Source: `frontend/src/components/Chip.tsx:1`] — existing chip primitive; do not retain it for permission grouping.
- [Source: `_bmad-output/implementation-artifacts/3-4-heroicons-icon-library-adoption.md`] — prior story’s dependency and validation conventions.
- [Source: `_bmad-output/project-context.md`] — brownfield, frontend/backend separation, and validation rules.

## Dev Agent Record

### Agent Model Used

Codex GPT-5

### Debug Log References

- Initial backend test invocation was blocked by the sandbox's `tsx` IPC socket restriction (`listen EPERM`); the unchanged `npm test` command passed when rerun with approved elevated execution.

### Implementation Plan

- Replace both visual grouping implementations with native semantic tables and table-local horizontal scrolling.
- Flatten permission arrays locally in `PermissionsCard`, preserving source order and the existing status-label logic without changing API types or backend behavior.
- Validate with targeted structural assertions, frontend build/lint, and the existing backend test suite.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story prepared from the full Epic 3 context, UX design contract, current source/types, prior Story 3.4 implementation, sprint status, and recent git history.
- Replaced the repository grid with a semantic `Repository | Access | Setup` table, including a safe empty state and table-scoped overflow.
- Replaced grouped permission chips with ordered `AWS`, `Repositories`, and `CI/CD` rows in a semantic `Permission | System | Included` table.
- Preserved `isApprovedStatus()` requested/approved labeling, simulated permissions, sticky chat, and all backend/API contracts.
- Validation passed: frontend `npm run build`, frontend `npm run lint`, targeted structural checks, and backend `npm test` (6 tests).
- Resolved review findings: table scroll regions are now keyboard-focusable and named, and both tables include accessible captions.

### File List

- `_bmad-output/implementation-artifacts/3-5-repositories-permissions-as-data-tables.md`
- `frontend/src/pages/OnboardingDetailPage.tsx`

### Change Log

- 2026-07-24: Implemented semantic repository and permissions tables with scoped horizontal overflow; validated frontend and backend checks; marked story ready for review.
- 2026-07-24: Addressed code review findings - 2 patch items resolved; reran frontend and backend validation.

### Review Findings

- [x] [Review][Patch] Make horizontally scrollable table regions keyboard-accessible and explicitly labelled — `frontend/src/pages/OnboardingDetailPage.tsx:140-141,192-193`. On narrow screens, keyboard users need a focusable, named region to discover and operate horizontal scrolling.
- [x] [Review][Patch] Add accessible table captions — `frontend/src/pages/OnboardingDetailPage.tsx:141-146,193-199`. Captions give assistive technology users an explicit purpose for each table beyond the surrounding visual heading.
- [x] [Review][Defer] Duplicate repository names can produce duplicate React keys — `frontend/src/pages/OnboardingDetailPage.tsx:151` — deferred, pre-existing; the prior repository map already keyed rows by `repo.name`, and `ProjectRepo` has no ID field.
