---
baseline_commit: 04bccf8
---

# Story 3.12: Responsive People and Onboarding Detail Layout

Status: ready-for-dev

## Story

As a manager,
I want the People list and onboarding detail page to remain usable at narrow and wide viewport sizes,
so that the workspace does not clip, overlap, or force unexpected page-level scrolling.

## Acceptance Criteria

1. Given a desktop-width viewport, when the detail page renders, then the main content and sticky chat remain in the two-pane layout represented by the reference mockup.
2. Given a tablet or mobile-width viewport, when the detail page renders, then it collapses into a single readable column, with chat in page flow and no clipped fixed-width aside.
3. Given any supported viewport width, when header actions, status chips, tables, chat input, and send button render, then they wrap or resize without horizontal page overflow; tables may scroll within their own container.
4. Given the People list renders at a narrow width, when the manager scans or operates it, then employee identity, status, and primary actions remain readable and usable.

## Tasks / Subtasks

- [ ] Make detail layout responsive (AC: 1–3)
  - [ ] Keep the desktop flexible-main plus sticky chat composition at the chosen desktop breakpoint.
  - [ ] At narrower widths, stack main and chat, remove the fixed-width/shrink constraint, and restore chat to normal page flow.
  - [ ] Keep card/table local overflow contained and prevent page-level horizontal overflow.
- [ ] Make detail header and controls wrap safely (AC: 3)
  - [ ] Review header actions, status chip, metadata links, progress stepper, card headers, and chat composer at narrow widths.
  - [ ] Preserve keyboard focus, accessible labels, existing action availability, and readable button labels.
- [ ] Make People list usable at narrow widths (AC: 4)
  - [ ] Update row/card flex and action layout so identity, status, and delete remain readable without clipping or overlap.
  - [ ] Preserve row navigation and delete click propagation/confirmation behavior.
- [ ] Validate at representative viewport widths
  - [ ] Run frontend build/lint and inspect desktop, tablet, and mobile widths with no document horizontal scrollbar.
  - [ ] Verify repositories/permissions tables scroll only within their labeled regions.

## Dev Notes

### Current layout to extend

- `frontend/src/pages/OnboardingDetailPage.tsx` currently uses an outer `flex items-start gap-6`, a `main` with `max-w-[1100px] flex-1`, and an `aside` with fixed `w-[440px] shrink-0 overflow-hidden` plus `sticky top-16 h-[calc(100vh-4rem)]`. The fixed aside is the primary narrow-viewport risk.
- `frontend/src/components/ChatPanel.tsx` uses a full-height Card with internal flex/overflow behavior. Preserve its internal transcript scrolling; only change its outer layout constraints as necessary.
- `frontend/src/pages/OnboardingListPage.tsx` renders each link as a Card with `flex items-center justify-between gap-4`, identity text, status Chip, and delete IconButton. This must wrap/stack without breaking link/delete event handling.
- `frontend/src/components/TopAppBar.tsx` already uses flex-wrap and hidden navigation at smaller widths, but the action cluster and new-onboarding button must still be checked for overflow.

### Responsive contract

- Desktop keeps the sticky chat beside the main content; tablet/mobile stacks chat below the main content in normal document flow. Do not use a fixed-position or permanently fixed-height mobile aside.
- Choose breakpoints based on content fit and existing Tailwind conventions, not an arbitrary device-specific layout. The UX is desktop/laptop-first with graceful narrow wrapping, not a new mobile information architecture.
- `min-w-0` is required on flexible grid/flex children where long employee names, project names, plan text, URLs, or status labels could otherwise force overflow.
- Preserve `overflow-x-auto` and semantic captions/focusable region wrappers for the Repositories and Permissions tables. Do not shrink table columns until content becomes unreadable and do not allow tables to create page-level overflow.
- Header controls may wrap to multiple rows. Do not shorten required microcopy such as `Approve & send to employee`, `Send for approval`, `Download plan (.md)`, or status labels merely to fit.
- Any CSS used must remain Tailwind utility classes and existing tokens. No inline styles, CSS-in-JS, or new global layout system.

### Regression boundaries

- Preserve sticky behavior at desktop, card order, Viewed state, dark mode, chat streaming, action availability, modal focus restoration, list navigation, and delete confirmation.
- Do not alter backend/API shapes or add mobile-only routes.
- Tables may scroll inside their own containers; the document itself must not gain an unintended horizontal scrollbar.

### Expected files

- Update: `frontend/src/pages/OnboardingDetailPage.tsx`, `frontend/src/pages/OnboardingListPage.tsx`, and possibly `frontend/src/components/ChatPanel.tsx`/`TopAppBar.tsx` if direct constraints require it.
- Read/preserve: `frontend/src/components/Card.tsx`, `Button.tsx`, `Chip.tsx`, `IconButton.tsx`, `index.css`.
- No package or backend changes expected.

### Previous story and UX intelligence

- Stories 3.5–3.8 established local table overflow, eight-card ordering, sticky chat, visible focus, and dark tokens. Responsive work must wrap those shipped patterns rather than recreate content.
- The finalized UX spine explicitly says the detail aside returns to normal flow at tablet/mobile widths; the mock is visual reference only where it conflicts with the spine.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story 3.12: Responsive People and Onboarding Detail Layout`]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/EXPERIENCE.md#Foundation`]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/EXPERIENCE.md#Information Architecture`]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/DESIGN.md#Layout & Spacing`]
- [Source: `_bmad-output/project-context.md#Framework-Specific Rules`]
- [Source: `frontend/src/pages/OnboardingDetailPage.tsx`]
- [Source: `frontend/src/pages/OnboardingListPage.tsx`]
- [Reference: MDN media queries: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries]
- [Reference: MDN overflow-x: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overflow-x]

## Dev Agent Record

### Agent Model Used

Codex GPT-5

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story context identifies the shipped fixed-width aside/list flex constraints and preserves table-local scrolling and desktop sticky behavior.

### File List

- `_bmad-output/implementation-artifacts/3-12-responsive-people-and-onboarding-detail-layout.md`

