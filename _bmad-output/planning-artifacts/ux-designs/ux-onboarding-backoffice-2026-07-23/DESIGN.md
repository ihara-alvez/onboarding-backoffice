---
name: onboarding-backoffice
description: MD3-flavored Tailwind v4 design system for the onboarding backoffice tool. This pass redesigns only the onboarding detail/workspace page and inherits the existing light-mode token system verbatim, adding a full dark-mode token set, a new full-content-by-default card pattern with a "Viewed" collapse affordance, and a Heroicons-outline icon adoption. Deltas only, not a replacement system.
status: final
updated: 2026-07-24
colors:
  # Light mode — inherited verbatim from frontend/src/index.css @theme. Restated
  # here so component tokens below can reference them; values are not new.
  primary: '#2457d6'
  on-primary: '#ffffff'
  primary-container: '#e7edff'
  on-primary-container: '#173b9a'
  secondary: '#667085'
  on-secondary: '#ffffff'
  secondary-container: '#eef2f7'
  on-secondary-container: '#344054'
  surface: '#f7f8fb'
  surface-container: '#ffffff'
  on-surface: '#101828'
  surface-variant: '#f0f2f5'
  on-surface-variant: '#667085'
  error: '#b42318'
  on-error: '#ffffff'
  error-container: '#fee4e2'
  on-error-container: '#912018'
  outline: '#98a2b3'
  outline-variant: '#e4e7ec'
  # Carried over from the prior draft — the one new light-mode color pair,
  # used only for the pending_approval ("review") status chip.
  review-container: '#fef3c7'
  on-review-container: '#92400e'
  # Dark mode (NEW, v6) — ported verbatim from the confirmed mock's
  # `body:has(#theme-toggle:checked)` block. Separate `-dark` suffixed keys
  # per the design.md spec's light/dark convention, one CSS variable set per
  # mode. Same semantic roles as the light tokens above.
  primary-dark: '#9db8f5'
  on-primary-dark: '#0a2757'
  primary-container-dark: '#1d3f8f'
  on-primary-container-dark: '#dce6ff'
  secondary-dark: '#b0b8c4'
  on-secondary-dark: '#1f242c'
  secondary-container-dark: '#3a4149'
  on-secondary-container-dark: '#e3e7ed'
  surface-dark: '#0f141b'
  surface-container-dark: '#1a2029'
  on-surface-dark: '#e6e9ee'
  surface-variant-dark: '#242b35'
  on-surface-variant-dark: '#a6adb8'
  error-dark: '#ff8a80'
  on-error-dark: '#4e0b04'
  error-container-dark: '#6b1710'
  on-error-container-dark: '#ffd9d4'
  outline-dark: '#5b6472'
  outline-variant-dark: '#333a44'
  review-container-dark: '#4d3a10'
  on-review-container-dark: '#fbd991'
  # RESOLVED (was an open gap): the mock's literal #16a34a is now a formal
  # semantic token, UI-accent/glyph only — never used as text, so it is held
  # to WCAG's 3:1 non-text contrast bar, not the 4.5:1 text bar.
  success: '#16a34a'
  success-dark: '#4ade80'
typography:
  # Inherited verbatim from frontend/src/index.css @theme (MD3 type scale
  # subset). No new type role is introduced by this redesign.
  headline-small:
    fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif'
    fontSize: 24px
    lineHeight: 32px
    fontWeight: '600'
  title-large:
    fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif'
    fontSize: 22px
    lineHeight: 28px
    fontWeight: '600'
  title-medium:
    fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif'
    fontSize: 16px
    lineHeight: 24px
    fontWeight: '600'
  body-large:
    fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif'
    fontSize: 16px
    lineHeight: 24px
    fontWeight: '400'
  body-medium:
    fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif'
    fontSize: 14px
    lineHeight: 20px
    fontWeight: '400'
  label-large:
    fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif'
    fontSize: 14px
    lineHeight: 20px
    fontWeight: '500'
rounded:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 28px
  full: 9999px # Tailwind default (rounded-full), not a project @theme token — used by Chip, IconButton, avatars.
spacing:
  note: 'Inherited Tailwind v4 default spacing scale (4px base unit) — no project-specific spacing tokens exist and none are introduced. The density mechanism in this redesign is progressive manual collapse (the Viewed checkbox), not new spacing values or truncated content — see Layout & Spacing.'
