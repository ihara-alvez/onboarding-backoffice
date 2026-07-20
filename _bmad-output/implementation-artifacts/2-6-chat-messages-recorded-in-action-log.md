# Story 2.6: Chat Messages Recorded in Action Log

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a manager,
I want every chat exchange to show up in the Action Log,
so that plan revisions are just as auditable as status changes and approvals.

## Acceptance Criteria

1. Given a chat exchange occurs (manager's message and the agent's resulting narrative/revision), when the Action Log is viewed, then an entry exists identifying it as a revision request/response with a timestamp.
2. Given a chat-triggered revert-to-draft occurs, when the Action Log is viewed, then the reversion entry and the chat-message entry are both present and distinguishable.
3. Given a late revision is discarded because the onboarding was approved mid-stream, when the Action Log is viewed, then an entry records the rejected late revision, distinct from a normally-applied one.

## Tasks / Subtasks

- [ ] Task 1: This is a verification story, not a new-code story (AC: 1, 2, 3)
  - [ ] **No implementation work here.** Story 2.3 already appends every `chat_message`/`status_change` entry this story's ACs describe (normal revision, rejected late revision, and — via Story 1.3's `revertToDraft` — the separate reversion entry), and Story 1.8 already renders `actionLog` unfiltered with no per-type special-casing, so any entry Story 2.3 writes is already visible with zero additional frontend code. This mirrors the same "verify, don't duplicate" pattern Story 1.8 itself used for its own AC1/AC4.
  - [ ] Confirm by inspection (not new code) that the three message strings Story 2.3/1.3 use are genuinely distinguishable from each other and from a plain status transition: `"Sent for approval"` / `"Chat message sent while pending approval"` (Story 1.3, `type: "status_change"`) vs. `"Plan revised per chat request: \"<message>\""` (Story 2.3 success, `type: "chat_message"`) vs. `"Revision discarded: onboarding was approved before the response arrived"` (Story 2.3 rejected-late, `type: "chat_message"`) vs. `<the raw failure reason>` (Story 2.3 failure, `type: "chat_message"`). If any two of these read ambiguously similar in the rendered Action Log, adjust the message text in `agentCoreClient.ts`/`store.ts`/the `/chat` route — that's the only "fix" this story might produce.
- [ ] Task 2: End-to-end verification (AC: 1, 2, 3)
  - [ ] Manually walk through: send a chat message on a `draft` onboarding (expect one `chat_message` entry). Send one on a `pending_approval` onboarding (expect a `status_change` reversion entry *and* a `chat_message` entry — two, distinguishable by their `type` and `message`). Force the mid-stream-approval race (per Story 2.3's own verification steps) and confirm the rejected-late-revision entry is clearly distinct from a normal successful one.

## Dev Notes

- **Why this story exists separately at all, given it adds no code:** it was scoped in epics.md as the FR13-coverage story before the actual implementation details (which store call does the writing, which display renders it) were worked out during Story 2.3/1.8's authoring. Once those were nailed down, it became clear the write belongs in Story 2.3 (same synchronous operation as the revision itself) and the display was already generic in Story 1.8 — so this story's job narrowed to confirming the seam actually holds together end-to-end, not implementing something new. That's a legitimate outcome, not a sign anything was missed.
- If, when this story is actually worked, Story 2.3's logging turns out incomplete for any of these three cases, fix it in `agentCoreClient.ts`/the `/chat` route directly (Story 2.3's files) — don't duplicate logging logic into a new location just to keep this story "self-contained."

### Project Structure Notes

- No files are expected to change for this story under normal circumstances (verification only). If gaps are found, fixes land in the files Story 2.3/1.3 already own.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.6: Chat Messages Recorded in Action Log]
- [Source: _bmad-output/planning-artifacts/prds/prd-onboarding-backoffice-2026-07-17/prd.md#FR-13]
- [Source: _bmad-output/implementation-artifacts/2-3-conversational-plan-revision-endpoint-streaming.md] — where the actual `chat_message` entries are written
- [Source: _bmad-output/implementation-artifacts/1-3-manual-submission-for-approval-with-atomic-race-safety.md] — where the reversion `status_change` entry is written
- [Source: _bmad-output/implementation-artifacts/1-8-full-action-log-display-immutability-guarantee.md] — the generic, already-sufficient display these entries render through

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
