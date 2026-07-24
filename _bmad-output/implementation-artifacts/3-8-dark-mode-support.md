---
baseline_commit: 373b1f6fe73117b66c3033c6cf6f1ac5cb65c098
---

# Story 3.8: Dark Mode Support

Status: done

## Story

As a manager,
I want to switch the onboarding workspace to a dark theme,
so that I can use the tool comfortably in low-light conditions or per my own preference.

## Acceptance Criteria

1. Given the existing light-mode token set in `frontend/src/index.css`, when this story ships, then a complete parallel dark-mode token set exists for every semantic color role used by the redesigned workspace. It includes the Story 3.7 `success` token and the `review-container` / `on-review-container` pending-approval chip pair.
2. The dark token values match the finalized UX contract:
   - `primary-dark: #9db8f5`, `on-primary-dark: #0a2757`, `primary-container-dark: #1d3f8f`, `on-primary-container-dark: #dce6ff`
   - `secondary-dark: #b0b8c4`, `on-secondary-dark: #1f242c`, `secondary-container-dark: #3a4149`, `on-secondary-container-dark: #e3e7ed`
   - `surface-dark: #0f141b`, `surface-container-dark: #1a2029`, `on-surface-dark: #e6e9ee`, `surface-variant-dark: #242b35`, `on-surface-variant-dark: #a6adb8`
   - `error-dark: #ff8a80`, `on-error-dark: #4e0b04`, `error-container-dark: #6b1710`, `on-error-container-dark: #ffd9d4`
   - `outline-dark: #5b6472`, `outline-variant-dark: #333a44`, `review-container-dark: #4d3a10`, `on-review-container-dark: #fbd991`, `success-dark: #4ade80`
3. A sun/moon toggle appears in the persistent header between Search and Notifications and uses the existing `@heroicons/react` outline `SunIcon` / `MoonIcon` components. It is a native keyboard-operable button with an accessible label/state.
4. Clicking the toggle changes the whole rendered app surface between light and dark immediately, without a route change or page reload. Existing semantic Tailwind classes (`bg-surface`, `text-on-surface`, `bg-primary-container`, etc.) continue to be used; do not introduce per-component hardcoded light/dark hex colors or inline styles.
5. Before a manual choice exists, initial theme selection follows `window.matchMedia("(prefers-color-scheme: dark)")`. If the OS preference changes while there is no manual choice, the app follows the new preference; once a manual choice is stored, OS changes no longer override it.
6. After the manager toggles at least once, the chosen theme is persisted client-side (for example, `localStorage`) and is restored on reload and revisits. Malformed/unavailable storage must fail safely to the system preference and must not prevent the app from rendering.
7. The pending-approval status chip uses semantic `review-container` / `on-review-container` tokens in both modes. All existing status text remains present; color is never the sole status signal.
8. Existing Story 3.7 behavior remains intact in both modes: all seven reviewable cards start expanded, Viewed state is local and reversible, collapsed bodies are removed from the accessibility tree, and checked Viewed controls plus Permissions Included ticks use `success` in light mode and `success-dark` in dark mode. Success remains an accent/glyph only, never text.
9. Existing header actions, meta links, modal history, plan download, progress stepper, tables, chat panel, sticky aside, loading/error states, and lifecycle action behavior continue to work in both themes. No backend/API/type contract changes are introduced.
10. Every light/dark text pair meets WCAG AA at its actual text size, including the review chip pair. `success` / `success-dark` are evaluated as non-text UI accents at the 3:1 bar against their surrounding surfaces. Header controls, meta links, and the theme toggle retain visible focus rings in both modes.

## Tasks / Subtasks

- [x] Define and wire the complete light/dark semantic color system in `frontend/src/index.css` (AC: 1, 2, 4, 7, 8, 10)
  - [x] Preserve the inherited light values exactly; add dark values from the UX contract rather than inventing a second palette.
  - [x] Add a `review`/pending-approval Chip tone backed by `review-container` tokens; keep primary/secondary/error status mappings unchanged.
  - [x] Establish one root theme hook (class or data attribute) so Tailwind semantic utilities resolve consistently across the app shell, body, cards, tables, modal, and chat.
  - [x] Replace any workspace-specific hardcoded amber treatment (notably Approvals and risks in `OnboardingDetailPage.tsx`) with semantic review tokens. Audit literal colors in shared surfaces touched by the detail route; do not repurpose `success` for text or agent-status copy.
