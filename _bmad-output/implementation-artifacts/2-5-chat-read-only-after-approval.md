# Story 2.5: Chat Read-Only After Approval

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a manager,
I want the chat to become read-only once I've approved an onboarding,
so that the approved plan can never be second-guessed by a stray late message.

## Acceptance Criteria

1. Given an approved onboarding (`ready_for_day_1`, `in_progress`, or `completed`), when the manager opens its detail view, then the chat transcript is visible but the message input is disabled.
2. Given a chat was mid-stream when approval happened, when the response completes, then the resulting text is still visible in the transcript for reference, but is discarded as a plan revision per Story 2.3's in-flight-approval rule — transcript is not the same as the applied plan.

## Tasks / Subtasks

- [ ] Task 1: Read-only transcript view (AC: 1, 2)
  - [ ] In the "Revise plan via chat" `Collapsible` section Story 2.4 added, when `record.status` is `ready_for_day_1`/`in_progress`/`completed`: instead of the active `TextField`+`Button`+live-`ProgressLog` input UI, render a simple read-only list — filter `record.actionLog` to `type === "chat_message"` entries and render each as a row (timestamp + message), reusing the same row styling Story 1.8's Action Log section already established. This is the "transcript" FR12 refers to: this app has no separate message-bubble storage (per FR-10's Out of Scope note — only the latest plan is retained), so the transcript **is** the chat-filtered subset of the same `actionLog` Story 1.8 renders in full elsewhere, not a new data structure.
  - [ ] No input, no Send button, nothing editable — just the filtered read-only list plus a short static note (e.g. "This onboarding has been approved — chat is now read-only.").
- [ ] Task 2: Verify (AC: 1, 2)
  - [ ] `npm run build`/`lint` in `frontend/`.
  - [ ] Approve an onboarding that has at least one prior chat exchange (per Story 2.3/2.4's manual verification), confirm its detail view shows the read-only transcript (chat-filtered `actionLog` entries) with no active input. Force the mid-stream-approval race (per Story 2.3's manual verification) and confirm the resulting "Revision discarded: onboarding was approved before the response arrived" entry appears in this same read-only view — visible for reference, distinct from (and not applied to) the onboarding's actual `narrative`.

## Dev Notes

- **This story adds no new data, only a second, filtered rendering of `actionLog` that Story 2.4's section already has access to.** It is the read-only counterpart to Story 2.4's active-input case — same `Collapsible` section, same underlying array, different branch based on `record.status`.
- **"Transcript ≠ applied plan" (AC2) requires no special handling beyond what Story 2.3 already guarantees:** Story 2.3 never writes a rejected late revision to `narrative` — it only appends the log entry. So simply rendering `actionLog` here (which includes that entry) alongside the *unchanged* narrative `Card` above already satisfies "the resulting text is still visible... but discarded" — there's nothing further to reconcile.

### Project Structure Notes

- Single file touched: `frontend/src/pages/OnboardingDetailPage.tsx` (UPDATE only — new branch inside Story 2.4's Collapsible section). No backend changes, no new files.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.5: Chat Read-Only After Approval]
- [Source: _bmad-output/planning-artifacts/prds/prd-onboarding-backoffice-2026-07-17/prd.md#FR-12]
- [Source: _bmad-output/implementation-artifacts/2-4-chat-entry-point-visibility-live-streaming-ui.md] — the `Collapsible` section and its active-input branch this story adds the read-only counterpart to
- [Source: _bmad-output/implementation-artifacts/2-3-conversational-plan-revision-endpoint-streaming.md] — confirms rejected late revisions never touch `narrative`, only `actionLog`
- [Source: _bmad-output/implementation-artifacts/1-8-full-action-log-display-immutability-guarantee.md] — the row-rendering style this story's filtered view reuses

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
