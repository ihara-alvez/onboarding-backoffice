---
baseline_commit: d78be5944fed51b39316adb4d35ddf838fff351b
---

# Story 3.4: Heroicons Icon Library Adoption

Status: done

## Story

As a manager,
I want the header and Delete icons to use a consistent, professional icon set,
so that the interface reads as polished rather than a mix of hand-drawn shapes.

## Acceptance Criteria

1. Given the frontend dependencies, when this story ships, then `@heroicons/react` (or an equivalent Heroicons-outline SVG set) is a real, version-pinned production dependency and the frontend lockfile is updated consistently.
2. Given the Delete controls render on the onboarding list and detail pages, when they render, then they use the Heroicons 24px outline `TrashIcon`; the shared hand-drawn `frontend/src/components/TrashIcon.tsx` is deleted and no import or duplicate hand-drawn Trash SVG remains.
3. Given the persistent header renders, when Search and Notifications render, then they use Heroicons outline `MagnifyingGlassIcon` and `BellIcon`, replacing the local hand-drawn SVG helper components in `TopAppBar.tsx`.
4. Given the detail header meta-links from Story 3.3 render, when View history and Download plan render, then each link includes the corresponding Heroicons outline `ClockIcon` and `ArrowDownTrayIcon` respectively, while retaining the existing labels and client-side behavior.
5. Given every icon adopted by this story, when inspected, then it comes from the Heroicons 24/outline set with a `24 24` viewBox and the library’s consistent 1.5 stroke / round linecap / round linejoin treatment; no hand-drawn Search, Bell, or Trash icon remains on the redesigned surfaces.
6. Given the header Search and Notifications buttons render, when the manager hovers or focuses them, then they use the shared circular header-icon affordance (36px control with a surface-variant hover background) without changing their existing labels or placeholder behavior.
7. Given the Story 3.3 View history and Download plan links render, when the manager activates them by mouse or keyboard, then the existing modal/download behavior is unchanged and the added icons are decorative (`aria-hidden="true"`), not a replacement for accessible text labels.
8. Given this story is complete, when the frontend is built and linted, then `npm run build` and `npm run lint` pass with no unused imports, unresolved module imports, or TypeScript errors.

## Tasks / Subtasks

- [x] Task 1: Add the official Heroicons React dependency (AC: 1)
  - [x] Add `@heroicons/react` to `frontend/package.json` under `dependencies` with an exact/pinned version selected from the current package metadata; do not add the deprecated `heroicons-react` package or a whole icon-pack alternative.
  - [x] Update `frontend/package-lock.json` through the project’s normal npm workflow so the root dependency and resolved package metadata agree.
  - [x] Keep the dependency production-scoped because the icons are imported by shipped React components.
- [x] Task 2: Replace the shared Delete icon everywhere (AC: 2, 5)
  - [x] In `frontend/src/pages/OnboardingDetailPage.tsx`, replace the `TrashIcon` import/use inside the existing error-tone `IconButton`; preserve `aria-label`, title, disabled/in-flight behavior, and the existing pulse class while applying the Heroicons component.
  - [x] In `frontend/src/pages/OnboardingListPage.tsx`, replace its `TrashIcon` import/use as well; preserve row deletion behavior, `aria-label`, title, disabled state, and pulse/loading styling.
  - [x] Delete `frontend/src/components/TrashIcon.tsx` only after both imports are migrated.
- [x] Task 3: Replace TopAppBar Search and Notifications SVGs (AC: 3, 5, 6)
  - [x] Import `MagnifyingGlassIcon` and `BellIcon` from `@heroicons/react/24/outline`.
  - [x] Remove the local `SearchIcon` and `BellIcon` helper functions and render the library components in their existing buttons.
  - [x] Preserve `aria-label="Search"`, `aria-label="Notifications"`, the notification dot, and the buttons’ no-op/placeholder behavior.
  - [x] Give Search and Notifications the shared 36px circular header-icon treatment, including visible `focus-visible` styling consistent with existing interactive controls; do not change navigation, account, or New onboarding behavior.
- [x] Task 4: Add icons to Story 3.3 header meta-links (AC: 4, 5, 7)
  - [x] Import `ClockIcon` and `ArrowDownTrayIcon` from `@heroicons/react/24/outline` in `OnboardingDetailPage.tsx`.
  - [x] Add the icons to the existing View history and Download plan buttons without changing their labels, trigger refs, modal focus return, Blob download, filename, or fallback plan content.
  - [x] Keep the links keyboard-focusable buttons and set decorative icon components to `aria-hidden="true"`; the visible text remains the accessible name.
  - [x] Use a consistent icon/text alignment and size that fits the existing `label-large` link row without introducing a new component or changing the `·` separator convention unless required by the existing layout.
