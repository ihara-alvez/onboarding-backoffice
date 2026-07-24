---
baseline_commit: 5a84065504857998296a5b5560269ad5667fca26
---

# Story 3.7: Viewed Checkbox Review Pattern

Status: done

## Story

As a manager,
I want to check off each plan card as I review it and have it collapse out of my way,
so that I can track my review progress like a pull-request file review.

## Acceptance Criteria

1. Given any reviewable card except Progress — First tasks, Onboarding context, Repositories, Permissions, Checklists, Suggested documentation, or Approvals and risks — when it renders, then its header shows an unchecked `Viewed` checkbox by default and the complete card body is visible.

2. Given a reviewable card's `Viewed` checkbox, when the manager checks it, then the card becomes a single-line bar: the body is hidden, the background uses the muted `surface-variant` tone, the shadow is removed or reduced consistently with the UX contract, and the title uses `on-surface-variant` so it is visually dimmed. This must be driven by real React component state, not a CSS-only selector or persisted record field.

3. Given a collapsed Viewed card, when the manager unchecks its checkbox, then the card re-expands to its complete body. The action is always reversible.

4. Given the first semantic `success` color is introduced by this work, when the Viewed checkbox is checked and the Permissions table's Included checkmark renders, then both use the same token `success` with light value `#16a34a`; do not use an untokenized literal color. Preserve the existing Permissions table behavior and use this story to replace its current `text-primary` checkmark styling if needed.

5. Given the manager reloads the page or navigates away and back, when the detail view renders again, then every reviewable card is unchecked and expanded. Viewed state is local UI state only and must not be added to `OnboardingRecord`, API payloads, backend storage, or URL state.

6. Given a collapsed Viewed card, when its markup is inspected with assistive technology, then its body is genuinely absent from the accessibility tree — preferably by not rendering the body, or by using the HTML `hidden` attribute — rather than merely hiding it visually with opacity, height, overflow, or CSS visibility.

7. Given any Viewed checkbox, when the manager navigates to it with the keyboard, then it has a visible focus ring and native checkbox semantics; `Space` toggles it, and the accessible name identifies the card and the `Viewed` action. Use a real `<input type="checkbox">` with an associated `<label>` rather than recreating checkbox behavior with a generic element or ARIA-only state.

8. Given the existing detail page after Stories 3.4–3.6, when this story ships, then the current card order remains exactly: Progress, First tasks, Onboarding context, Repositories, Permissions, Checklists, Suggested documentation, Approvals and risks. Progress remains expanded, has no Viewed checkbox, and is not collapsed.

9. Given the existing plan chat aside, when the manager scrolls the now-collapsible card column, then the aside remains `sticky top-16 h-[calc(100vh-4rem)]`; no chat, API, status-transition, Action Log, or download behavior changes are introduced.

## Tasks / Subtasks

- [x] Add local viewed-card state in `frontend/src/pages/OnboardingDetailPage.tsx` (AC: 2, 3, 5, 8)
  - [x] Use a `Set<string>` or equivalent typed state keyed by stable card identifiers, for example `first-tasks`, `onboarding-context`, `repositories`, `permissions`, `checklists`, `suggested-documentation`, and `approvals-risks`.
  - [x] Reset state when the route/detail record changes if the page component can remain mounted across onboarding IDs; do not let one onboarding's review state appear on another onboarding.
  - [x] Keep Progress outside the state and outside the reviewable-card wrapper.

- [x] Introduce a small reusable reviewable-card/header pattern in the detail page or a concrete local component (AC: 1–3, 6–8)
  - [x] Preserve the existing `Card` primitive and current content components/data sources; wrap them rather than duplicating or rewriting the card content.
  - [x] Render a consistent header with the existing section title and a labeled native checkbox.
  - [x] Render the body only while expanded, or apply `hidden` to the body when collapsed so screen readers do not traverse it.
  - [x] Apply the collapsed classes (`bg-surface-variant`, reduced padding, no shadow, dimmed title) only to the collapsed state; retain the normal Card styling while expanded.
  - [x] Ensure the collapsed layout is genuinely one line/bar while allowing long titles and the checkbox to wrap safely at narrow widths without clipping.

