---
baseline_commit: 73461ea7a05e40ef16044e6ed3de38c8e6a05719
---

# Story 3.3: Header Meta Links — Project Badge, View History, Download Plan

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a manager,
I want to see which project this onboarding is for, review the full action history, and download the generated plan, all from the page header,
so that I don't need the old Narrative, Activity, or Full-plan cards taking up space in the main content column.

## Acceptance Criteria

1. Given the detail view header, when it renders, then a "Project" badge showing `record.project.name` appears under the employee email/role subline.
2. Given the header's meta-links row, when it renders, then it shows two links: "View history" and "Download plan (.md)", both under the Project badge.
3. Given the manager clicks "View history", when the click is handled, then a client-side modal opens listing the full `record.actionLog` (timestamp, actor, message, in chronological order) — the same content the old `ActionLogCard` rendered — with no new backend route or endpoint.
4. Given the manager clicks "Download plan (.md)", when the click is handled, then a `.md` file download is triggered client-side (Blob + `URL.createObjectURL`) containing `record.narrative ?? record.plan` (the same fallback `FullPlanCard` used), named `<employee-slug>-onboarding-plan.md`, with no new backend endpoint.
5. Given this story ships, when the page renders, then the old Onboarding narrative card, Activity/action-log card, and Full-plan card no longer render anywhere on the page.

## Tasks / Subtasks

- [x] Task 1: Restructure the header subline and add the Project badge (AC: 1)
  - [x] In `frontend/src/pages/OnboardingDetailPage.tsx`'s header block, change the subline from `{record.employeeEmail} · {record.profile.name} · {record.project.name}` to `{record.employeeEmail} · {record.profile.name}` — drop `record.project.name` from this line (it moves to its own badge instead, not a duplicate).
  - [x] Add a small "Project" badge below the subline: a rectangular (not pill-shaped — use `rounded-xs`, NOT `rounded-full`) tag reading "Project" (`bg-primary-container text-on-primary-container`) followed by `record.project.name` as plain text. This is a new visual pattern (`{design.components.project-badge}` per `DESIGN.md`), distinct from the existing pill-shaped `Chip` component — do not reuse `Chip` for this, its `rounded-full` shape is wrong here.
- [x] Task 2: Add the header meta-links row (AC: 2)
  - [x] Below the Project badge (and above or beside the existing "Created {date}" line — keep that line, it's unaffected), add two clickable text links: "View history" and "Download plan (.md)". Style them like existing primary-colored text links (`text-primary`, `text-label-large font-medium`, matching the `Button` component's `variant="text"` styling conventions) — plain `<button type="button">` elements (not `<a>`, since neither triggers real navigation), separated by a `·` matching the subline's existing separator convention.
  - [x] Do NOT add icons to these links in this story — Story 3.4 (Heroicons Icon Library Adoption) explicitly adds Clock/ArrowDownTray icons to these two links afterward; adding icons now would be out of this story's scope and would need redoing.
