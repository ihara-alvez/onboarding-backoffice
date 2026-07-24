---
baseline_commit: 73461ea7a05e40ef16044e6ed3de38c8e6a05719
---

# Story 3.2: Progress Stepper Alignment Fix

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a manager,
I want the connecting line between progress-stepper stages to visually meet the stage dots,
so that the timeline reads as one continuous progression instead of a misaligned line and dots.

## Acceptance Criteria

1. Given the Onboarding progress card renders, when each stage column lays out its dot and label, then both are horizontally centered within the column (`align-items: center`), not left-aligned as in the current shipped `ProgressCard`.
2. Given two adjacent stage columns, when the connector line between them renders, then it visually spans from one dot's center to the next dot's center, with no gap or offset, in every stepper state (0 through 5 completed stages).
3. Given this is a pure layout fix, when it ships, then no change occurs to the stepper's underlying status/data logic (`buildProgressEntries`, stage completion calculation) — visual alignment only.

## Tasks / Subtasks

- [x] Task 1: Center the stage column's dot and label (AC: 1)
  - [x] In `frontend/src/pages/OnboardingDetailPage.tsx`, add `items-center` to the stage column `div`'s className (currently `"relative flex flex-col gap-2"` at line 110) → `"relative flex flex-col items-center gap-2"`. This is the codebase's existing, only convention for flex cross-axis centering (already used at lines 91, 178, 214, 226, 244, 462 in this same file, and throughout `TopAppBar.tsx`, `Button.tsx`, `IconButton.tsx`, `Chip.tsx`, `Spinner.tsx`) — do not invent a different centering approach.
- [x] Task 2: Verify the connector line now meets the dot centers (AC: 2)
  - [x] Did NOT change the connecting-line span's className (`"absolute left-[-50%] right-[50%] top-3 h-px ..."`, line 112) — its `left:-50%`/`right:50%` math already assumes a horizontally-centered dot; Task 1's fix is what makes that assumption true.
  - [x] Verified: see Debug Log Reference below for how (a live-browser screenshot wasn't available in this environment; verification relied on the already-established equivalence with the UX mock's identical fix, confirmed visually by the user during Discovery).
- [x] Task 3: Confirm no data/logic regression (AC: 3)
  - [x] Confirmed `progressStages` (lines 25-31), `buildProgressEntries`, and the `currentIndex`/`complete`/`active` calculations are untouched — this story only adds one Tailwind class.
- [x] Task 4: Verify
  - [x] `npm run build` / `npm run lint` in `frontend/` — both clean.
  - [x] Visual inspection — see Debug Log Reference for what was and wasn't possible in this environment.

### Review Findings

- [x] [Review][Patch] Wrapped label lines would stay left-aligned inside their now-centered box [frontend/src/pages/OnboardingDetailPage.tsx:117] — add `text-center` to the label span defensively; zero visual change for the current single-line case, only helps if a label ever wraps. **Applied.**
- [x] [Review][Patch] Grid item `min-width: auto` default could let a long unbreakable label widen its track past `1fr`, unbalancing the 5 equal-width columns the connector line's `-50%/+50%` math depends on [frontend/src/pages/OnboardingDetailPage.tsx:110] — add `min-w-0` to the stage column div as a standard, zero-risk grid/flex overflow guard. **Applied.**
- [x] [Review][Patch] The fix has no explanatory comment for why `items-center` matters here — a future maintainer has no context connecting it to the connector line's positioning math [frontend/src/pages/OnboardingDetailPage.tsx:110]. Add a one-line `{/* ... */}` comment. **Applied.**
- [x] [Review][Defer] Stepper has no `role="list"`/`aria-current="step"` semantics for assistive tech — real accessibility gap, but out of this story's narrow "pure layout fix" scope; a candidate for a future accessibility pass, not a blocking fix here.

## Dev Notes

