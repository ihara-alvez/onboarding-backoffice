---
baseline_commit: 5d1e1cb0e5cc197b602818458271e7f27715b7895
---
# Story 3.6: Card Restructure — Onboarding Context, Checklists, Suggested Documentation, Approvals & Risks

Status: done

## Story

As a manager,
I want the generated onboarding plan content organized into clearly labeled cards in a sensible order,
so that I can review the complete plan without hunting for sections or wondering whether content was omitted.

## Acceptance Criteria

1. Given the onboarding detail page main content column, when it renders, then cards appear in this exact order: Progress, First tasks, Onboarding context, Repositories, Permissions, Checklists, Suggested documentation, Approvals and risks. Nothing renders below Approvals and risks.

2. Given the First tasks card, when it renders, then it lists every item in `record.project.first_tasks` in full. Do not fabricate fields such as due dates; no such data exists on `Project`/`ProjectRepo`.

3. Given the Onboarding context card, when it renders, then it contains these labeled subsections:
   - Business goal: `record.project.business_goal`.
   - Architecture summary: `record.project.architecture_summary`.
   - Details: `record.profile.summary` as the role focus, plus `record.startDate`, `record.buddyEmail`, `record.seniority`, `record.location`, and `record.notes` only when each value is present, matching the old conditional `OverviewCard` behavior.

4. Given the Checklists card, when it renders, then it contains two labeled sub-lists, Day 1 from `record.profile.base_checklist.day_1` and Week 1 from `record.profile.base_checklist.week_1`, with every item shown in full.

5. Given the Suggested documentation card, when it renders, then it lists every item in `record.project.key_docs` in full.

6. Given the Approvals and risks card, when it renders, then it contains two labeled sub-lists: Approvals required from `record.profile.approvals_required` and Project risk notes from `record.project.risk_notes`, with every item shown in full.

7. Given the current shipped page, when this story is implemented, then the old duplicated/separate presentation is superseded: there is one First tasks card, one Onboarding context card, one combined Checklists card, one Suggested documentation card, and one Approvals and risks card. No content is silently dropped and no content is rendered twice.

8. Given the main content column becomes longer, when the manager scrolls the page, then the existing Plan chat panel remains sticky (`sticky top-16 h-[calc(100vh-4rem)]` on the detail page aside). This story must preserve and verify that behavior; it does not require a new sticky implementation.

## Tasks / Subtasks

- [x] Refactor the main content composition in `frontend/src/pages/OnboardingDetailPage.tsx` (AC: 1, 7)
  - [x] Keep `ProgressCard` first.
  - [x] Move First tasks into its own `Card` immediately after Progress.
  - [x] Add the Onboarding context card after First tasks.
  - [x] Keep the existing Repositories and Permissions cards next.
  - [x] Replace the two-card Day 1/Week 1 layout with one Checklists card containing both labeled lists.
  - [x] Render Suggested documentation as its own card.
  - [x] Keep Approvals and risks last, with no trailing card or content section.
- [x] Implement the Onboarding context content without changing the API contract (AC: 3, 7)
  - [x] Reuse the existing `SectionTitle`/`Card` conventions.
  - [x] Render business goal and architecture summary from `record.project`; do not regenerate or parse markdown.
  - [x] Preserve all legacy Details fields and conditional rendering semantics from the removed `OverviewCard`.
  - [x] Show a safe empty state for absent/empty list data where the existing `BulletList` convention does so; do not invent placeholder values.
- [x] Consolidate checklist and list rendering (AC: 4–6)
  - [x] Use `record.profile.base_checklist.day_1` and `.week_1` exactly as provided.
  - [x] Keep list items complete; do not truncate or add completion/persistence behavior.
  - [x] Render `record.project.key_docs`, `record.profile.approvals_required`, and `record.project.risk_notes` exactly once.
  - [x] Keep the current repository and permission table markup/data behavior unchanged except for their position in the page.