- [x] Implement theme state and persistence at the app-shell level (AC: 3, 4, 5, 6)
  - [x] Add local React state/hooks only; do not add a global state library or backend preference field.
  - [x] Initialize from stored manual preference when valid, otherwise from `prefers-color-scheme`.
  - [x] Listen for system preference changes only while no manual preference exists, and clean up the `MediaQueryList` listener.
  - [x] Persist only `"light"` / `"dark"`; tolerate storage access errors.
  - [x] Apply the theme before/at first render as far as the current app structure permits to minimize a flash of the wrong theme.
- [x] Add the header toggle and accessible icon states (AC: 3, 4, 10)
  - [x] Update `TopAppBar.tsx` between Search and Notifications, reusing existing circular header icon-button styling and focus treatment.
  - [x] Show Sun when light is active and Moon when dark is active, with `aria-label` and an explicit pressed/state indication understandable to assistive technology.
  - [x] Keep Search, Notifications, Account, New onboarding, and all existing navigation behavior unchanged.
- [x] Update affected shared/detail components to consume semantic tokens (AC: 4, 7, 8, 9, 10)
  - [x] Review `OnboardingDetailPage.tsx`, `Chip.tsx`, `Card.tsx`, `Button.tsx`, `IconButton.tsx`, `ChatPanel.tsx`, `ProgressLog.tsx`, and `index.css` for classes that become unreadable or visually inconsistent in dark mode.
  - [x] Preserve Heroicons usage from Story 3.4 and Viewed-card styling/state from Story 3.7; do not rebuild either pattern.
  - [x] Keep the Plan chat aside `sticky top-16 h-[calc(100vh-4rem)]` and preserve client-side history/download behavior.
- [x] Verify the result (AC: 8, 9, 10)
  - [x] Run `npm run build` and `npm run lint` from `frontend/`.
  - [x] Use targeted source checks/manual inspection for both theme states, all six onboarding statuses, pending-approval chip, Viewed checked/collapsed cards, permissions ticks, modal, chat input/read-only states, and error/loading surfaces.
  - [x] Verify keyboard focus/activation for the theme toggle and that no horizontal/route regressions appear.

## Dev Notes

### Developer Context

This is the final story in Epic 3 and is a visual/system integration change over the shipped Stories 3.1–3.7 implementation. The app has no auth or user profile service, so theme preference is deliberately per-browser client state. The UX contract scopes the redesign to the onboarding detail/workspace experience, but the header lives in the shared app shell; the theme mechanism should therefore be mounted where all routed surfaces can inherit it without duplicating state.

Do not add a backend endpoint, database field, API type, route, dependency, or new icon library. `@heroicons/react` is already pinned at `2.2.0`; use its existing outline components.

### Current Implementation to Extend

- `frontend/src/index.css`: Tailwind v4 CSS-first `@theme` with the inherited light MD3-flavored tokens and `--color-success: #16a34a`; `body` and `#root` establish the page background/min-height.
- `frontend/src/App.tsx`: shared `min-h-screen bg-surface` shell, `TopAppBar`, and routed `Outlet`; likely theme-provider/root-attribute integration point.
- `frontend/src/components/TopAppBar.tsx`: sticky global header with Heroicons Search/Bell, account badge, and New onboarding link; insert the toggle between Search and Notifications.
- `frontend/src/components/Chip.tsx`: currently supports only `secondary`, `error`, and `primary`; add the pending-review tone without changing existing callers.
- `frontend/src/components/Card.tsx`, `Button.tsx`, `IconButton.tsx`: shared primitives whose token utilities must remain usable in both modes and whose focus/disabled behavior must not regress.
- `frontend/src/pages/OnboardingDetailPage.tsx`: uses the semantic token classes throughout, but the Approvals and risks card still has `border-amber-200 bg-amber-50` and amber text classes. It also owns the six-status action bar, progress stepper, history modal, seven Viewed cards, permissions Included tick, and sticky chat aside.
- `frontend/src/components/ChatPanel.tsx` and `ProgressLog.tsx`: shared detail-route surfaces that contain chat containers, inputs, error states, and a deliberately dark agent-console treatment. Audit contrast and preserve the terminal-like console semantics; do not map terminal text to the success text role.

### Theme Implementation Guardrails