components:
  card:
    background: '{colors.surface-container}'
    border: '{colors.outline-variant}'
    radius: '{rounded.lg}'
    padding: '24px'
    shadow: 'shadow-elevation-1'
    note: 'Real Card.tsx, unchanged as the expanded/default state. Every reviewable card (all except Progress) now renders FULL content by default — no truncation, no drill-in link. See card-viewed below for the collapsed state.'
  card-viewed:
    background: '{colors.surface-variant}'
    shadow: 'none'
    padding: '14px 20px'
    title-foreground: '{colors.on-surface-variant}'
    note: 'NEW. The collapsed single-line-bar state a card enters when its Viewed checkbox is checked: card body hidden, background shifts to surface-variant, shadow removed, padding shrinks (~14px vertical / 20px horizontal — matches Tailwind''s p-3.5/px-5 exactly), and the title dims to on-surface-variant. Driven by real component state (see EXPERIENCE.md Component Patterns), not the mock''s CSS-only :has() trick. Progress is exempt — it never gets a Viewed checkbox or this state.'
  viewed-checkbox:
    foreground: '{colors.on-surface-variant}'
    foreground-checked: '{colors.success}'
    foreground-checked-dark: '{colors.success-dark}'
    typography: '{typography.label-large}'
    note: 'NEW, GitHub "Files changed" convention. A checkbox + "Viewed" label in every reviewable card''s header (top-right of card-head), unchecked by default. The checked-state green is now the formal {colors.success} token (RESOLVED — previously an untokenized literal).'
  button-primary:
    background: '{colors.primary}'
    background-dark: '{colors.primary-dark}'
    foreground: '{colors.on-primary}'
    foreground-dark: '{colors.on-primary-dark}'
    radius: '{rounded.xl}'
    note: 'Real Button.tsx filled variant. Used for whichever of the Approve-slot / Complete pair (or Retry, when shown) is the CURRENTLY APPLICABLE action for the record''s status — see button-outlined below for the sibling in the pair. This is a change from the stale draft''s assumption of "always filled, dimmed via disabled opacity": the confirmed mock instead swaps the INACTIVE member of the pair to the outlined variant, not just disabled-filled.'
  button-outlined:
    background: '{colors.surface-container}'
    foreground: '{colors.on-surface}'
    border: '{colors.outline-variant}'
    radius: '{rounded.xl}'
    disabled-opacity: '0.4'
    note: 'Real Button.tsx outlined variant. Renders for whichever of Approve-slot / Complete is NOT the current status''s applicable action, always disabled. Confirmed against the mock''s per-status states-strip (draft/blocked/in_progress rows): the inapplicable button is never filled-and-faded, it is the outlined variant, disabled. This is a real implementation delta needed in OnboardingDetailPage.tsx (a variant prop driven by status, alongside the disabled prop), not present in the stale draft.'
  icon-button-error:
    foreground: '{colors.error}'
    hover-background: '{colors.error-container}'
    radius: '{rounded.full}'
    note: 'Unchanged shape (real IconButton.tsx, tone="error", circular, h-9/w-9, no border). Only the icon inside it changes: hand-drawn TrashIcon.tsx → Heroicons outline Trash. Do NOT adopt the mock''s bordered/square icon-btn chrome for Delete — that''s the mock''s raw-CSS approximation, the real IconButton wins per the Shapes section.'
  header-icon-btn:
    foreground: '{colors.on-surface-variant}'
    hover-background: '{colors.surface-variant}'
    radius: '{rounded.full}'
    size: '36px'
    note: 'Shared shell for the header''s Search, dark-mode toggle, and Notifications buttons. Adds a circular hover-background affordance (from the mock) that today''s TopAppBar.tsx buttons lack (currently plain ghost buttons, no hover fill) — a small, low-risk visual pickup bundled with the icon-library swap, applied consistently to all three so the new toggle doesn''t look like an outlier.'
  dark-mode-toggle:
    icon-unchecked: 'Heroicons outline Sun'
    icon-checked: 'Heroicons outline Moon'
    note: 'NEW. Lives in header-icon-btn, positioned between Search and Notifications per the mock. The mock implements the swap with a checkbox + CSS :has() (no JS, since it''s a static file); the real implementation is a stateful toggle (e.g. a boolean in a theme context) that (a) sets/removes a dark-mode class or data attribute the CSS variables above key off of, and (b) is persisted — see EXPERIENCE.md for the [ASSUMPTION] on persistence mechanism and default-vs-override-of-prefers-color-scheme behavior, not locked in here.'
  status-chip-review:
    background: '{colors.review-container}'
    background-dark: '{colors.review-container-dark}'
    foreground: '{colors.on-review-container}'
    foreground-dark: '{colors.on-review-container-dark}'
    radius: '{rounded.full}'
    typography: '{typography.label-large}'
    note: 'Unchanged from the prior draft. NEW Chip tone, used only for the pending_approval ("review") status chip. All other statuses keep Chip.tsx''s existing tones (primary/secondary/error via statusTone()).'
  project-badge:
    tag-background: '{colors.primary-container}'
    tag-foreground: '{colors.on-primary-container}'
    tag-radius: '{rounded.xs}'
    typography: '{typography.label-large}'
    note: 'Unchanged pattern. Small "Project" tag + project name (record.project.name), under the role/email subline. Now the ONLY page element carrying this content, since Onboarding context (below) covers business_goal/architecture_summary but not the project name itself.'
  header-meta-links:
    color: '{colors.primary}'
    typography: '{typography.label-large}'
    icon-history: 'Heroicons outline Clock'
    icon-download: 'Heroicons outline ArrowDownTray'
    note: 'REPLACES the old drill-in-link pattern (now dead — do not implement summary+"View X" links anywhere). Two icon+text links on one line under the Project badge: "View history" (Clock icon) and "Download plan (.md)" (ArrowDownTray icon), replacing the removed Activity card and Full plan card respectively. See EXPERIENCE.md for behavior — "View history"''s destination is an open question, "Download plan" has a concrete client-side mechanism.'
  data-table:
    header-foreground: '{colors.on-surface-variant}'
    header-typography: '{typography.label-large}'
    row-border: '{colors.outline-variant}'
    row-typography: '{typography.body-medium}'
    badge-background: '{colors.surface-variant}'
    badge-foreground: '{colors.on-surface-variant}'
    badge-radius: '{rounded.sm}'
    tick-foreground: '{colors.success}'
    tick-foreground-dark: '{colors.success-dark}'
    note: 'Shared shell for Repositories (Repository | Access | Setup — no "Last synced" column, no backing field on ProjectRepo) and Permissions (Permission | System, replacing the old grouped-chips-by-category layout).'
  progress-stepper:
    dot-size: '24px'
    dot-border-inactive: '{colors.outline}'
    dot-fill-complete: '{colors.primary}'
    connector-complete: '{colors.primary}'
    connector-inactive: '{colors.outline-variant}'
    note: 'FIX, not new (carried over from the prior draft, still required). Stage column must use align-items:center (dot + label both horizontally centered) — not the current shipped align-items:flex-start — so the connector line (left:-50%/right:50% of the stage box) actually meets the dot centers. Real bug in frontend/src/pages/OnboardingDetailPage.tsx ProgressCard. Progress is the one card exempt from the Viewed-checkbox pattern (live status widget, not reviewable plan content).'
  icon-set:
    library: '@heroicons/react (or equivalent Heroicons-outline SVG set)'
    variant: 'outline'
    viewBox: '0 0 24 24'
    strokeWidth: '1.5'
    linecap: 'round'
    linejoin: 'round'
    note: 'NEW dependency decision, not a trivial swap. Replaces the hand-drawn TrashIcon.tsx and the hand-drawn inline Search/Bell SVGs in TopAppBar.tsx. Icons used: Trash (delete), ArrowDownTray (download plan), Clock (view history), MagnifyingGlass (search), Bell (notifications), Sun/Moon (dark-mode toggle). Existing hand-drawn Search/Bell use strokeWidth 1.8 today — standardizing on Heroicons'' native 1.5 is a small, intentional visual delta, not an error.'