- [x] Preserve surrounding page behavior and scope boundaries (AC: 8)
  - [x] Leave the existing sticky chat aside intact.
  - [x] Do not add Viewed checkboxes/collapse state; that is Story 3.7.
  - [x] Do not add dark-mode tokens/toggle; that is Story 3.8.
  - [x] Do not add backend endpoints, persistence fields, migrations, or new dependencies.
- [x] Verify (AC: 1–8)
  - [x] Run `npm run build` from `frontend/`.
  - [x] Run `npm run lint` from `frontend/`.
  - [x] Trace the rendered JSX order and confirm each source field appears once.
  - [x] Confirm no old `OverviewCard`/separate checklist-pair/combined first-task-documentation layout remains.
  - [x] Confirm the detail page aside still contains `sticky top-16 h-[calc(100vh-4rem)]` and no page-level horizontal-scroll regression is introduced.

### Review Findings

- [x] [Review][Patch] Long unbroken context text can overflow the card on narrow layouts [frontend/src/pages/OnboardingDetailPage.tsx:241-245,251-256] — added `break-words` to the context paragraphs and Details values; frontend build and lint pass.
- [x] [Review][Defer] Malformed optional start dates render as `Invalid Date` [frontend/src/pages/OnboardingDetailPage.tsx:252] — deferred, pre-existing date formatting behavior; new records are validated by the backend and the existing `formatDate` helper is shared behavior.

## Dev Notes

### Implementation guardrails

- This is a brownfield React + TypeScript + Tailwind v4 UI change. The expected implementation file is `frontend/src/pages/OnboardingDetailPage.tsx`; no backend change is needed.
- The current page already renders `ProgressCard`, `RepositoriesCard`, `PermissionsCard`, two independent `ChecklistCard`s, a combined First tasks/Suggested documentation card, and Approvals and risks. The required work is composition and content-card restructuring, not new data fetching.
- The current page already has the desired sticky chat wrapper:

  ```tsx
  <aside className="sticky top-16 h-[calc(100vh-4rem)] w-[440px] shrink-0 overflow-hidden">
  ```

  Preserve this exact behavior while making the main column longer.
- `Card` already supplies the project-wide surface, border, radius, padding, and elevation. Reuse it rather than creating a parallel card primitive.
- `SectionTitle` is a local helper in `OnboardingDetailPage.tsx`; use it for card and subsection headings to keep typography consistent.
- `BulletList` already handles empty arrays with `None.`. Reuse it for list-shaped content unless a specific visual requirement requires a small local wrapper.
- Do not add a slugifier, icon library, modal, checkbox, state store, or other dependency. Heroicons is already installed and was handled by Story 3.4; it is not part of this story.

### Data contract and field mapping

The frontend types in `frontend/src/api/types.ts` are the source of truth:

| UI content | Exact field | Notes |
|---|---|---|
| First tasks | `record.project.first_tasks` | Array of strings; show all items, no fabricated metadata |
| Business goal | `record.project.business_goal` | Full generated text |
| Architecture summary | `record.project.architecture_summary` | Full generated text |
| Role focus | `record.profile.summary` | Details subsection; this was previously shown by `OverviewCard` |
| Start date | `record.startDate` | Optional; show only when present |
| Buddy | `record.buddyEmail` | Optional; show only when present |
| Seniority | `record.seniority` | Optional; show only when present |
| Location | `record.location` | Optional; show only when present |
| Notes | `record.notes` | Optional; show only when present |
| Day 1 checklist | `record.profile.base_checklist.day_1` | Full list |
| Week 1 checklist | `record.profile.base_checklist.week_1` | Full list |
| Suggested documentation | `record.project.key_docs` | Full list |
| Approvals required | `record.profile.approvals_required` | Full list |
| Project risk notes | `record.project.risk_notes` | Full list |

Do not change `OnboardingRecord`, `Profile`, `Project`, or backend plan generation. These fields are already fetched in the existing `getOnboarding` response.

### Existing components and behavior to preserve