- Prefer a single `data-theme="dark"` or equivalent root marker and CSS variable reassignment over duplicating dark utility classes on every component. The marker must be applied to a stable root ancestor of `body`/`#root` consumers and removed for light mode.
- Tailwind v4 `@theme` variables generate the semantic utilities used by the current code. Keep the public utility names stable (`bg-surface`, `text-on-surface`, `border-outline-variant`, etc.) while changing the values by theme; do not make components choose hex values.
- If the implementation uses separate `*-dark` custom properties, map the active semantic variables (`--color-primary`, etc.) to the selected set at the root so existing classes remain unchanged. Ensure the active variables also drive `body` background and text.
- Manual preference must distinguish “no preference” from an explicit light choice; a missing key is not equivalent to light. Validate stored values before use.
- Avoid reading `localStorage` or `matchMedia` in a way that breaks SSR-like/test environments or initial module evaluation. Browser APIs should be guarded and failures should fall back safely.
- Do not use `window.location`, navigation, reloads, or backend persistence to change themes.

### Architecture Compliance

No standalone `architecture.md` exists. Apply `_bmad-output/project-context.md` as the architecture authority:

- React function components and hooks only; local state, no global state library.
- Strict TypeScript with explicit types and `import type` for type-only imports.
- Tailwind utility classes referencing tokens from `frontend/src/index.css`; no inline `style` and no hardcoded component colors.
- Existing frontend validation is `npm run build` and `npm run lint`; no test framework is configured, so do not introduce Jest/Vitest/Playwright as part of this story.
- Keep comments sparse and explain only non-obvious behavior, such as why a system media-query listener is disabled after manual preference.

### File Structure Requirements

Expected primary files to update:

- `frontend/src/index.css` — active semantic variables, light/dark token sets, review/success tokens, and root theme CSS behavior.
- `frontend/src/App.tsx` or a small directly imported theme hook/component under `frontend/src/` — app-shell theme state and root marker, if a separate module improves clarity.
- `frontend/src/components/TopAppBar.tsx` — toggle UI and Heroicons Sun/Moon.
- `frontend/src/components/Chip.tsx` — pending-approval review tone.
- `frontend/src/pages/OnboardingDetailPage.tsx` — replace amber literals and preserve all existing detail behavior.
- Shared components such as `Card.tsx`, `Button.tsx`, `IconButton.tsx`, `ChatPanel.tsx`, or `ProgressLog.tsx` only if the audit identifies a concrete theme/contrast issue.

Do not update backend files, API types, package manifests/lockfiles, route definitions, unrelated navigation behavior, or the Story 3.7 story file unless implementation evidence requires a narrowly scoped documentation correction.

### Previous Story Intelligence

Story 3.7 established `--color-success: #16a34a` and the reusable `ReviewableCard` pattern. It resets `viewedCards` on route changes, retry, and chat refresh; preserve those resets. Its collapsed card overrides shared Card padding with `!p-3.5 !px-5`, removes the body from rendering, uses `bg-surface-variant`, dims the title to `text-on-surface-variant`, and keeps the native checkbox/focus ring. Dark mode must extend these exact states, not replace them.

Story 3.6 review added `break-words` for long context values and intentionally deferred malformed optional-date formatting; do not broaden scope or regress wrapping. Story 3.5 made table overflow regions keyboard-accessible and added captions; preserve both. Story 3.4 established exact `@heroicons/react@2.2.0` usage and visible focus conventions; no dependency change is needed.

### Git Intelligence

Recent implementation commits are direct, focused changes on `main`/`epic-3-onboarding-workspace`:

- `373b1f6 Complete viewed checkbox review pattern`: updated the story file, `sprint-status.yaml`, `frontend/src/index.css`, and `OnboardingDetailPage.tsx`; validated frontend build/lint plus backend checks.
- `5a84065 Complete Story 3.6 card restructure`, `5d1e1cb Implement repository and permission tables`, and `993d443 Adopt Heroicons for Epic 3 surfaces`: established the current card, table, Heroicons, token utility, and story-documentation patterns.

Keep this story’s diff focused on theme infrastructure and the required token consumers. Do not revert or duplicate those prior changes.

### Testing Requirements

There is no configured frontend test runner. Required validation:

