---
baseline_commit: 04bccf8
---

# Story 3.11: Refresh People Data After Chat Plan Changes

Status: ready-for-dev

## Story

As a manager,
I want the People/list view to reflect a chat-driven Markdown plan update,
so that the list and detail data do not remain stale after a manager revision.

## Acceptance Criteria

1. Given a chat request changes the stored onboarding `.md` plan, when the revision completes successfully, then the current detail state and People/list data are refreshed from the persisted record.
2. Given the revision is unrelated, rejected, or fails, when the response completes, then no refresh is presented as a successful plan update and the prior persisted plan remains intact.
3. Given the People/list data is refreshed, when the updated record is applied, then onboarding identity, profile/project snapshot, and unrelated local UI state are preserved.
4. Given the user is on another route when the change occurs, when the People/list view is opened later, then it reads the current persisted record through the existing API.

## Tasks / Subtasks

- [ ] Establish the successful-revision refresh path (AC: 1, 3)
  - [ ] After the typed success outcome from Story 3.10, apply or re-fetch the persisted detail record through the existing API.
  - [ ] Ensure the People list does not retain a stale in-memory record after navigation or revisit.
- [ ] Handle non-success outcomes safely (AC: 2)
  - [ ] Do not call a success refresh path for informational, clarification, discarded, or failed outcomes unless a narrowly justified re-fetch is needed to recover server truth.
  - [ ] Preserve the prior plan and avoid false success messaging.
- [ ] Preserve local UI state and snapshots (AC: 3)
  - [ ] Keep `OnboardingRecord` identity and profile/project snapshot data from the persisted response; never rebuild them by re-reading YAML by ID.
  - [ ] Preserve unrelated local UI state such as theme, chat transcript display, loading/error handling, and any intentionally local review state according to its existing scope.
- [ ] Verify routes and data freshness
  - [ ] Verify detail → People and People → detail navigation after a successful revision.
  - [ ] Run backend build/typecheck/tests and frontend build/lint.

## Dev Notes

### Current data flow

- `frontend/src/pages/OnboardingDetailPage.tsx` currently sets `record` directly from the `sendChatMessage()` completion and performs a best-effort `getOnboarding()` only in the catch path. The successful path must align with the explicit outcome contract from Story 3.10.
- `frontend/src/pages/OnboardingListPage.tsx` calls `listOnboardings()` only on initial mount. The list has no global cache/state library, so the safest refresh is to rely on the existing API when the list page mounts/re-enters, or use a narrowly scoped route/navigation refresh mechanism that does not introduce global state.
- `frontend/src/api/client.ts` already provides `getOnboarding()` and `listOnboardings()`. Reuse these functions; do not add a parallel endpoint.
- Backend persistence is the JSON store in `backend/src/store.ts`; the server's returned record is the source of truth after a revision.

### Required behavior and guardrails

- A successful plan revision must result in the current detail view showing the persisted updated `plan`/`narrative`, not merely optimistic text or streamed partial output.
- The People list currently displays employee identity, profile/project names, creation time, and status. Keep all of those values from the persisted `OnboardingRecord`; the list should not derive them from chat text.
- Do not mutate `profile`, `project`, `employeeName`, IDs, or snapshot fields while refreshing. The project explicitly stores snapshots at onboarding creation time.
- Decide and document whether the success path uses the `done` record directly, follows with `getOnboarding()`, or coordinates both. Avoid duplicate requests unless needed for a correctness guarantee.
- Route changes and asynchronous responses must be race-safe: a response for a prior onboarding must not overwrite the currently displayed record. Preserve the existing `currentIdRef`/route guard pattern.
- Viewed checkbox state is local-only and currently resets when a replacement record is applied; do not persist it or accidentally reintroduce it into the API payload.
- If the user is already on the list route in another browser tab, no cross-tab synchronization mechanism is required by this story; on opening/revisiting the page, the existing API fetch must read current persisted data.

### Architecture and project conventions

- React local state and existing fetch client only; no Redux, query cache, localStorage, or new global store.
- Backend route/store behavior should remain unchanged unless Story 3.10's typed result requires a small adapter. Do not change persistence semantics to solve a client refresh problem.
- Keep route handlers thin and preserve discriminated-union/error handling rules.

### Expected files

- Likely update: `frontend/src/pages/OnboardingDetailPage.tsx`, `frontend/src/pages/OnboardingListPage.tsx`, `frontend/src/api/client.ts`, and types introduced by Story 3.10.
- Read/preserve: `backend/src/store.ts`, `backend/src/routes/onboardings.ts`, `frontend/src/api/types.ts`.
- No new persistence fields or external integrations.

### Previous story and git intelligence

- Story 2.3 established chat streaming and Story 2.6 established action-log visibility. Story 3.7/3.8 established reset behavior when a replacement record is applied; retain that intentional local-state behavior.
- The current successful chat handler already resets viewed state and replaces `record`; this story should refine the source-of-truth and list freshness rather than rewrite the detail page.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story 3.11: Refresh People Data After Chat Plan Changes`]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/DESIGN.md#Epic 3 Follow-up Enhancements`]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/EXPERIENCE.md#Information Architecture`]
- [Source: `_bmad-output/project-context.md#Critical Don't-Miss Rules`]
- [Source: `frontend/src/pages/OnboardingDetailPage.tsx`]
- [Source: `frontend/src/pages/OnboardingListPage.tsx`]
- [Source: `frontend/src/api/client.ts`]
- [Source: `backend/src/store.ts`]

## Dev Agent Record

### Agent Model Used

Codex GPT-5

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story context distinguishes persisted record refresh from optimistic UI and preserves snapshot/local-state rules.

### File List

- `_bmad-output/implementation-artifacts/3-11-refresh-people-data-after-chat-plan-changes.md`