- [x] Task 3: Implement the Download plan handler (AC: 4)
  - [x] Add a `handleDownloadPlan` function: derive `const plan = record.narrative ?? record.plan;` (same fallback `FullPlanCard` already uses — `plan` is guaranteed a non-null `string` since `OnboardingRecord.plan: string` is non-optional). Build a filename slug from `record.employeeName` (lowercase, replace runs of non-alphanumeric characters with `-`, trim leading/trailing `-` — no slugify library exists in this codebase and none should be added for this). Create a `Blob([plan], { type: "text/markdown" })`, get a URL via `URL.createObjectURL`, create a temporary `<a>` element, set its `href`/`download="<slug>-onboarding-plan.md"`, `document.body.appendChild(a)` it, call `.click()`, then `a.remove()` and `URL.revokeObjectURL(url)` (append-click-remove is the standard robust pattern — there's no existing download precedent elsewhere in this codebase to follow instead). Wire this to the "Download plan (.md)" button's `onClick`. No new backend endpoint.
- [x] Task 4: Build the View history modal (AC: 3)
  - [x] Add local component state: `const [historyOpen, setHistoryOpen] = useState(false);`. Wire "View history"'s `onClick` to `() => setHistoryOpen(true)`.
  - [x] Add a new local component in this same file (matching the file's existing convention of defining helper components like `ActionLogCard`/`FullPlanCard` locally rather than in separate files — there is no modal/dialog/drawer primitive anywhere in this codebase yet, this introduces the first one) — e.g. `HistoryModal({ record, onClose })`. Render conditionally: `{historyOpen && <HistoryModal record={record} onClose={() => setHistoryOpen(false)} />}`. `HistoryModal` only ever exists in the tree while open, so it does NOT need `historyOpen` as a prop.
  - [x] `HistoryModal` renders: a `fixed inset-0 z-50` backdrop (semi-transparent, click-to-close) behind a centered panel (`Card`-styled) listing every `record.actionLog` entry — ALL of them, not just the last 3 — in chronological order (the array's existing order; do NOT `.reverse()` it the way `ActionLogCard`'s "recent" list does). Each entry shows all three fields consistently: `formatDateTime(entry.timestamp)`, `entry.actor === "manager" ? "Manager" : "System"`, and `entry.message` (the old `Collapsible`'s "View all" expansion dropped `actor` — this modal must include it for every entry, fixing that inconsistency as a byproduct, not introducing a new one).
  - [x] **Click-outside-to-close pitfall:** the panel must NOT be a plain child of the same element that carries the backdrop's `onClick={onClose}`, or clicking anywhere inside the panel will bubble up and incorrectly close it. Either check `if (e.target !== e.currentTarget) return;` in the backdrop's click handler, or add `onClick={(e) => e.stopPropagation()}` on the panel wrapper.
  - [x] Accessibility: the panel needs `role="dialog"` and `aria-modal="true"`. Support closing via: clicking the backdrop, a visible close button, and the `Escape` key — attach the `keydown` listener in a `useEffect(() => {...}, [])` INSIDE `HistoryModal` itself (mount/unmount effect, cleaned up on unmount via the returned cleanup function calling `removeEventListener`) — not gated on `historyOpen`, which `HistoryModal` doesn't receive. On mount, move focus onto the close button (e.g. a `ref` + `.focus()` in that same effect); on close, return focus to the "View history" trigger button (e.g. keep a `ref` to that button in the parent and call `.focus()` in the `onClose` callback) — this is the first modal in the codebase, so get this right since later modals will likely copy it. Give the close control a visible focus ring (reuse existing focus-ring conventions from `Button`/`IconButton`).
- [x] Task 5: Remove the three superseded cards (AC: 5)
  - [x] Delete the `<OverviewCard record={record} />` usage (currently line 495) AND the `OverviewCard` function definition itself (currently lines 128+, section title "Onboarding narrative") — it becomes fully dead code, delete it completely rather than leaving it unused.
  - [x] Delete the `<ActionLogCard record={record} />` usage (currently line 496) AND the `ActionLogCard` function definition (currently lines 175-210) completely.
  - [x] Delete the `<FullPlanCard record={record} />` usage (currently line 516) AND the `FullPlanCard` function definition (currently lines 288-297) completely.
  - [x] Remove now-unused imports if any become unused as a result (e.g. `Markdown` was only used by `FullPlanCard` — check whether anything else in the file still uses it before removing its import; `Collapsible` was used by both `ActionLogCard` and `FullPlanCard` — check whether any other card in the file still uses `Collapsible` before removing that import too).
- [x] Task 6: Verify
  - [x] `npm run build` / `npm run lint` in `frontend/`.
  - [x] Manually trace (code-level, see Dev Notes on verification limits in this environment): the badge renders `record.project.name`; the subline no longer repeats it; both links render and are keyboard-focusable; "Download plan" produces a correctly-named `.md` blob download; "View history" opens a dialog listing every `actionLog` entry with all three fields in original (non-reversed) order, closable via backdrop click, close button, and Escape; the three old cards and their component definitions are fully gone (grep for `OverviewCard`, `ActionLogCard`, `FullPlanCard` should return zero matches after this story).

### Review Findings

- [x] [Review][Patch] `HistoryModal`'s Escape-key effect depends on `[onClose]` instead of the spec-mandated `[]`, causing the effect to re-run (re-focusing the close button, removing/re-adding the listener) on every parent re-render while the modal is open — e.g. during chat streaming updates [frontend/src/pages/OnboardingDetailPage.tsx:212-219]. Confirmed independently by both the Acceptance Auditor and Edge Case Hunter. Fix: use a ref to always call the latest `onClose` without needing it in the dependency array.
- [x] [Review][Patch] The "Created {date}" line was merged into the same paragraph as the new "View history"/"Download plan" links, contradicting Task 2's explicit instruction to keep that line unaffected and add the links "above or beside" it, not into the same text run [frontend/src/pages/OnboardingDetailPage.tsx:452-462]. Separate them onto their own line.
- [x] [Review][Patch] Link hover style uses `hover:underline`, diverging from the instructed `Button` `variant="text"` convention (`hover:bg-primary-container/30`, no underline) [frontend/src/pages/OnboardingDetailPage.tsx:457,460]. Align to the actual convention.
- [x] [Review][Patch] Modal close button has no explicit visible focus-ring [frontend/src/pages/OnboardingDetailPage.tsx:237-245]. Add one as a safety net (native default focus outline isn't explicitly suppressed here, but an explicit ring is more robust and was the story's own instruction).
- [x] [Review][Patch] `slugify(record.employeeName)` can return an empty string (name is entirely non-alphanumeric/whitespace), producing a degenerate filename `-onboarding-plan.md` [frontend/src/pages/OnboardingDetailPage.tsx:202-207]. Add a fallback (e.g. `"onboarding"`) when the slug is empty.
- [x] [Review][Patch] Modal overlay uses `z-50`, identical to `Toast.tsx`'s z-index — if a toast fires while the modal is open, stacking order between them is undefined [frontend/src/pages/OnboardingDetailPage.tsx:222]. Bump the modal above it (e.g. `z-[60]`).
- [x] [Review][Patch] No background scroll lock while the modal is open — the page behind the overlay stays scrollable [frontend/src/pages/OnboardingDetailPage.tsx:209-219]. Lock `document.body` overflow on mount, restore on unmount.
- [x] [Review][Defer] "Download plan" link ignores `record.status` — a `blocked` record (failed generation) could produce an empty/unhelpful downloaded file, with no disabled state or warning. Real, but gating this needs a product decision on which statuses should disable/warn — out of this story's stated scope.
- [x] [Review][Defer] `HistoryModal` has no Tab/Shift+Tab focus trap — keyboard focus can leave the dialog onto background controls while `aria-modal="true"` claims otherwise. A real accessibility gap in this first-modal-in-the-codebase, but a full focus trap is a bigger addition than this story's explicit Task 4 accessibility list (role/aria-modal/Escape/focus-on-open/focus-return) called for. Flagged as a follow-up since later modals will likely copy this pattern.
- [x] [Review][Defer] `historyOpen` is not reset when the route's `id` param changes (navigating to a different onboarding while the modal is open leaves it showing the stale record until the new fetch resolves) — the same class of pre-existing gap already deferred in Story 3.1 (other in-flight state not reset on `id` change in the same `useEffect`), not a new pattern introduced here.
- [x] [Review][Defer] Backdrop click can close the modal mid-text-selection-drag (starting a selection inside the panel, releasing outside it) — real but rare/minor.
- [x] [Review][Defer] `HistoryModal` isn't rendered via a portal — currently harmless (no ancestor establishes a clipping/positioning context that would break `fixed inset-0`), but a latent fragility if that ever changes. No portal precedent exists elsewhere in the codebase to follow.

## Dev Notes

- **Expected interim content gap — not a bug.** Removing `OverviewCard` (AC5) deletes the only place `project.business_goal`, `project.architecture_summary`, and the profile/record "Details" fields (`profile.summary`, `startDate`, `buddyEmail`, `seniority`, `location`, `notes`) were shown. Their replacement — the "Onboarding context" card with a Details sub-section — doesn't land until **Story 3.6**. Between this story and 3.6 shipping, that content is simply absent from the page. This is the epic's own intended sequencing (confirmed against `epics.md`), not an oversight to work around — do not add a stopgap card for it.
- **No modal/dialog primitive exists anywhere in this codebase today** — confirmed via repo-wide search (no "fixed inset-0", "role=\"dialog\"", "backdrop", "Modal"/"Dialog"/"Drawer" anywhere). `Collapsible.tsx` is an inline expand/collapse with zero positioning/backdrop/focus-trap — it cannot be repurposed as a modal. This story introduces the first one. `Toast.tsx` is the only other `fixed`-positioned element in the app (bottom snackbar, `z-50`) — match its `z-50` precedent so the modal renders above `TopAppBar.tsx`'s sticky header (`z-10`).
- **No icons in this story.** Story 3.4 (next in the epic) explicitly adds Heroicons Clock/ArrowDownTray to these exact two links — its own AC names them. Adding icons here would be redone by 3.4; don't.
- **No new dependency.** No slugify library exists or should be added — hand-write the filename slug inline (lowercase, collapse non-alphanumeric runs to `-`, trim edges).
- **`record.plan` is a non-optional `string`** (`OnboardingRecord.plan: string`, not `string | null`) — `record.narrative ?? record.plan` is guaranteed a non-null string, safe to pass directly to `new Blob([plan], ...)` with no null-check needed.
- **Reconciling an existing inconsistency, not introducing one:** today, `ActionLogCard`'s "recent 3" list shows actor+timestamp+message, but its `Collapsible` "View all N events" expansion only shows timestamp+message (no actor). The new History modal must show all three fields for every entry — this fixes that inconsistency as a side effect of the modal replacing both.
- **Chronological order, explicitly NOT reversed.** `ActionLogCard`'s "recent" list calls `.slice(-3).reverse()` (newest first) — the History modal must NOT do this; AC3 says "in chronological order," meaning the array's natural (oldest-first, append-only per FR8) order.
- **Scope discipline, per 3.1/3.2's established precedent:** this file has other in-flight, unrelated changes (a chat-UI/layout track: `Card.tsx`, `Markdown.tsx`, `TopAppBar.tsx`, `index.css` modified, `ChatPanel.tsx` new) plus Stories 3.1 and 3.2's already-landed changes, all in this same file. Keep this story's diff to: the header subline/badge/links, the new `handleDownloadPlan` + `HistoryModal`/`historyOpen` state, and the three card removals (Task 5) — do not touch anything else.
- **No test framework is configured** (per `project-context.md`) — verification is `npm run build` + `npm run lint` + careful manual code-tracing, matching Stories 3.1/3.2's precedent. **Live-browser screenshot verification may not be possible in this sandboxed environment** (Story 3.2 hit missing Chromium system libraries with no `sudo` available) — if so, be extra rigorous about tracing the modal's open/close state transitions and Escape-key handling by reading the code path twice rather than trusting an assumption, since a new interactive component is materially higher-risk to get subtly wrong than a CSS-only change.

### Project Structure Notes

- Files to UPDATE: `frontend/src/pages/OnboardingDetailPage.tsx` only — header JSX, new `handleDownloadPlan` function, new `HistoryModal` local component + `historyOpen` state, and removal of `OverviewCard`/`ActionLogCard`/`FullPlanCard` (definitions + usages). Possible import cleanup (`Markdown`, `Collapsible`) if they become unused.
- No new files, no backend changes, no new dependencies.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3: Header Meta Links — Project Badge, View History, Download Plan]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/DESIGN.md#Components] — `project-badge`, `header-meta-links` token notes
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/EXPERIENCE.md#Component Patterns] — "Header meta links" row behavior, "View history" destination decision
- [Source: frontend/src/pages/OnboardingDetailPage.tsx] — current header block, `OverviewCard`, `ActionLogCard`, `FullPlanCard` (all being changed/removed)
- [Source: frontend/src/components/Collapsible.tsx] — confirmed unsuitable as a modal base
- [Source: frontend/src/components/Toast.tsx] — only existing `fixed`-position precedent (z-index convention to match)
- [Source: frontend/src/api/types.ts] — `ActionLogEntry`, `OnboardingRecord` (`plan`, `narrative`, `actionLog`, `project.name`)
- [Source: _bmad-output/implementation-artifacts/3-2-progress-stepper-alignment-fix.md] — prior story; scope-discipline convention and the environment's screenshot-verification limitation

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

`frontend/npm run build`, `frontend/npm run lint` (both clean). One deviation from the story's suggested implementation, caught by `tsc`: the story suggested using `IconButton` (with a `ref`) for the modal's close button, but `IconButton`'s props type doesn't declare a `ref` prop (build failed with `Property 'ref' does not exist on type 'IntrinsicAttributes & IconButtonProps'`). Since this story's scope is `OnboardingDetailPage.tsx` only (not `IconButton.tsx`), used a plain native `<button>` styled identically to `IconButton`'s `default` tone instead of modifying a shared component out of scope. No test framework configured (per `project-context.md`); live-browser verification wasn't attempted given Story 3.2 already established Chromium isn't available in this environment (no sudo) — verified via build/lint plus careful manual code-tracing of the modal's open/close/focus/Escape logic, per the story's own Dev Notes guidance.

### Completion Notes List

- Header: subline no longer repeats `record.project.name` (moved to a new rectangular "Project" badge below it, `rounded-xs`/`primary-container`, distinct from the pill-shaped `Chip`). Added a "View history" / "Download plan (.md)" links row below the badge.
- `handleDownloadPlan`: derives `record.narrative ?? record.plan`, slugifies `employeeName` via a small local `slugify()` helper (no new dependency), builds a Blob and triggers a download via the append→click→remove pattern, then revokes the object URL.
- `HistoryModal`: new local component (first modal/dialog primitive in this codebase). `fixed inset-0 z-50` backdrop with click-outside-to-close (guarded via `event.target === event.currentTarget`, with `stopPropagation` on the panel as well), `role="dialog"`/`aria-modal="true"`, Escape-to-close via a mount/unmount `useEffect`, focus moves to the close button on open and returns to the "View history" trigger button on close (`historyTriggerRef`). Lists every `actionLog` entry (not just the last 3) in original chronological order (no `.reverse()`), showing timestamp + actor + message for every entry — fixing the old `Collapsible` expansion's actor-less inconsistency as a byproduct.
- Removed `OverviewCard`, `InfoItem` (its only caller), `ActionLogCard`, and `FullPlanCard` completely (definitions + usages) — confirmed zero remaining references via grep. Removed the now-unused `Markdown` and `Collapsible` imports (confirmed via grep that nothing else in the file used them).
- Per Dev Notes: the business-goal/architecture-summary/Details content `OverviewCard` used to show has no home until Story 3.6 lands — expected, not a regression to fix here.

### File List

- `frontend/src/pages/OnboardingDetailPage.tsx` (modified)

## Change Log

- 2026-07-23 — Implemented Story 3.3: Project badge + View history modal (first modal primitive in the codebase) + Download plan (.md) link in the header; removed the superseded `OverviewCard`/`ActionLogCard`/`FullPlanCard` (definitions + usages + now-unused imports). All 6 tasks complete, all 5 ACs satisfied. Build/lint clean; one deviation from the story's suggested approach (plain `<button>` instead of `IconButton` for the modal close control, since `IconButton` doesn't accept `ref` and modifying it was out of scope). Status → review.
- 2026-07-23 — Code review: 0 decision-needed, 7 patch, 5 defer, 11 dismissed as noise/expected/matching spec. Two independent reviewers confirmed a real bug (Escape-key effect depended on `[onClose]` instead of `[]`, causing repeated focus-stealing during re-renders) — fixed via an `onCloseRef`. All 7 patches applied: the focus-steal fix, separating the "Created" line from the links row, aligning link hover style to the `Button` `text` variant convention, an explicit focus-visible ring on the modal close button, a `slugify` empty-string fallback, bumping the modal above `Toast`'s z-index, and a background scroll lock while the modal is open. Build/lint reverified clean. Status → done.
