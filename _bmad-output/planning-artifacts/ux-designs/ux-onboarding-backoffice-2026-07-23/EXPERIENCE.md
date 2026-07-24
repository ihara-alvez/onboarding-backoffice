---
name: onboarding-backoffice
status: final
sources:
  - _bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/.memlog.md
  - _bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/mockups/onboarding-detail.html
updated: 2026-07-23
---

# Onboarding Backoffice — Experience Spine

> Scoped redesign of the onboarding detail/workspace view (reached via the "People" nav item) plus its related People/list presentation. The follow-up decisions extend the v6 detail contract to cover chat submission/outcomes, persisted-plan refresh, responsive behavior, simplified permissions, and human-readable list statuses. Paired with `DESIGN.md` (this system's token/component deltas over the existing MD3/Tailwind base). Where this spine, `DESIGN.md`, and the confirmed mock (`mockups/onboarding-detail.html`, v6) disagree, **the two spines win** — the mock is a Discovery-stage visual reference, not the contract.

## Foundation

Responsive web, desktop/laptop viewport only (`[ASSUMPTION]`, unchanged — no dedicated mobile IA; narrow-viewport wrapping is graceful but not designed for). Existing MD3-flavored Tailwind v4 system (`frontend/src/index.css`), now with a full parallel **dark-mode token set** (`DESIGN.md` Colors) — this REVERSES the earlier "single light theme only" assumption; dark mode was explicitly requested and is in scope. Internal HR/manager backoffice tool — no external/consumer exposure, no regulated data — accessibility floor targets WCAG AA basics, not a regulated-grade audit. No auth/role system exists today (single implicit "manager" actor, no login); this pass keeps the page role-agnostic exactly as shipped — see Open Questions, unchanged from the earlier draft. `DESIGN.md` is the token/visual reference; this file is the behavior and flow spine.

## Information Architecture

| Surface | Reached from | Purpose | In scope this pass? |
|---|---|---|---|
| Onboarding list | "People" nav (top level) | Browse/search all onboardings | No — untouched |
| **Onboarding detail/workspace** | Row click from the list | Single onboarding: record + Plan chat, side by side | **Yes — this spine** |
| Plans / Tasks / Reports / Settings (nav tabs) | Top nav | Placeholders / other areas of the app | No — untouched |

Within the onboarding detail/workspace page, top to bottom:

1. **Page header** — eyebrow ("People / Onboarding workspace"), employee name, email · role subline, `{design.components.project-badge}` ("Project: <name>"), then one line with two `{design.components.header-meta-links}`: "View history" and "Download plan (.md)". Header action bar (status chip + Approve-slot/Complete/Delete + conditional Retry) sits top-right.
2. **Onboarding progress** — stepper, alignment-fixed per `DESIGN.md`. The one card exempt from the Viewed-checkbox pattern.
3. **First tasks** (`project.first_tasks`) — directly under Progress, the manager's most actionable near-term content.
4. **Onboarding context** (three labeled sub-sections: Business goal `project.business_goal`, Architecture summary `project.architecture_summary`, and Details) — restores content that briefly had no home after the old narrative card was dropped; placed here per `generate_onboarding_plan()`'s section order (business goal/architecture precede permissions/repos in the generated plan). The **Details** sub-section is a RESOLVED gap: it carries `profile.summary` ("Role focus") and, when present, `record.startDate` / `buddyEmail` / `seniority` / `location` / `notes` — the exact fields the old `OverviewCard` rendered, each conditionally shown only when present, same as today. This is the only card that mixes generator-output content (business goal/architecture) with record-level metadata (Details) — a deliberate exception, not a pattern to replicate elsewhere.
5. **Repositories** (`{design.components.data-table}`: Repository | Access | Setup).
6. **Permissions** (`{design.components.data-table}`: Permission | System).
7. **Checklists** (`profile.base_checklist.day_1` + `.week_1`, two labeled sub-lists).
8. **Suggested documentation** (`project.key_docs`).
9. **Approvals and risks** (`profile.approvals_required` + `project.risk_notes`, two labeled sub-lists).

Every card in steps 3–9 renders FULL content by default and carries a Viewed checkbox (see Component Patterns) — there is no truncation and no separate detail view anywhere in this list.

**Fully resolved, nothing left as "holdover."** The earlier draft's Open Question ("holdover cards below Permissions — Day 1/Week 1 checklist, Approvals and risks, Full plan — not addressed by Discovery, left unchanged") is now closed: Checklists and Approvals-and-risks got the full treatment above; Full plan was dropped entirely in favor of the header's "Download plan (.md)" link (see Component Patterns). Nothing renders below Approvals and risks.

Removed from the page entirely, with no replacement card: Onboarding narrative (superseded by Project badge + Onboarding context), Activity/action-log (superseded by "View history" link), Agent console (never built — redundant with chat's "Running tools"), Full plan (superseded by "Download plan (.md)" link), Plan generation note / MVP-status disclaimer (dropped outright — briefly added mid-Discovery, then explicitly removed with no replacement).

**RESOLVED** (was flagged as a new gap during the rewrite): `profile.summary` ("Role focus") and, when present, `record.startDate` / `buddyEmail` / `seniority` / `location` / `notes` — rendered today by `OverviewCard` — now live in Onboarding context's **Details** sub-section (see item 4 above), conditionally shown exactly as today. Nothing from the current page disappears silently.

The Plan chat pane (`ChatPanel.tsx`) sits persistently alongside the main column, now `position:sticky` on desktop. At tablet/mobile widths it returns to normal page flow below the main content so it is not clipped by the fixed-width aside.

→ Composition reference: [`mockups/onboarding-detail.html`](mockups/onboarding-detail.html) (v6, user-confirmed). Note: the mock predates the Details sub-section decision (item 4 above) — that content is spine-only, not visually mocked. Spines win on conflict.

## Voice and Tone

Microcopy only — visual voice lives in `DESIGN.md`.

| Do | Don't |
|---|---|
| "Viewed" (checkbox label, unchecked and checked alike — GitHub's own convention) | "Reviewed" / "Done" / "Mark as read" |
| "View history" | "See activity log" / "Show more" |
| "Download plan (.md)" | "Export" / "Full plan" (the card this replaces is gone, don't resurrect its name) |
| "Approve & send to employee" (real button label, kept in full even though the mock abbreviates it to "Approve" for space) | Silently adopting the mock's shorthand as the real copy |
| "Send for approval" (draft-status label in the same header slot) | A brand-new label unrelated to the existing `handleSendForApproval` copy |
| Status chip/list text: centralized human-readable labels ("Pending approval", "Ready for day 1", "In progress", "Blocked") | Raw snake_case values or cutesy status labels |
| Same tone manager-to-manager and manager-to-system (no persona split — none is defined yet) | Inventing a distinct tone for a role that hasn't been designed |

## Component Patterns

Behavioral specs. Visual specs live in `DESIGN.md.components`.

| Component | Use | Behavioral rules |
|---|---|---|
| Header action bar | Page header | Approve-slot, Complete, Delete always render; each individually enabled/disabled per the State Patterns table below. Approve-slot swaps label+handler by status: "Send for approval"/`handleSendForApproval` (draft) ↔ "Approve & send to employee"/`handleApprove` (pending_approval and beyond, disabled). Retry renders ONLY when `status === "blocked"` — never rendered-but-disabled. Within the Approve-slot/Complete pair, the currently-applicable one renders Button `variant="filled"` (enabled); the other renders `variant="outlined"` (disabled) — a real variant swap, not just a disabled-opacity dim (confirmed against the mock's per-status states-strip). Delete disables while `anyActionInFlight` (approve/retry/complete/delete/chat-send in flight) and keeps its `window.confirm` guard — unchanged concurrency rule. |
| Header meta links | Page header, under Project badge | "View history": RESOLVED — opens a modal/drawer listing the full action log (`record.actionLog`: timestamp, actor, message — the exact content the old `ActionLogCard` rendered), client-side only, no new route/page. Consistent with this redesign's "stay on this page" throughline. "Download plan (.md)": client-side, no new backend endpoint. `record.narrative ?? record.plan` (the exact fallback `FullPlanCard` used) already holds the full markdown text in the fetched `OnboardingRecord`; construct a `Blob`/`URL.createObjectURL` download of that text as `<employee-slug>-onboarding-plan.md` when clicked. |
| Viewed checkbox + card collapse | Every card except Progress (First tasks, Onboarding context, Repositories, Permissions, Checklists, Suggested documentation, Approvals and risks) | Unchecked (default) → full card, all content visible. Checked → card collapses to `{design.components.card-viewed}`'s single-line bar (body hidden, background/padding/title change per `DESIGN.md`). Uncheck to re-expand — always reachable, never a one-way action. **State management, load-bearing:** must be real component state (e.g. `Set<string>` of viewed card ids, toggled on click, driving conditional render of each card's body) — the mock's `:has()` CSS trick has no React equivalent and must not be copied verbatim; in fact the mock's own v5 had a bug where the checkbox didn't even drive the collapse (memlog entry 41) before v6 fixed the mock itself with `:has()` — the REAL implementation needs actual state either way. |
| Viewed-state persistence | Same cards | `[ASSUMPTION]` local UI state only for this pass — like GitHub's per-viewer "Files changed" state, it is NOT written to `OnboardingRecord` and resets on page reload/navigation away and back. Not a backend field, not part of the API contract. Revisit if cross-session persistence is wanted — not decided here. |
| Data table (Repositories / Permissions) | Repositories, Permissions cards | Horizontally scrollable container (`overflow-x:auto`), never causes page-level horizontal scroll. Permissions card title still swaps "Requested permissions" ↔ "Approved permissions" via the existing `isApprovedStatus()` check, behavior unchanged. |
| Progress stepper | Onboarding progress card | Read-only, reflects `record.status` and `record.actionLog` (via `buildProgressEntries`) — no click-to-jump interaction, no Viewed checkbox. Updates in place immediately after any status-changing action (Approve, Complete, Retry) without navigation/reload. |
| Project badge | Page header | Static, read-only display of `record.project.name`. No click/navigation target (no project detail page exists in scope). |
| Dark-mode toggle | Header, between Search and Notifications | `[ASSUMPTION]` — manual toggle overrides OS `prefers-color-scheme` once the user sets it explicitly, persisted client-side (e.g. `localStorage`); before any manual choice, the page follows system preference by default. Icon swaps Sun (light active) ↔ Moon (dark active), per `{design.components.dark-mode-toggle}`. Flagged for confirmation, not locked in — same status as the earlier draft's original note on this, carried forward unresolved. |
| Icon library | Delete, Download plan, View history, Search, Notifications, dark-mode toggle | Heroicons outline (24×24 viewBox, stroke-width 1.5, round caps/joins) — a genuinely new npm dependency (`@heroicons/react` or equivalent), replacing `TrashIcon.tsx` and `TopAppBar.tsx`'s hand-drawn Search/Bell SVGs. Treat as a real dependency decision (version pin, bundle-size, license check), not a trivial visual tweak. |
| Plan chat sticky positioning | `ChatPanel.tsx` / its aside wrapper | **No real-code change needed.** The currently shipped `frontend/src/pages/OnboardingDetailPage.tsx` aside is already `sticky top-16 h-[calc(100vh-4rem)]` — verified by reading the file. The mock's v5 draft had regressed to a fixed height (no `position:sticky`); v6 fixed the MOCK to match production. This was a mock-only regression, not a real-app gap — nothing to build here. |

## State Patterns

Status-driven header action availability. `OnboardingStatus` has six values (`frontend/src/api/types.ts`); mapped against the real handlers in `OnboardingDetailPage.tsx` (`handleApprove`, `handleSendForApproval`, `handleComplete`, `handleRetry`, `handleDelete`):

| Status | Approve-slot | Complete | Retry | Delete |
|---|---|---|---|---|
| `draft` | **enabled**, label "Send for approval", filled (`handleSendForApproval`) | disabled, outlined | hidden | enabled* |
| `pending_approval` | **enabled**, label "Approve & send to employee", filled (`handleApprove`) | disabled, outlined | hidden | enabled* |
| `ready_for_day_1` | disabled, outlined | disabled, outlined | hidden | enabled* |
| `in_progress` | disabled, outlined | **enabled**, filled (`handleComplete`) | hidden | enabled* |
| `blocked` | disabled, outlined | disabled, outlined | **shown, enabled, filled** (`handleRetry`) | enabled* |
| `completed` | disabled, outlined | disabled, outlined | hidden | enabled* |

\* Delete is always enabled unless `anyActionInFlight` (any of approve/send-for-approval/retry/complete/delete/chat-send is currently in progress) — the existing concurrency guard, unchanged by this redesign.

**Resolved from the earlier draft's Open Question.** The earlier draft flagged "Send for approval action placement" as unresolved (whether Approve doubles for it, or a new slot is needed). It's now resolved: Send-for-approval reuses the Approve button's exact slot, swapping label and handler by status — no fifth button, no ambiguity. This is a settled decision (`.memlog.md` entry 27), not an open item anymore.

Other in-flight states: button labels swap to their existing in-progress copy ("Sending...", "Approving...", "Retrying...", "Completing...") exactly as shipped, unchanged.

## Interaction Primitives

- Chat keyboard behavior is explicit: Enter submits a non-empty message and Shift+Enter inserts a newline.
- `Tab` order follows visual order: header eyebrow/name/badge/meta-links → header actions (Approve-slot → Complete → Retry when shown → Delete) → dark-mode toggle (header, reachable independent of tab-order position relative to page content since it lives in the persistent top bar) → Progress (no interactive elements, no Viewed checkbox) → each card's Viewed checkbox in card order (First tasks → Onboarding context → Repositories → Permissions → Checklists → Suggested documentation → Approvals and risks) → Plan chat input → send button.
- The Viewed checkbox is a native `<input type="checkbox">` (or equivalent ARIA-correct custom checkbox) — `Space` toggles it, standard checkbox semantics, no custom widget behavior to spec.
- All header links, header buttons, and the dark-mode toggle are standard focusable, `Enter`/`Space`-activatable elements.
- Delete keeps a native `window.confirm()` guard — unchanged, not replaced by a custom modal in this pass.

## Accessibility Floor

WCAG AA basics — internal tool, not a regulated-grade audit surface.

- Contrast: every color pair in `DESIGN.md.colors`, **in both light and dark mode**, must meet AA text contrast at the sizes it's used (`label-large`, 14px, and `body-medium`, 14px, are the smallest roles carrying this pattern's new text). This explicitly includes the new dark-mode pairs and `review-container`/`review-container-dark`.
- `{design.colors.success}` / `success-dark` (Viewed-checkbox) is a UI-accent/glyph color, not text — held to WCAG's 3:1 non-text contrast bar against its surrounding surface in both modes, not the 4.5:1 text bar. Never repurpose it for text without re-checking against the stricter bar.
- Focus states: header action buttons, header meta links, the dark-mode toggle, and each card's Viewed checkbox must show a visible focus ring — reuse whatever focus treatment `Button`/`IconButton`/links/native checkboxes already carry.
- Keyboard operability: every interactive element above must be reachable and activatable via keyboard alone, in the `Tab` order specified.
- The progress stepper is decorative/read-only status information — its status is also conveyed in text via the existing status chip, not via the stepper's color/position alone.
- Status chip color is never the sole signal of status — text label always accompanies it, unchanged from today.
- A collapsed (Viewed) card's content must not become inaccessible to assistive tech merely because it's visually hidden and dimmed — when hidden, it should be genuinely removed from the accessibility tree (e.g. not rendered, or `hidden`/`aria-hidden`), not just visually collapsed while still exposed, to avoid a confusing screen-reader experience where "collapsed" cards still read their full content.

## Key Flows

### Flow 1 — Review and approve (Priya, hiring manager, mid-morning)

1. Priya opens Maya Chen's onboarding from the People list. Progress and First tasks are immediately visible at the top of the main column; Plan chat is visible alongside, sticky, without any extra click.
2. She works down the page. Onboarding context and Suggested documentation don't need a closer look today — she checks their "Viewed" boxes without further action, and they collapse to single-line bars, keeping the page scannable.
3. Repositories, Permissions, Checklists, and Approvals and risks each need a genuine read. Reviewing Permissions, she notices a repository access is missing.
4. Rather than leaving the page, she types into the Plan chat: "Add read access to the acme/design-tokens repository."
5. She watches the tool-run confirmation land in the chat (the existing "Running tools" live display, unchanged) — the chat stays visible throughout because it's sticky, even as the now-much-longer main column scrolls.
6. She reviews the now-updated Permissions table, confirms the new access, and checks its "Viewed" box — it collapses too.
7. **Climax:** she clicks Approve. The status chip and progress stepper shift in place — from "pending approval" (review-tone chip) to the next stage — without navigation or reload. By this point, most cards are collapsed (checked) except the couple she genuinely worked through; the page visually reflects her review progress the way a reviewed GitHub PR does — collapsed bars for what's settled, expanded cards for what still needs eyes.

Failure: if the Approve call fails, existing error handling re-surfaces the record's prior state and the error message (unchanged `handleApprove` catch path) — no new failure-state design introduced here. Viewed-checkbox state (being local-only, per the Open Questions/`[ASSUMPTION]` above) is unaffected by this failure path either way, since it never touched the server.

## Open Questions

- **Roles/permissions model (deferred, unchanged from the earlier draft).** No role or permission-gating model is defined yet — no login system, single implicit "manager" actor. This pass keeps the page role-agnostic. Do not design role-gated views against this spine until that model exists.
- **Viewed-checkbox persistence.** `[ASSUMPTION]` local-only, resets on reload, like GitHub's per-viewer file-viewed state. Confirm whether cross-session (or cross-user) persistence is ever wanted; if so, it needs a new field on `OnboardingRecord` or a separate per-user store, neither of which exists today.
- **Dark-mode toggle persistence/default.** `[ASSUMPTION]` manual override of `prefers-color-scheme`, persisted via `localStorage`; otherwise follows system preference. Not confirmed — flagged in the Discovery log as an assumption, not a decision.
- **Python-bridge source location.** The task's grounding instructions point to `backend/python-bridge` for `generate_onboarding_plan()`'s literal source; that directory does not exist in this repository (only `.memlog.md` entry 32's pasted description of its section order was available). The section order used throughout this spine comes from that memlog entry, not a freshly re-read source file — worth confirming the generator hasn't changed section order since that entry was logged, if the actual service lives elsewhere.
