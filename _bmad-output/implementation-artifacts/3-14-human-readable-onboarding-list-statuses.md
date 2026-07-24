---
baseline_commit: 04bccf8
---

# Story 3.14: Human-Readable Onboarding List Statuses

Status: ready-for-dev

## Story

As a manager,
I want lifecycle statuses in the main People/onboarding list to use readable labels,
so that I can scan onboarding progress without interpreting storage values.

## Acceptance Criteria

1. Given an onboarding is shown in the main list, when its status is rendered, then it displays `Draft`, `Pending approval`, `Ready for day 1`, `In progress`, `Blocked`, or `Completed`.
2. Given a status label is displayed in the list or detail chip, when the UI formats it, then it uses a centralized display-label helper and never exposes the raw API/storage value as user-facing copy.
3. Given human-readable labels are introduced, when status tone, sorting, filtering, or lifecycle transitions operate, then their existing behavior remains unchanged.

## Tasks / Subtasks

- [ ] Add centralized status label mapping (AC: 1–2)
  - [ ] Add a typed helper in `frontend/src/statusDisplay.ts` covering all six `OnboardingStatus` values.
  - [ ] Use exact UX copy and provide an exhaustive TypeScript-safe mapping rather than string replacement or ad hoc conditionals.
- [ ] Replace raw status presentation (AC: 1–3)
  - [ ] Use the helper in `OnboardingListPage.tsx`'s Chip.
  - [ ] Use the helper in detail-page status Chip(s), including progress card/header locations where raw values are currently formatted.
  - [ ] Leave API/storage values, status comparisons, tones, sorting, filtering, and lifecycle transition logic unchanged.
- [ ] Validate all statuses and themes
  - [ ] Check all six values in list and detail surfaces, including blocked/read-only states.
  - [ ] Run frontend build/lint and targeted search to ensure no user-facing raw `status.replaceAll`/raw status interpolation remains.

## Dev Notes

### Current implementation to extend

- `frontend/src/statusDisplay.ts` currently centralizes `isApprovedStatus()` and `statusTone()` but has no display-label helper.
- `frontend/src/pages/OnboardingListPage.tsx` renders the raw `r.status` inside its Chip.
- `frontend/src/pages/OnboardingDetailPage.tsx` renders raw `record.status.replaceAll("_", " ")` in the page header and `ProgressCard`; `progressStages` already contains human-readable stage labels, but the status Chip must use the same centralized helper.
- `frontend/src/api/types.ts` is the source of the six-state union and must remain the canonical storage/API contract.

### Required mapping

Use this exact mapping for user-facing labels:

| API/storage value | Display label |
|---|---|
| `draft` | `Draft` |
| `pending_approval` | `Pending approval` |
| `ready_for_day_1` | `Ready for day 1` |
| `in_progress` | `In progress` |
| `blocked` | `Blocked` |
| `completed` | `Completed` |

### Required behavior and guardrails

- The helper should accept `OnboardingStatus` and return a `string`/literal display type. Prefer a `Record<OnboardingStatus, string>` or exhaustive switch so a future status addition fails type-checking until labeled.
- Do not change `statusTone()`, `isApprovedStatus()`, `progressStages`, action gating, backend statuses, API payloads, list ordering, or delete behavior.
- “Detail chip” includes both the page-header Chip and ProgressCard Chip; every user-facing lifecycle status surface must use the helper.
- Do not use `status.replaceAll("_", " ")`, generic title-casing, or a fallback that could expose an unknown raw value to users. If an impossible runtime value arrives, choose a safe generic label/error behavior consistent with existing app handling without weakening the typed map.
- Keep status labels as text alongside color tones; status color is never the sole signal.
- This story does not add filtering/search; it only preserves any existing behavior while changing presentation copy.

### Expected files

- Update: `frontend/src/statusDisplay.ts`, `frontend/src/pages/OnboardingListPage.tsx`, `frontend/src/pages/OnboardingDetailPage.tsx`.
- Read/preserve: `frontend/src/api/types.ts`, `frontend/src/components/Chip.tsx`, `frontend/src/index.css`.
- No backend, persistence, package, or lockfile changes.

### Previous story intelligence

- Stories 1.1–1.8 established the six-state lifecycle and status-driven behavior; storage values are load-bearing and must not be renamed.
- Stories 3.1–3.8 use `statusTone()` and status comparisons throughout the detail page. Keep the helper centralized and change only display text.
- The current code has exactly the raw formatting sites identified above; search after editing for other user-facing raw status output before finalizing.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story 3.14: Human-Readable Onboarding List Statuses`]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/EXPERIENCE.md#Voice and Tone`]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/DESIGN.md#Epic 3 Follow-up Enhancements`]
- [Source: `_bmad-output/implementation-artifacts/1-1-six-state-status-model-migration-log-schema.md`]
- [Source: `frontend/src/statusDisplay.ts`]
- [Source: `frontend/src/pages/OnboardingListPage.tsx`]
- [Source: `frontend/src/pages/OnboardingDetailPage.tsx`]
- [Source: `frontend/src/api/types.ts`]

## Dev Agent Record

### Agent Model Used

Codex GPT-5

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story context separates storage/lifecycle behavior from centralized user-facing label formatting and identifies all current raw display sites.

### File List

- `_bmad-output/implementation-artifacts/3-14-human-readable-onboarding-list-statuses.md`

