---
baseline_commit: 73461ea7a05e40ef16044e6ed3de38c8e6a05719
---

# Story 3.1: Header Action Bar — Always-Visible Status-Aware Actions

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a manager,
I want Approve, Complete, and Delete always present in the header — enabled or disabled based on the onboarding's current status — instead of only the one currently-valid action appearing,
so that I always see the full set of lifecycle actions and understand at a glance which ones apply right now.

## Acceptance Criteria

1. Given an onboarding in `draft`, when the detail view renders, then the Approve-slot button shows label "Send for approval", is enabled, and calls `handleSendForApproval`; Complete renders disabled (outlined variant); Retry does not render; Delete renders enabled (subject to the existing `anyActionInFlight` guard).
2. Given an onboarding in `pending_approval`, when the detail view renders, then the Approve-slot button shows label "Approve & send to employee", is enabled, and calls `handleApprove`; Complete renders disabled (outlined variant); Retry does not render.
3. Given an onboarding in `ready_for_day_1` or `completed`, when the detail view renders, then both the Approve-slot and Complete buttons render disabled (outlined variant); Retry does not render.
4. Given an onboarding in `in_progress`, when the detail view renders, then the Approve-slot button renders disabled (outlined variant); Complete renders enabled (filled variant) and calls `handleComplete`; Retry does not render.
5. Given an onboarding in `blocked`, when the detail view renders, then both Approve-slot and Complete render disabled (outlined variant); Retry renders enabled (filled variant) and calls `handleRetry` — the only status where Retry appears.
6. Given the currently-applicable action in the Approve-slot/Complete pair (or Retry, when shown), when it renders, then it uses the Button component's filled variant; the inapplicable member of the pair renders the outlined variant, disabled — not the same filled button dimmed by opacity alone.
7. Given any action (approve/send-for-approval/retry/complete/delete/chat-send) is in flight, when Delete is evaluated, then it is disabled, matching today's `anyActionInFlight` guard — unchanged behavior.
8. Given the manager clicks Delete, when the click is handled, then the existing `window.confirm()` guard still fires before deletion proceeds — unchanged.

## Tasks / Subtasks

- [x] Task 1: Derive header action-bar state from `record.status` (AC: 1, 2, 3, 4, 5)
  - [x] In `frontend/src/pages/OnboardingDetailPage.tsx`, add local derived values ahead of the header JSX: `canSendForApproval = record.status === "draft"`, `canApprove = record.status === "pending_approval"`, `approveSlotEnabled = canSendForApproval || canApprove`, `approveLabel` (`"Send for approval"` vs `"Approve & send to employee"` based on `canSendForApproval`), `approveHandler` (`handleSendForApproval` vs `handleApprove`), `canComplete = record.status === "in_progress"`, `canRetry = record.status === "blocked"`.
  - [x] Also derive the Approve-slot's loading state explicitly: `const approveInFlight = canSendForApproval ? sendingForApproval : approving;` and `const approveLoadingLabel = canSendForApproval ? "Sending..." : "Approving...";` — these feed the button's rendered children in Task 2, preserving today's existing "Sending..."/"Approving..." loading text (currently at `OnboardingDetailPage.tsx:434-435`) which no AC calls out explicitly but must not be silently dropped.
  - [x] Do NOT reuse `isApprovedStatus()` for this — it groups `{ready_for_day_1, in_progress, completed}` and excludes `pending_approval`, which is a different grouping than the Approve-slot needs. Derive fresh booleans as above.
- [x] Task 2: Replace the one-button-at-a-time header JSX with always-rendered buttons (AC: 1, 2, 3, 4, 5)
  - [x] Replace the current mutually-exclusive conditional block (`{record.status === "draft" && ...}` / `"pending_approval"` / `"blocked"` / `"in_progress"`) with: an always-rendered Approve-slot Button (children: `{approveInFlight ? approveLoadingLabel : approveLabel}`), an always-rendered Complete Button (children: `{completing ? "Completing..." : "Mark complete"}`, unchanged from today), a conditionally-rendered (`canRetry &&`) Retry Button (children: `{retrying ? "Retrying..." : "Retry generation"}`, unchanged from today), and the existing Delete IconButton unchanged.