- [x] Apply the pattern to all seven cards in the established order (AC: 1, 8)
  - [x] First tasks uses `record.project.first_tasks` exactly as Story 3.6 implemented it.
  - [x] Onboarding context preserves business goal, architecture summary, and conditional Details fields.
  - [x] Repositories and Permissions preserve the semantic tables, table-local horizontal scrolling, captions, and status-dependent Requested/Approved title.
  - [x] Checklists, Suggested documentation, and Approvals and risks preserve all existing list content and empty states.
  - [x] Do not reintroduce the removed narrative/activity/full-plan cards or duplicate any content.

- [x] Add the semantic success token and use it in both required surfaces (AC: 4)
  - [x] Add `--color-success: #16a34a` to the light-mode `@theme` in `frontend/src/index.css`.
  - [x] Style the checked Viewed control/checkmark and Permissions Included glyph with `text-success` or an equivalent token utility; success is an accent/glyph color, not body text.
  - [x] Do not implement the dark token, theme toggle, or OS preference behavior; those belong to Story 3.8, which will add the dark success counterpart.

- [x] Verify accessibility and regressions (AC: 5–9)
  - [x] Confirm native checkbox keyboard operation and visible `focus-visible` styling.
  - [x] Confirm collapsed bodies are not in the accessibility tree and expanded bodies are restored after unchecking.
  - [x] Confirm reload/remount starts all reviewable cards unchecked and expanded.
  - [x] Confirm the detail page JSX order and sticky chat aside remain unchanged.
  - [x] Run `npm run build` and `npm run lint` from `frontend/`; no test framework is configured, so do not add Jest/Vitest/Playwright setup for this story.

### Review Findings

- [x] [Review][Patch] Collapsed cards retain full vertical padding because `p-3.5` loses to the shared Card primitive's `p-6`; use an explicit override so Viewed cards receive the compact UX treatment [frontend/src/pages/OnboardingDetailPage.tsx:67].
- [x] [Review][Patch] Viewed state survives retry/chat record replacement and can hide newly generated content from review; clear the local Viewed set whenever a replacement record is applied [frontend/src/pages/OnboardingDetailPage.tsx:485,538,545].
- [x] [Review][Patch] Route changes can briefly retain the prior record's Viewed state, and the generic body wrapper plus retained `mt-4` adds redundant spacing; clear the displayed record during route changes and remove redundant child margins [frontend/src/pages/OnboardingDetailPage.tsx:421,662,690,699].

## Dev Notes

### Scope and implementation guardrails

- This is a frontend-only UX state/presentation story. Do not change backend routes, API contracts, `OnboardingRecord`, JSON persistence, status logic, Action Log behavior, chat behavior, or plan download behavior.
- Stories 3.5 and 3.6 already landed the target data tables and eight-card content structure. Extend the shipped implementation in `frontend/src/pages/OnboardingDetailPage.tsx`; do not reconstruct an older version or introduce a second card system.
- Viewed state is intentionally ephemeral. A normal `useState` value is sufficient; do not use localStorage, sessionStorage, query parameters, backend persistence, or a new API field.
- Progress is a live status widget and is explicitly exempt. It must never collapse or show a Viewed checkbox.
- Use stable literal card IDs, not array indexes, because card order is part of the contract and content may be conditionally empty.
- Prefer a native checkbox and label. Native HTML checkbox controls provide built-in semantics and keyboard behavior; use explicit association or label nesting and a descriptive accessible name. [Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/checkbox]

### Current code to read and preserve

- `frontend/src/pages/OnboardingDetailPage.tsx`: owns all detail-card composition, current card components, route lifecycle, history modal, actions, and sticky chat aside. Read the whole file before editing.
- `frontend/src/components/Card.tsx`: expanded card primitive currently supplies `rounded-lg border border-outline-variant p-6 shadow-elevation-1` and surface tokens. Reuse it; do not create a parallel Card component unless a narrowly scoped local wrapper is necessary.
- `frontend/src/index.css`: current light-mode Tailwind v4 `@theme` token definitions. Add only the new `success` light token in this story.
- `frontend/src/api/types.ts`: `OnboardingRecord` and all nested data contracts. No changes are expected.
- `frontend/src/components/ChatPanel.tsx`: chat remains in the existing sticky aside and must not be coupled to viewed state.