- `ProgressCard` must remain first and retain `buildProgressEntries`, status-chip behavior, blocked-state messaging, and read-time progress semantics from Epic 1.
- `RepositoriesCard` and `PermissionsCard` were implemented in Story 3.5. Preserve their table columns, horizontal scrolling containers, permission label switching through `isApprovedStatus(record.status)`, and current content mapping. Only move their cards into the required order.
- The permissions Included checkmark currently uses the existing styling. Do not introduce the future `success` token in this story; Story 3.7 owns that cross-card review accent.
- Header actions, Project badge, View history, Download plan, Heroicons, chat streaming, status transitions, and delete behavior are already implemented by earlier stories. Do not refactor them as part of this card-only change.
- The chat is status-aware and sticky. A longer main column must not change chat input/streaming behavior, `otherActionInFlight`, or `anyActionInFlight` logic.

### Architecture compliance

No standalone `architecture.md` exists. The project’s architecture decisions are represented by the epic/UX artifacts and current source tree:

- Frontend: React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4, with local components under `frontend/src/components` and page composition under `frontend/src/pages`.
- Backend/API is out of scope. The local JSON store and existing `OnboardingRecord` response remain untouched.
- Keep data read-only in this story. There is no new mutation, endpoint, route, persistence, or authorization concern.
- Preserve accessibility semantics already present in the page: headings, list markup, table captions/scopes, and keyboard-focusable controls. Do not turn full content into visually truncated text; the UX contract requires full content by default.
- The UX contract’s “Viewed” checkbox behavior is intentionally a later story. Do not pre-implement it here or couple this composition to a future `Set` of viewed card IDs.

### File structure requirements

Expected update:

- `frontend/src/pages/OnboardingDetailPage.tsx` — card helper(s) and the JSX composition near the main content column.

Expected no-change scope:

- `frontend/src/api/types.ts`
- `frontend/src/api/client.ts`
- `backend/**`
- `frontend/src/components/Card.tsx`
- `frontend/src/components/ChatPanel.tsx`
- `frontend/src/index.css`
- `frontend/package.json` and lockfile

If a helper becomes materially reusable outside this page, pause and assess scope; the existing codebase favors local helpers for this page and this story does not require extraction.

### Testing requirements

There is no configured frontend test framework in `project-context.md` or `frontend/package.json`. Verification is therefore build/lint plus code-level tracing, matching prior Epic 3 stories:

- `cd frontend && npm run build`
- `cd frontend && npm run lint`
- Verify the exact card order in the returned JSX.
- Verify every listed data field is present and no old duplicate rendering remains.
- Verify optional Details values are conditionally rendered and an empty list does not throw.
- Verify the chat aside remains sticky and the long main column remains the scrollable page region.
- If a browser is available, inspect narrow and wide layouts; do not introduce page-level horizontal overflow. Live-browser screenshot verification may be unavailable in this environment because prior work found missing Chromium system libraries.

## Previous Story Intelligence

### Story 3.5 — Repositories & Permissions as Data Tables

- Status: done.
- It modified `frontend/src/pages/OnboardingDetailPage.tsx` and sprint tracking only.
- It established table patterns with `overflow-x-auto`, `role="region"`, focusable table containers, captions, scoped headers, and no backend changes.
- Preserve its table implementation and permission mapping. The Story 3.6 change should not regress repository setup commands (`bootstrap`/`test`) or the Requested/Approved permission label.

### Story 3.4 — Heroicons Icon Library Adoption

- Status: done; `@heroicons/react` is pinned at `2.2.0`.
- Do not modify dependency files or icon adoption as part of this story.

### Story 3.3 — Header Meta Links / Old-card removal

- Status: done.
- It removed the old `OverviewCard`, `ActionLogCard`, and `FullPlanCard` from the page. Its notes explicitly identify Story 3.6 as the intended home for the removed Overview content: business goal, architecture summary, and Details fields.
- Do not resurrect those superseded cards. Implement their required content in the new Onboarding context card only.

## Git Intelligence

Recent commits show Epic 3 is being implemented incrementally on the current branch:

- `5d1e1cb` — Implement repository and permission tables.
- `993d443` — Adopt Heroicons for Epic 3 surfaces.
- `c1855be` — Complete chat UI/audit implementation and detail-page redesign.

The established pattern is small, focused changes to the existing detail page, followed by frontend build/lint verification. Keep this story similarly focused; avoid broad refactors while several Epic 3 stories share the same page.

## Latest Technical Information

- The repository is already on Tailwind CSS v4 and uses `@theme` tokens in `frontend/src/index.css`. Tailwind’s official guidance confirms `@theme` variables generate corresponding utility classes; use existing utilities/tokens rather than adding ad-hoc CSS for this story. [Source: https://tailwindcss.com/docs/theme]
- React’s official guidance supports conditional rendering/mounting for content that should or should not be present. For this story, render the required card structure directly from the existing record; do not introduce a CSS-only hiding mechanism or future Viewed-state behavior. [Source: https://react.dev/learn/conditional-rendering]
- No dependency upgrade or latest-version migration is required. The pinned versions in `frontend/package.json` are the project’s implementation baseline.

## References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story 3.6: Card Restructure — Onboarding Context, Checklists, Suggested Documentation, Approvals & Risks`]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/DESIGN.md#Layout & Spacing`]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/EXPERIENCE.md#Component Patterns`]
- [Source: `frontend/src/pages/OnboardingDetailPage.tsx`]
- [Source: `frontend/src/api/types.ts#OnboardingRecord`]
- [Source: `frontend/src/components/Card.tsx`]
- [Source: `frontend/src/components/Button.tsx`]
- [Source: `_bmad-output/implementation-artifacts/3-5-repositories-permissions-as-data-tables.md`]
- [Source: `_bmad-output/implementation-artifacts/3-4-heroicons-icon-library-adoption.md`]
- [Source: `_bmad-output/implementation-artifacts/3-3-header-meta-links-project-badge-view-history-download-plan.md`]
- [Source: `_bmad-output/project-context.md`]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Add page-local helpers for the Onboarding context and combined Checklists cards.
- Recompose the main column in the required acceptance-criteria order while preserving existing table, header, chat, and sticky-aside behavior.
- Validate with frontend build/lint, backend build/typecheck/tests, and targeted source tracing because no frontend test framework is configured.

### Debug Log References

- `npm run build` in `frontend/` — passed.
- `npm run lint` in `frontend/` — passed.
- `npm run build` in `backend/` — passed.
- `npm run typecheck` in `backend/` — passed.
- `npm test` in `backend/` — 6 tests passed. Initial sandbox run hit an IPC `EPERM`; rerun with the approved sandbox escalation passed.
- Source tracing confirmed card order and sticky aside class; no old `ChecklistCard`, `OverviewCard`, or combined First tasks/Suggested documentation composition remains.

### Completion Notes List

- Implemented the exact card order: Progress, First tasks, Onboarding context, Repositories, Permissions, Checklists, Suggested documentation, Approvals and risks.
- Added Business goal, Architecture summary, and conditional Details fields using the existing `OnboardingRecord` snapshot; no API or backend changes.
- Consolidated Day 1 and Week 1 into one Checklists card and separated First tasks from Suggested documentation.
- Preserved repository/permission tables, permission status labeling, and sticky Plan chat behavior.
- Kept Viewed checkboxes and dark mode out of scope for Stories 3.7 and 3.8.
- All acceptance criteria and tasks validated; story is ready for code review.
- Applied the code-review patch for narrow-layout wrapping; no unresolved high/medium findings remain.

### File List

- `frontend/src/pages/OnboardingDetailPage.tsx` (modified)
- `_bmad-output/implementation-artifacts/3-6-card-restructure-onboarding-context-checklists-suggested-documentation-approvals-risks.md` (updated)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (updated)

### Change Log

- 2026-07-24 — Story context created and marked ready-for-dev.
- 2026-07-24 — Implemented card restructure and validated frontend/backend checks; status → review.
- 2026-07-24 — Applied code-review wrapping fix; review complete and status → done.