- [x] Task 3: Wire the filled/outlined variant swap and disabled guards (AC: 6, 7)
  - [x] `Button.tsx` already supports `variant="filled"` and `variant="outlined"` — no component change needed. Set the Approve-slot's `variant={approveSlotEnabled ? "filled" : "outlined"}` and Complete's `variant={canComplete ? "filled" : "outlined"}`; Retry (when shown) is always `variant="filled"` since it only ever renders when applicable.
  - [x] Every button's `disabled` prop must combine `anyActionInFlight` with its own applicability: Approve-slot `disabled={anyActionInFlight || !approveSlotEnabled}`, Complete `disabled={anyActionInFlight || !canComplete}`, **Retry `disabled={anyActionInFlight}`** (do not omit this — `canRetry &&` only controls whether Retry renders at all, not whether it's clickable while another action is in flight; the current shipped code already guards it this way at `OnboardingDetailPage.tsx:436` and this story must not regress it).
- [x] Task 4: Verify in-flight and confirm-dialog behavior are untouched (AC: 7, 8)
  - [x] Confirm `otherActionInFlight`/`anyActionInFlight` (lines ~418-419) are NOT modified — no new state flags are introduced by this story; the existing five flags (`sendingForApproval`, `approving`, `retrying`, `completing`, `deleting`) plus `sendingChat` already cover every action this story touches.
  - [x] Confirm `handleDelete`'s `window.confirm(...)` call is untouched.
- [x] Task 5: Verify
  - [x] `npm run build` / `npm run lint` in `frontend/`.
  - [x] Manually check all six `OnboardingStatus` values render the correct button combination/enabled-state/variant per AC 1-5 (use existing seed/demo records or temporarily edit `backend/data/onboardings.json` to exercise each status).

### Review Findings

- [x] [Review][Decision] Approve-slot's label falls back to "Approve & send to employee" whenever disabled (`ready_for_day_1`, `blocked`, `completed`) — reads oddly on a `blocked` or `completed` record even though the button is inert. AC3/AC5 only require "disabled, outlined," not specific label text for the disabled case. [frontend/src/pages/OnboardingDetailPage.tsx:426] — **Resolved:** user chose per-status label text (option 1b). Disabled Approve-slot now shows "Approved" for the approved-territory statuses (`ready_for_day_1`/`in_progress`/`completed`, via `isApprovedStatus()`) and "Approval unavailable" for `blocked`.
- [x] [Review][Decision] Neither the Approve-slot nor Complete button explains why it's disabled (no `title`/tooltip) for statuses where they don't apply — a manager sees a greyed-out button with no affordance for what would enable it. Not required by any AC. [frontend/src/pages/OnboardingDetailPage.tsx:444-457] — **Resolved:** user chose to add tooltips (option 2b). Both buttons now get a status-specific `title` explaining why they're disabled (undefined/no tooltip when enabled).
- [x] [Review][Defer] In-flight action state (`approving`/`sendingForApproval`/`retrying`/`completing`) is not reset when navigating to a different onboarding (`id` changes) — pre-existing gap in the `[id]` effect (only chat state is reset there today), not introduced by this story. [frontend/src/pages/OnboardingDetailPage.tsx:315-324]
- [x] [Review][Defer] Approve/SendForApproval/Complete handlers have no internal `record.status` guard — now that their buttons render (disabled) for every status rather than being conditionally unmounted, the only client-side protection is the `disabled` HTML attribute. Real risk is low: the backend already rejects invalid-status transitions server-side (Stories 1.3/1.4/1.5's ACs), so a bypassed disabled state would surface an error, not corrupt data.

## Dev Notes

- **`Button.tsx` already has both variants needed — do not add a new one.** Full current file: `variant?: "filled" | "outlined" | "text"`, with `filled`/`outlined` styles already defined. This story is purely about *which* variant each button gets and *when* each is enabled, not new component work.
- **No new async/loading state.** `otherActionInFlight = sendingForApproval || approving || retrying || completing || deleting` and `anyActionInFlight = otherActionInFlight || sendingChat` (lines ~418-419) already fold in every flag this story's buttons need. Do not add new `useState` flags — reuse the five that already exist.
- **`isApprovedStatus()` (`frontend/src/statusDisplay.ts`) is the wrong grouping for this story** — it returns true for `{ready_for_day_1, in_progress, completed}` only, excluding `pending_approval`. The Approve-slot's "is this status one where Approve/Send-for-approval applies" question is a *different* grouping (`draft` OR `pending_approval`) — derive it fresh per Task 1, do not misapply the existing helper.
- **Working tree already has uncommitted changes to this exact file** (in-flight chat-UI/layout work: `Card.tsx`, `Markdown.tsx`, `TopAppBar.tsx`, `index.css`, `OnboardingDetailPage.tsx` all modified; `ChatPanel.tsx` untracked/new; see `git status`). Read the file's current on-disk state before editing — do not assume it matches the last commit (`73461ea`) exactly.
- **No icon library work here.** Delete keeps its existing hand-rolled `TrashIcon.tsx` for now — Heroicons adoption is Story 3.4's scope, not this one. Don't jump ahead.
- **Currently, `ready_for_day_1` and `completed` render zero action buttons besides Delete** — this story is what introduces disabled-but-visible Approve-slot/Complete buttons for those statuses (AC3), a real behavior change, not just a refactor of existing conditionals.

### Project Structure Notes

- Files to UPDATE: `frontend/src/pages/OnboardingDetailPage.tsx` only (the header-actions JSX block and its immediately-preceding derived-state declarations).
- No new files, no backend changes, no new dependencies.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1: Header Action Bar — Always-Visible Status-Aware Actions]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/EXPERIENCE.md#State Patterns] — status→button matrix this story implements
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/DESIGN.md#Components] — `button-primary`/`button-outlined` token notes (filled↔outlined swap, not opacity-only)
- [Source: frontend/src/pages/OnboardingDetailPage.tsx] — current header actions block (lines ~418-441) being replaced
- [Source: frontend/src/components/Button.tsx] — existing `filled`/`outlined`/`text` variants, no change needed
- [Source: frontend/src/components/IconButton.tsx] — Delete's existing component, unchanged
- [Source: frontend/src/statusDisplay.ts] — `isApprovedStatus`/`statusTone`, explicitly NOT the grouping this story needs
- [Source: frontend/src/api/types.ts] — `OnboardingStatus` six-value union

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