### Existing behavior that must remain intact

- Card order is Progress → First tasks → Onboarding context → Repositories → Permissions → Checklists → Suggested documentation → Approvals and risks.
- `record.project.first_tasks`, `record.project.key_docs`, `record.project.risk_notes`, `record.profile.base_checklist`, and `record.profile.approvals_required` must remain complete and rendered once.
- Repositories remains a semantic `Repository | Access | Setup` table with a focusable, labeled, table-local overflow region and caption.
- Permissions remains a semantic `Permission | System | Included` table and continues to switch Requested/Approved wording via `isApprovedStatus(record.status)`. Only the Included glyph color changes to the shared `success` token.
- The detail aside remains exactly `sticky top-16 h-[calc(100vh-4rem)]`; no new sticky implementation is needed.
- Existing Heroicons adoption from Story 3.4 remains in place. Do not add unrelated icons or begin Story 3.8 dark mode.

### UX and accessibility details

- Expanded cards retain the normal surface-container background, border, padding, and elevation. The header can use the existing `SectionTitle` style.
- Collapsed cards use the UX contract's viewed-card treatment: surface-variant background, no/reduced elevation, approximately `p-3.5 px-5` equivalent spacing, and `on-surface-variant` title. Keep the checkbox and title visible.
- The checkbox must be visually clear in both unchecked and checked states. The checked indicator and Permissions Included glyph use `success`; do not use success for explanatory text.
- The focus ring must remain visible against both the card surface and the collapsed muted surface. Avoid `outline-none` without a replacement.
- Do not leave the collapsed body mounted with only `opacity-0`, `max-h-0`, `overflow-hidden`, or off-screen positioning. Conditional rendering or `hidden` is required for the accessibility-tree guarantee.
- Do not make the entire card header a second toggle in a way that competes with the checkbox. The checkbox/label is the review action and must remain independently operable.

### File structure requirements

Expected files to update:

- `_bmad-output/implementation-artifacts/3-7-viewed-checkbox-review-pattern.md`
- `frontend/src/pages/OnboardingDetailPage.tsx`
- `frontend/src/index.css`

Do not modify backend files, API types, package manifests, lockfiles, or unrelated pages. No new dependency is required.

### Previous story intelligence

- Story 3.6 established the final card composition and explicitly deferred Viewed checkboxes to this story and dark mode to Story 3.8. Preserve those scope boundaries.
- Story 3.6 review added `break-words` for long context values and deferred malformed optional-date formatting as pre-existing behavior. Do not regress the wrapping classes or broaden this story into date validation.
- Story 3.5 review made table overflow regions keyboard-accessible and added captions. Preserve both while wrapping the tables.
- Story 3.4 established exact `@heroicons/react@2.2.0` dependency usage and visible focus conventions. Reuse those conventions; no dependency changes are needed.
- Recent commits consistently update the implementation story file and `sprint-status.yaml` alongside the frontend change, and validate with frontend build/lint.

### Architecture and project conventions