1. From `frontend/`, run `npm run build` and `npm run lint`.
2. Inspect or manually exercise light and dark modes with OS preference set to each value, then toggle manually and reload.
3. Verify missing/invalid storage and storage access failure do not blank the app; if practical, use browser devtools to simulate these cases.
4. Check contrast for all text token pairs at their actual rendered sizes, including `pending_approval`, blocked/error containers, disabled outlined buttons, modal, chat input, and the `Approvals and risks` card.
5. Keyboard-only check: Tab to the theme toggle, activate with Enter/Space, confirm visible focus in both themes, and verify Search/Notifications/meta links/Viewed checkboxes remain reachable.
6. Confirm the detail route still renders all six status states, the history modal, plan download, sticky chat aside, tables, and Story 3.7 collapse behavior.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story 3.8: Dark Mode Support`] — story statement, acceptance criteria, Epic 3 sequencing, and no-new-backend scope.
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/DESIGN.md#colors`] — authoritative light/dark token values and success/review semantics.
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/DESIGN.md#components.dark-mode-toggle`] — toggle placement, icon states, and theme marker behavior.
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/EXPERIENCE.md#component-patterns`] — system preference, manual override, persistence, and keyboard behavior.
- [Source: `_bmad-output/implementation-artifacts/3-7-viewed-checkbox-review-pattern.md`] — shipped success token and reviewable-card state that dark mode must preserve.
- [Source: `_bmad-output/project-context.md`] — React, Tailwind v4, TypeScript, file structure, and validation rules.
- [Source: `frontend/src/index.css`] — current light token definitions.
- [Source: `frontend/src/App.tsx`] — shared app shell.
- [Source: `frontend/src/components/TopAppBar.tsx`] — current header icon/button layout.
- [Source: `frontend/src/pages/OnboardingDetailPage.tsx`] — current detail page behavior and hardcoded approval/risk colors.
- [Reference: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme] — browser OS preference behavior.
- [Reference: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage] — client-side persistence behavior and failure considerations.

## Dev Agent Record

### Agent Model Used

Codex GPT-5

### Implementation Plan

- Add a local `useTheme` hook at the shared app shell to resolve stored preference, system preference, and live system changes.
- Keep existing Tailwind semantic utility names stable by overriding their CSS variables under `:root[data-theme="dark"]`.
- Add the pending-review semantic Chip tone and retheme the approvals/risk card while preserving all Story 3.7 state and detail-page behavior.
- Add the accessible Heroicons theme toggle between Search and Notifications.

### Debug Log References

- Sandboxed backend tests initially failed because `tsx` could not create its temporary IPC pipe (`listen EPERM`); the unchanged test command passed when rerun with approved elevated execution.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Implemented light/dark semantic token switching with the finalized UX palette, including review and success tokens.
- Added app-shell theme detection, OS preference listening, safe localStorage persistence, and the accessible Sun/Moon toggle.
- Added the pending-approval review chip tone and semantic review treatment for approvals/risk content.
- Preserved Story 3.7 Viewed-card behavior, permissions ticks, action bar, history/download flows, tables, chat, and sticky aside.
- Validation passed: frontend build, frontend lint, backend build, backend typecheck, backend test suite (6 tests), generated-CSS/source checks, and `git diff --check`.

### File List

- `_bmad-output/implementation-artifacts/3-8-dark-mode-support.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `frontend/src/theme.ts`
- `frontend/src/App.tsx`
- `frontend/src/components/TopAppBar.tsx`
- `frontend/src/components/Chip.tsx`
- `frontend/src/index.css`
- `frontend/src/statusDisplay.ts`
- `frontend/src/pages/OnboardingDetailPage.tsx`

### Change Log

- 2026-07-24: Implemented dark-mode support, theme persistence/system preference handling, review tokens, and header toggle; validated frontend and backend regressions.

### Review Findings

- [x] [Review][Patch] Dark mode leaves rendered Markdown on the light `prose-slate` palette — fixed with dark semantic typography variables in `frontend/src/index.css`.
- [x] [Review][Patch] The New onboarding header link lacks a visible keyboard focus ring — fixed with the shared visible focus treatment in `frontend/src/components/TopAppBar.tsx`.
- [x] [Review][Patch] Remove the light-mode `data-theme` marker — fixed by deleting the root marker for light mode in `frontend/src/theme.ts`.
- `_bmad-output/implementation-artifacts/3-8-dark-mode-support.md`