---

## Brand & Style

This is still not a new visual language — it is the same MD3-flavored, Tailwind v4 `@theme` system in `frontend/src/index.css` (blue product accent, neutral gray-blue surfaces, MD3 shape/type/elevation scales), inherited wholesale for light mode. What changed since the prior draft is the shape of the *density* solution and the addition of a second theme mode:

1. **The "summary + View X drill-in link" pattern is dead.** It was the density lever in the prior draft; it was tried, mocked, and explicitly reversed. The replacement is full-content-by-default cards with a per-card "Viewed" checkbox (GitHub PR review convention) that collapses a reviewed card to a single-line bar. Density now comes from the reviewer's own progressive collapsing during a session, not from permanently-truncated content behind a click-through.
2. **Dark mode is now in scope**, reversing the prior draft's "single light theme only" assumption. A full parallel token set exists (see Colors), toggled by a new header sun/moon control.
3. **Heroicons (outline) is adopted as a real new dependency**, replacing this app's hand-drawn icon SVGs everywhere they appear in the redesigned surfaces.

Everything else — Card, Button, IconButton, Chip's existing tones, the Plan chat panel's structure — is still reused as shipped; this pass adds new *states* and *patterns* on top, not a new component vocabulary.

## Colors

Light-mode colors carry their existing meaning unchanged from the prior draft:

- **Primary (`#2457d6` / on `#ffffff`, container `#e7edff` / on-container `#173b9a`)** — product accent. Primary buttons, active nav, links, the "You asked" chat bubble, the progress stepper's complete state.
- **Secondary (`#667085` container `#eef2f7`)** — neutral chip/badge tone.
- **Surface family** — page background, card background (`{components.card}`), and the collapsed-card / table-header / badge fill (`{components.card-viewed}`, `{components.data-table}`).
- **Error (`#b42318` container `#fee4e2`)** — blocked-status chip, Delete icon button, chat revision-failure rows.
- **Outline / outline-variant** — card borders, table dividers, inactive progress-stepper strokes.
- **Review-container (`#fef3c7` / on `#92400e`)** — the pending_approval ("review") status chip only. Not a general "secondary" replacement.

**Dark mode (NEW, v6).** Every light color above has a `-dark` counterpart (see frontmatter), ported verbatim from the confirmed mock's toggle block — this system does not invent new dark values, it formalizes the mock's. The dark palette follows standard MD3 dark-theme logic: primary/secondary/error become lighter, less-saturated tints suitable for text-on-dark-surface (`#9db8f5`, `#b0b8c4`, `#ff8a80`) while their "container" pairs darken instead of lighten (`#1d3f8f`, `#3a4149`, `#6b1710`) so containers stay recessed relative to surface; the surface family inverts from near-white to near-black (`#f7f8fb`→`#0f141b`, `#ffffff`→`#1a2029`); outline/outline-variant darken and desaturate. `review-container` gets a dark counterpart (`#4d3a10` / on `#fbd991`) following the same container-darkens/on-color-lightens logic as the other container pairs.

**Success (`#16a34a` / dark `#4ade80`) — RESOLVED.** Formalized as a semantic token (was previously an untokenized literal in the mock). Used only as a UI accent/glyph for the Viewed-checkbox's checked state, never as text, so it's held to WCAG's 3:1 non-text contrast bar against the surfaces it sits on, not the 4.5:1 text bar. Don't repurpose it for anything text-bearing without re-checking contrast.

Avoid: introducing any other new hue without the same one-clear-semantic-meaning, one-place-it's-used deliberation `review-container` got.

## Typography

Unchanged from the prior draft — inherited verbatim from `index.css`'s MD3 type-scale subset (`headline-small`, `title-large`, `title-medium`, `body-large`, `body-medium`, `label-large`). No new type role. The mock's ad hoc 12–13px sizes (card-sub, badges, sub-labels) are the mock's static-HTML approximation and collapse onto `label-large` (14px) in the real implementation, same reasoning as before.

## Layout & Spacing

`{spacing.note}` — Tailwind's default scale is inherited unchanged. The structural moves that produce this redesign's density and rhythm:

1. **Full content by default, collapse on review.** Every reviewable card (First tasks, Onboarding context, Repositories, Permissions, Checklists, Suggested documentation, Approvals and risks) renders its complete content — no truncation, no separate detail view — and carries a `{components.viewed-checkbox}` that toggles it into `{components.card-viewed}` (a dense single-line bar). This is the opposite lever from the prior draft's "summary + drill-in," and is the ONLY density mechanism in this design now.
2. **Fixed content order in the main column**, following `generate_onboarding_plan()`'s section order with one field (MVP status) explicitly dropped: Progress → First tasks → Onboarding context → Repositories → Permissions → Checklists → Suggested documentation → Approvals and risks.
3. **Two-pane layout unchanged**: a flexible main column plus a fixed-width, persistent Plan chat aside — now additionally `position:sticky` (already true in the real shipped `OnboardingDetailPage.tsx`, see Components).
4. **Header carries more now.** Below the employee name/role subline: the Project badge, then one line with two icon+text links (View history, Download plan). This is where the old Activity card and Full plan card content now live — as navigation, not as persistent cards.