- No standalone `architecture.md` was found for this project. The applicable architecture guardrails are in `_bmad-output/project-context.md` and the Epic 3 UX contract.
- React function components and local hooks only; no global state library. Use strict TypeScript, `import type` for type-only imports, 2-space indentation, double quotes, semicolons, and Tailwind utility classes only.
- Keep comments sparse and explain only non-obvious behavior. Existing comments around the progress-stepper alignment are useful and should not be removed casually.
- No frontend test framework is configured. Validation is `npm run build` and `npm run lint` from `frontend/`, plus targeted source/markup checks and manual keyboard/accessibility inspection where available.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story 3.7: Viewed-Checkbox Review Pattern`] — story statement, acceptance criteria, Epic 3 sequencing, and no-new-backend scope.
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/DESIGN.md#components.card-viewed`] — collapsed-card spacing, surface, shadow, and title token.
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/DESIGN.md#components.viewed-checkbox`] — checkbox and success-token contract.
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/DESIGN.md#colors`] — light success value and token semantics.
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/EXPERIENCE.md#component-patterns`] — real component state, reversible collapse, accessibility, and focus expectations.
- [Source: `_bmad-output/implementation-artifacts/3-6-card-restructure-onboarding-context-checklists-suggested-documentation-approvals-risks.md`] — shipped card order, source fields, sticky aside, and deferred scope.
- [Source: `_bmad-output/implementation-artifacts/3-5-repositories-permissions-as-data-tables.md`] — shipped table semantics, overflow accessibility, and captions to preserve.
- [Source: `_bmad-output/implementation-artifacts/3-4-heroicons-icon-library-adoption.md`] — existing icon/dependency and focus conventions.
- [Source: `frontend/src/pages/OnboardingDetailPage.tsx`] — current implementation to extend.
- [Source: `frontend/src/components/Card.tsx`] — shared Card primitive.
- [Source: `frontend/src/index.css`] — current Tailwind v4 light token source.
- [Source: `frontend/src/api/types.ts`] — record/data contracts that must remain unchanged.
- [Source: `_bmad-output/project-context.md`] — project structure, React, styling, TypeScript, and validation rules.
- [Reference: MDN, `<input type="checkbox">`] — native checkbox semantics and label/accessibility guidance: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/checkbox

## Dev Agent Record

### Agent Model Used

Codex GPT-5

### Debug Log References

- Sandboxed `backend/npm test` initially failed because `tsx` could not create its temporary IPC pipe (`listen EPERM`); the unchanged command passed when rerun with approved elevated execution.
- No frontend test framework is configured; validation used the repository's established frontend build/lint checks, backend build/typecheck, backend tests, and targeted source checks.

### Implementation Plan

- Add a reusable local `ReviewableCard` wrapper around the existing detail-page card content.
- Track seven stable card IDs in ephemeral `Set<string>` React state and reset that state on route changes.
- Use native labeled checkboxes with conditional body rendering, collapsed surface styling, visible focus rings, and the shared light-mode success token.
- Preserve all existing record fields, table semantics, card order, sticky chat behavior, and backend/API boundaries.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story prepared from Epic 3, the final UX contract, the current detail-page implementation, Stories 3.4–3.6, project context, sprint status, recent commits, and current native-checkbox accessibility guidance.
- Implemented ephemeral viewed state for all seven reviewable cards using stable IDs; state resets when the detail route changes and is never persisted.
- Added reusable reviewable-card headers with native labeled checkboxes, visible focus rings, reversible collapse, and conditional body rendering that removes collapsed content from the accessibility tree.
- Added `success` light token `#16a34a`, applied it to checkbox accents and the Permissions Included glyph, while leaving dark mode for Story 3.8.
- Preserved the established eight-card order, all card data, semantic table behavior, sticky chat aside, and existing backend/API behavior.
- Validation passed: frontend build, frontend lint, backend build, backend typecheck, backend test suite (6 tests), `git diff --check`, and targeted structural checks.
- Addressed code review findings: compact Viewed-card padding now overrides the shared Card padding, regenerated/chat content resets Viewed state, route changes clear the displayed record, and redundant body margins were removed.

### File List

- `_bmad-output/implementation-artifacts/3-7-viewed-checkbox-review-pattern.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `frontend/src/index.css`
- `frontend/src/pages/OnboardingDetailPage.tsx`

### Change Log

- 2026-07-24: Created comprehensive ready-for-dev story context for the Viewed checkbox review pattern.
- 2026-07-24: Implemented the Viewed checkbox review pattern, success token, accessibility behavior, and regression validation; marked story ready for review.
- 2026-07-24: Addressed code review findings - 3 patch items resolved; reran frontend and backend validation; marked story done.