- [x] Task 5: Verify no partial migration or regression (AC: 5, 8)
  - [x] Search the frontend source for `TrashIcon`, local `SearchIcon`/`BellIcon` helper definitions, and hand-authored Search/Bell/Trash SVG paths; expected remaining results should be none for the removed helpers/component.
  - [x] Confirm no Sun/Moon theme-toggle implementation is added here; those icons belong to Story 3.8, even though the broader design system lists them.
  - [x] Run `npm run build` and `npm run lint` from `frontend/`.

## Dev Notes

### Story Context and Scope

- This is Epic 3’s dependency/adoption story. Stories 3.1 and 3.3 already introduced the action controls and header meta-links that this story completes with consistent icons.
- Scope is frontend-only: dependency metadata plus existing React component imports/markup. No backend, API, record-shape, route, or persistence changes.
- The migration must cover both current `TrashIcon.tsx` consumers. Deleting the component after updating only the detail page would break `OnboardingListPage.tsx`.
- Do not implement the future Story 3.8 dark-mode toggle or Sun/Moon icons here. The package can support those later, but this story’s adopted runtime surfaces are Delete, Search, Notifications, View history, and Download plan.

### Heroicons Library Guidance

- Use the official package and the 24px outline entry point:
  ```ts
  import {
    ArrowDownTrayIcon,
    BellIcon,
    ClockIcon,
    MagnifyingGlassIcon,
    TrashIcon,
  } from "@heroicons/react/24/outline";
  ```
- Heroicons documents individual React component imports from `/24/outline`; icon components use UpperCamelCase names with an `Icon` suffix. Keep imports selective rather than importing the entire package.
- The official package is MIT licensed and has no runtime dependencies according to its package metadata. Use the current package version resolved at implementation time, but pin the exact version in `package.json` and lockfile so the dependency is reproducible.
- Use Heroicons’ native outline geometry rather than recreating or wrapping the old SVG paths. The library’s 24/outline components provide the intended 24×24 viewBox and 1.5 stroke treatment; do not override stroke width, linecap, or linejoin with ad hoc SVG props.

### Existing Code to Preserve

- `frontend/src/components/IconButton.tsx` remains the shared Delete button primitive. Preserve its circular `h-9 w-9`, tone handling, disabled opacity/cursor, and class composition. Story 3.4 changes only the child icon.
- `frontend/src/pages/OnboardingDetailPage.tsx` currently imports the hand-drawn Trash icon, uses it in the Delete `IconButton`, and owns the Story 3.3 `HistoryModal`, `handleCloseHistory`, `historyTriggerRef`, and `handleDownloadPlan`. Do not move or duplicate these behaviors while adding icons.
- `frontend/src/pages/OnboardingListPage.tsx` has an independent Delete action and must receive the same Heroicons Trash component. Keep its existing row action behavior intact.
- `frontend/src/components/TopAppBar.tsx` currently defines local `SearchIcon` and `BellIcon` SVG helpers. Remove those helpers and retain the existing nav, notification dot, account initials, and New onboarding link.
- Story 3.3 intentionally left the two meta-links icon-free for this story. Add icons to those existing buttons rather than replacing them with anchors, routes, or a new link component.

### Visual and Accessibility Guardrails

- Follow the design contract’s `icon-set` and `header-icon-btn` definitions: Heroicons outline, 24×24 viewBox, 1.5 stroke, round caps/joins; Search/Notifications use a 36px circular control with a surface-variant hover background.
- Icons next to text links are decorative because the visible labels already name the action. Mark them `aria-hidden="true"` and keep the text in the button. The icon-only Search, Notifications, and Delete buttons retain their existing accessible labels/titles.
- Preserve or add a visible `focus-visible` ring for the header icon buttons and meta-link buttons. Keyboard activation must continue to reach the same existing handlers.
- Do not use the mock’s bordered/square Delete button. The real `IconButton`’s circular error-tone styling is authoritative.
- Do not add a second icon color or hard-coded color. Icons inherit `currentColor` from their existing button/link classes.

### File Structure Requirements

Files expected to update:

- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/pages/OnboardingDetailPage.tsx`
- `frontend/src/pages/OnboardingListPage.tsx`
- `frontend/src/components/TopAppBar.tsx`

File expected to delete:

- `frontend/src/components/TrashIcon.tsx`

Do not modify backend files, shared API types, CSS theme tokens, or the Story 3.8 theme state as part of this story.

### Testing and Verification

- This repository has no configured Jest/Vitest/Playwright framework. Follow the established validation pattern: `npm run build` and `npm run lint` from `frontend/`, plus targeted source search for stale icon imports/helpers.
- Verify the list and detail pages both compile after deleting `TrashIcon.tsx`; this is the highest-risk regression because the shared component has two consumers.
- Verify the Story 3.3 behaviors remain wired: clicking View history opens the existing modal and returns focus appropriately; clicking Download plan still creates the same `.md` download.
- Verify icon-only controls retain accessible names and that decorative icons do not create duplicate screen-reader announcements.

### Project Structure Notes

- React components are function components with TypeScript strictness and `verbatimModuleSyntax`; use normal value imports for icon components and do not add type-only imports for them.
- Styling uses Tailwind utility classes and existing MD3 tokens from `frontend/src/index.css`; do not introduce inline styles or a new icon abstraction for this small migration.
- `frontend/package.json` currently has no icon dependency. Avoid `react-icons`, deprecated `heroicons-react`, or an equivalent package unless the official package cannot satisfy the required icons.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story 3.4: Heroicons Icon Library Adoption`] — user story, acceptance criteria, and Epic 3 sequencing.
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/DESIGN.md#Components`] — `icon-set`, `header-icon-btn`, `icon-button-error`, and `header-meta-links` visual contract.
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/EXPERIENCE.md#Component Patterns`] — icon-library behavior and accessibility expectations.
- [Source: `_bmad-output/implementation-artifacts/3-3-header-meta-links-project-badge-view-history-download-plan.md`] — existing meta-link handlers, modal, focus return, and download behavior to preserve.
- [Source: `_bmad-output/implementation-artifacts/3-1-header-action-bar-always-visible-status-aware-actions.md#Dev Notes`] — existing IconButton/Delete guardrails and prior explicit scope boundary for Heroicons.
- [Source: `frontend/src/pages/OnboardingDetailPage.tsx`] — current detail Delete and Story 3.3 meta-link implementations.
- [Source: `frontend/src/pages/OnboardingListPage.tsx`] — second current consumer of `TrashIcon.tsx`.
- [Source: `frontend/src/components/TopAppBar.tsx`] — current hand-drawn Search/Bell helpers and header controls.
- [Source: `frontend/src/components/IconButton.tsx`] — shared Delete button primitive.
- [Source: `frontend/src/components/TrashIcon.tsx`] — component to remove after all consumers migrate.
- [Source: `frontend/package.json`] — frontend dependency and script conventions.
- [Heroicons React package documentation](https://www.npmjs.com/package/@heroicons/react) — official `/24/outline` imports, naming, package version, and MIT license.

## Dev Agent Record

### Agent Model Used

Codex GPT-5

### Debug Log References

- The initial sandboxed `npm install` could not resolve the npm registry (`EAI_AGAIN`); the same pinned command succeeded with approved network access.
- No Jest/Vitest/Playwright framework is configured in this repository, so validation used the established build, lint, dependency, and targeted source-search checks.

### Implementation Plan

- Add the exact `@heroicons/react@2.2.0` production dependency and regenerate the lockfile with npm.
- Replace all in-scope hand-drawn icon consumers with selective 24/outline Heroicons imports while preserving handlers, labels, loading states, and existing controls.
- Validate stale helper removal, dependency resolution, TypeScript/Vite build, and oxlint.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story prepared from the final Epic 3 UX contract, current source tree, Story 3.1/3.3 implementation learnings, project-context rules, recent git history, and current official Heroicons package guidance.
- Adopted exact `@heroicons/react@2.2.0` as a production dependency and updated the lockfile.
- Migrated Delete, Search, Notifications, View history, and Download plan surfaces to Heroicons 24/outline; preserved existing behavior and accessibility labels.
- Verified targeted stale-helper search, `npm run build`, `npm run lint`, and `npm ls @heroicons/react --depth=0` successfully.
- Resolved the code-review finding by allowing the header and trailing controls to wrap responsively without reducing the 36px icon affordances; build and lint still pass.

### File List

- `_bmad-output/implementation-artifacts/3-4-heroicons-icon-library-adoption.md`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/components/TopAppBar.tsx`
- `frontend/src/components/TrashIcon.tsx` (deleted)
- `frontend/src/pages/OnboardingDetailPage.tsx`
- `frontend/src/pages/OnboardingListPage.tsx`

### Change Log

- 2026-07-24: Added pinned Heroicons dependency and migrated the story’s Delete, header, and detail meta-link icons; verified build and lint.
- 2026-07-24: Resolved the code-review responsive header overflow finding.

### Review Findings

- [x] [Review][Patch] Header icon controls can contribute to narrow-viewport overflow [frontend/src/components/TopAppBar.tsx:63-91] — **Medium**, source: Edge Case Hunter. The right-side header group now wraps within the responsive header while preserving the required 36px Search/Notifications affordances.