None — no failures encountered. Verification: `frontend/npm run build`, `frontend/npm run lint` (both clean), plus an ad-hoc `npx tsx -e '...'` script deriving `approveSlotEnabled`/`approveLabel`/`canComplete`/`canRetry` for all six `OnboardingStatus` values, confirming the matrix matches AC 1-5 exactly (per project convention — no test framework is configured in this repo, per `project-context.md`, so verification follows the build/lint/manual-derivation pattern established in prior stories, e.g. Story 1.6).

### Completion Notes List

- Replaced the one-button-at-a-time header block in `OnboardingDetailPage.tsx` with always-rendered Approve-slot and Complete buttons (individually enabled/disabled per status, filled↔outlined variant swap) plus a conditionally-rendered Retry button — Delete unchanged.
- Derived `canSendForApproval`/`canApprove`/`approveSlotEnabled`/`approveLabel`/`approveHandler`/`approveInFlight`/`approveLoadingLabel`/`canComplete`/`canRetry` locally from `record.status`, explicitly avoiding `isApprovedStatus()` (wrong grouping for this story, per Dev Notes).
- Retry's `disabled={anyActionInFlight}` guard preserved exactly as shipped — this was the one gap the fresh-context quality review caught in the story file before implementation began, so no regression was introduced.
- No changes to `otherActionInFlight`/`anyActionInFlight` computation, `handleDelete`'s confirm dialog, `Button.tsx`, or `IconButton.tsx` — all reused as-is per the story's scope.

### File List

- `frontend/src/pages/OnboardingDetailPage.tsx` (modified)

## Change Log

- 2026-07-23 — Implemented Story 3.1: always-visible, status-aware header action bar (Approve-slot/Complete/Delete always rendered, Retry conditional, filled/outlined variant swap). All 5 tasks complete, all 8 ACs satisfied and verified. Status → review.
- 2026-07-23 — Code review: 2 decision-needed, 0 patch, 2 defer, 9 dismissed as noise. Both decisions resolved per user choice — disabled Approve-slot now shows status-aware label text ("Approved"/"Approval unavailable") and both Approve-slot/Complete buttons get a `title` tooltip explaining why they're disabled. Build/lint reverified clean. Status → done.