Removed from the main stack entirely, with no replacement card: Onboarding narrative (superseded by Project badge + Onboarding context), Activity/action-log (superseded by "View history" link), Agent console (never built — redundant with chat's "Running tools"), Full plan (superseded by "Download plan (.md)" link), Plan generation note / MVP-status disclaimer (dropped outright, no replacement).

## Elevation & Depth

Shadow tokens (`shadow-elevation-1`/`2`/`3`, all `rgba(16,24,40,…)`) are unchanged and NOT recalculated for dark mode — the confirmed mock carries the same shadow custom properties into its dark block without adjustment. This is a known, unresolved cosmetic tension: a shadow color designed to read against a near-white surface (`#f7f8fb`) will barely register against the dark surface (`#0f141b`). Not solving this here — flagged as an open item rather than inventing a dark-appropriate shadow scale that no decision has asked for.

## Shapes

Radius scale (`xs` 4 / `sm` 8 / `md` 12 / `lg` 16 / `xl` 28, plus Tailwind's `full` 9999px) is unchanged. As before, the mock is a static-HTML approximation and its raw pixel values (`.card` at 12px radius/20px padding, `.btn` at 10px radius) are NOT the target — the real components are: **Card** is `{rounded.lg}` (16px) at 24px padding (`Card.tsx`), collapsing to `{components.card-viewed}`'s 14px/20px only when Viewed is checked; **Button** is `{rounded.xl}` (28px); **IconButton** (Delete) is `{rounded.full}` circular, not the mock's bordered/square `.icon-btn`. Implementers should match the real components, not the mock's raw numbers, in every case except the new dark-mode color values (those ARE meant to be taken literally, per Colors above).

## Components

- **Header action bar** — Approve-slot, Complete, and Delete always render; Retry renders only when `status === "blocked"`. Approve-slot swaps label AND handler by status: "Send for approval" / `handleSendForApproval` while `draft`, "Approve & send to employee" / `handleApprove` once `pending_approval` (the mock's shorthand "Approve" button label is a space-saving abbreviation in the static mock, not a copy change — keep the real, more explicit label). Within the Approve-slot/Complete pair, whichever action applies to the CURRENT status renders `{components.button-primary}` (filled, enabled); the other renders `{components.button-outlined}` (outlined, disabled) — this variant-swap, not just a disabled-opacity swap, is confirmed by the mock's per-status states-strip. Delete is unchanged: `{components.icon-button-error}`, disabled whenever `anyActionInFlight`, keeps its `window.confirm` guard.
- **Header meta links** (`{components.header-meta-links}`) — "View history" (Clock icon) and "Download plan (.md)" (ArrowDownTray icon), one line, under the Project badge. Replace the old drill-in-link pattern entirely — there is no more "View all N tasks / View all N repositories" style link anywhere in this redesign.
- **Project badge** (`{components.project-badge}`) — unchanged from the prior draft.
- **Viewed checkbox + card collapse** (`{components.viewed-checkbox}`, `{components.card-viewed}`) — THE central new pattern. Every reviewable card gets a checkbox in its `card-head`. Checked → card enters `{components.card-viewed}` (surface-variant background, no shadow, reduced padding, body hidden, title dimmed to on-surface-variant). Unchecked → full expanded card, as always. **Implementation note, load-bearing:** the mock demonstrates this with a pure-CSS `:has()` selector because the mock has no JS. The real React implementation MUST drive this from actual component state (e.g., a `Set<string>` of viewed card ids, or one boolean per card) that conditionally renders/hides each card's body — not a CSS-only trick, since React components don't get the mock's DOM-shape luxury for free.
- **Data table** (`{components.data-table}`) — Repositories: `Repository | Access | Setup` (real `bootstrap`/`test` commands from `ProjectRepo`, no "Last synced" column — no backing field exists). Permissions: `Permission | System`, replacing the old grouped-chips-by-category layout; the standalone Approved/Pending chip stays dropped from the card header (redundant with the page-level status chip); the card title still swaps "Requested permissions" ↔ "Approved permissions" via the existing `isApprovedStatus()`.
- **Progress stepper fix** (`{components.progress-stepper}`) — unchanged requirement from the prior draft: fix `align-items` to `center` in `frontend/src/pages/OnboardingDetailPage.tsx`'s `ProgressCard` so the connector line meets the dot centers.
- **Icon library adoption** (`{components.icon-set}`) — Heroicons outline, 24×24 viewBox, stroke-width 1.5, round caps/joins. Replaces `TrashIcon.tsx` and `TopAppBar.tsx`'s hand-drawn Search/Bell SVGs. A genuinely new npm dependency (`@heroicons/react` or equivalent) — treat as a real dependency-management decision (licensing, bundle size, version pin), not a drop-in visual tweak.
- **Header icon button shell + dark-mode toggle** (`{components.header-icon-btn}`, `{components.dark-mode-toggle}`) — new shared 36px circular-hover-bg shell for Search/theme-toggle/Notifications; the toggle itself swaps Sun↔Moon icons and drives the dark token set. See `EXPERIENCE.md` for the toggle's behavioral/persistence spec (flagged `[ASSUMPTION]`, not locked in).
- **Plan chat** (`ChatPanel.tsx`) — desktop behavior remains `position:sticky`; at tablet/mobile widths it returns to normal page flow. The send control uses a visible accessible send icon; Enter submits and Shift+Enter inserts a newline. Successful revisions, unrelated prompts, and failures use distinct outcome states.
- **Unchanged, for reference only:** Card (expanded state), Button, IconButton, Chip's existing tones, and the Plan chat panel's internals are out of scope for this pass beyond the states already described.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Render every reviewable card's FULL content by default | Truncate or hide content behind a "View X" drill-in link — that pattern is dead |
| Drive card collapse from real component state (a viewed-ids set or per-card boolean) | Copy the mock's `:has()`-only collapse mechanism into React — it has no equivalent without state |
| Keep Approve-slot/Complete/Delete always visible, individually disabled/enabled per status | Hide/show those three conditionally per status (the old pattern) |
| Swap the Approve-slot/Complete pair's Button variant (filled ↔ outlined) based on which is the active action | Render both as filled buttons and rely on disabled-opacity alone to distinguish them |
| Keep Retry conditional on `status === "blocked"` only | Make Retry always-visible-but-disabled |
| Adopt Heroicons outline (24px, 1.5 stroke) for Trash/Download/History/Search/Bell/Sun/Moon | Keep the hand-drawn TrashIcon.tsx or TopAppBar SVGs once the library is adopted — no half-migration |
| Add the full dark token set above, keyed off a real theme-state toggle | Wire the toggle to CSS `:has()` in production — that was a mock-only, JS-free workaround |
| Trust the real components (Card, Button, IconButton) over the mock's raw CSS pixel values | Match the mock's bordered/square Delete button or its 12px card radius |
| Reuse the existing "Running tools" live display in Plan chat | Add a separate "Agent console" card |
| Use `{colors.success}` for the Viewed-checkbox accent only | Use it for text, or introduce a second green elsewhere without the same deliberation |

## Epic 3 Follow-up Enhancements (2026-07-24)

- **Response outcomes:** A successful plan revision may show “Plan updated”. Unrelated prompts use an informational/out-of-scope response and must never show a false success state; failures preserve the prior plan and show an error/clarification state. The outcome comes from an explicit response contract, not client-side keyword guessing.
- **People refresh:** After a persisted plan revision, the detail and People/list data re-fetch through the existing API. Record identity and profile/project snapshot data remain unchanged.
- **Permissions table:** The table now contains only `Permission | System`; the `Included` column, checkmark, and accessible label are removed.
- **Status labels:** User-facing lifecycle labels are centralized as `Draft`, `Pending approval`, `Ready for day 1`, `In progress`, `Blocked`, and `Completed`; API/storage values remain unchanged.
- **Responsive layout:** The desktop two-pane/sticky-chat composition remains. At tablet/mobile widths, the page becomes one column, chat returns to normal page flow, and header controls/tables/input wrap without page-level horizontal overflow.