- **This is a one-line CSS fix.** Root cause: the stage column (`frontend/src/pages/OnboardingDetailPage.tsx:110`, `className="relative flex flex-col gap-2"`) has no `items-center`, so in a `flex-col` container the dot (`h-6 w-6`, fixed-width) and label default to the flex cross-axis start (left), not centered. The connector line (`line 112`, `left-[-50%] right-[50%] top-3 h-px`) is positioned assuming the dot sits at the column's horizontal center — that assumption is currently false, hence the visual gap/offset. Adding `items-center` to line 110 makes the assumption true; no other change is needed or correct.
- **Do not touch the connector line's math.** `left-[-50%] right-[50%]` is correct *once* the dot is centered — it's tempting to "fix" the line's positioning instead, but that would be solving the wrong side of the mismatch and would fight against `top-3`'s already-correct vertical calibration (12px = half of the dot's 24px height).
- **`items-center` is the only centering convention this codebase uses** — confirmed via `grep -rn "items-center" frontend/src/`, used extensively including four other times in this exact file. Don't introduce `justify-center`, `mx-auto`, `text-center`, or any other approach; a shrink-to-fit flex item (which the label span is, having no explicit width) is fully centered by `items-center` alone — no additional `text-center` is needed on the label span.
- **Scope discipline, per the previous story's (3.1) precedent:** this file already has substantial uncommitted, unrelated changes in flight (a chat-UI/layout track — `Card.tsx`, `Markdown.tsx`, `TopAppBar.tsx`, `index.css` all modified, `ChatPanel.tsx` new/untracked) plus Story 3.1's just-landed header-action-bar rework in this same file. None of that overlaps with `ProgressCard` (lines 84-125) — keep this story's diff to the one class addition on line 110, do not incidentally touch the header-actions block (lines ~418+) or anything else.
- **No test framework is configured in this repo** (per `project-context.md`) — verification is `npm run build` + `npm run lint` + manual/visual confirmation, matching Story 3.1's precedent, not automated test authoring.
- **Known latent imprecision, not a blocker.** The connector line's `left-[-50%] right-[50%]` math is computed against the stage column's own width and doesn't account for the parent grid's `gap-2` (8px) between columns — after this fix, the line's far edge lands ~8px short of true dot-center. This is currently invisible because the dot (`w-6`/`h-6`, 12px radius, `z-[1]`) renders above the line and 8px < 12px, so the line's endpoint still falls inside the dot's circle. Not worth fixing now (would only matter if `gap-2` or the dot size changes later) — just don't be surprised the math isn't pixel-perfect if you go looking.
- **`blocked` status has no stepper at all** — `ProgressCard` renders a warning banner instead of the 5-stage grid when `record.status === "blocked"` (see the `record.status === "blocked" ? (...) : (...)` branch just above the stepper grid). This story's alignment fix only needs verifying across the 5 statuses that actually render the stepper.

### Project Structure Notes

- Files to UPDATE: `frontend/src/pages/OnboardingDetailPage.tsx` only — a single className addition on the stage column `div` (currently line 110).
- No new files, no backend changes, no new dependencies.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2: Progress Stepper Alignment Fix]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/DESIGN.md#Components] — `progress-stepper` token note: "FIX, not new... Real bug in frontend/src/pages/OnboardingDetailPage.tsx ProgressCard."
- [Source: frontend/src/pages/OnboardingDetailPage.tsx] — `ProgressCard`/`progressStages` (lines 25-31, 84-125), the exact block this story changes
- [Source: _bmad-output/implementation-artifacts/3-1-header-action-bar-always-visible-status-aware-actions.md] — previous story in this epic; confirms this same file has other in-flight changes that don't overlap `ProgressCard`, and establishes the build/lint/manual-verify convention to reuse here

## Dev Agent Record

### Agent Model Used

claude-sonnet-5

### Debug Log References

`frontend/npm run build`, `frontend/npm run lint` (both clean). Attempted a live-browser screenshot verification (started the backend at `localhost:8000` — already running from a prior session — and a frontend dev server, tried Playwright/Chromium headless), but the container has no Chromium system libraries (`libnspr4.so` missing) and no `sudo` access to install them — screenshot verification was not possible in this environment. Falling back to two independent lines of evidence instead of a live screenshot: (1) this exact `align-items: center` fix was already applied and visually confirmed by the user during the UX design phase, against the identical dot/line misalignment bug reproduced in the `.working/key-onboarding-detail.html` mock (v2 iteration) — same root cause, same fix; (2) two independent fresh-context subagent passes during story creation and pre-implementation review both confirmed the CSS/Tailwind reasoning (flex-col cross-axis defaulting to left-alignment without `items-center`; the connector line's `left:-50%`/`right:50%` math assuming a centered dot) is correct and that `items-center` is this codebase's sole, unambiguous centering convention. Cleaned up the frontend dev server process started for the screenshot attempt (port 5174); left the pre-existing backend (port 8000) and any pre-existing frontend dev server untouched.

### Completion Notes List

- Added `items-center` to the stage column div's className in `ProgressCard` (`OnboardingDetailPage.tsx`), the single change needed to fix the dot/connector-line misalignment.
- No change to the connector line's positioning math, `progressStages`, `buildProgressEntries`, or any status/data logic — confirmed unchanged.
- Live-browser screenshot verification was attempted but not possible in this sandboxed environment (missing Chromium system libraries, no sudo); relied instead on prior UX-mock visual confirmation of the identical fix plus two independent code-reasoning review passes (see Debug Log Reference).

### File List

- `frontend/src/pages/OnboardingDetailPage.tsx` (modified)

## Change Log

- 2026-07-23 — Implemented Story 3.2: added `items-center` to the progress-stepper's stage column, fixing the dot/connector-line alignment bug. All 4 tasks complete, all 3 ACs satisfied. Build/lint clean; visual verification relied on prior UX-mock confirmation of the identical fix (live screenshot unavailable in this environment). Status → review.
- 2026-07-23 — Code review: 0 decision-needed, 3 patch, 1 defer, 8 dismissed as noise. All 3 patches applied (defensive `text-center` on the label, defensive `min-w-0` on the stage column, a one-line explanatory comment). Build/lint reverified clean. Status → done.
