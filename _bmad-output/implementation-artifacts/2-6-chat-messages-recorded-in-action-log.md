---
baseline_commit: 601d3f3cc715a2a1e30aaf699e563bc1197c38d2
---

# Story 2.6: Chat Messages Recorded in Action Log

Status: done

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

- [x] Task 1: This is a verification story, not a new-code story (AC: 1, 2, 3)
  - [x] **No implementation work here.** Story 2.3 already appends every `chat_message`/`status_change` entry this story's ACs describe (normal revision, rejected late revision, and — via Story 1.3's `revertToDraft` — the separate reversion entry), and Story 1.8 already renders `actionLog` unfiltered with no per-type special-casing, so any entry Story 2.3 writes is already visible with zero additional frontend code. This mirrors the same "verify, don't duplicate" pattern Story 1.8 itself used for its own AC1/AC4.
  - [x] Confirm by inspection (not new code) that the three message strings Story 2.3/1.3 use are genuinely distinguishable from each other and from a plain status transition: `"Sent for approval"` / `"Chat message sent while pending approval"` (Story 1.3, `type: "status_change"`) vs. `"Plan revised per chat request: \"<message>\""` (Story 2.3 success, `type: "chat_message"`) vs. `"Revision discarded: onboarding was approved before the response arrived"` (Story 2.3 rejected-late, `type: "chat_message"`) vs. `<the raw failure reason>` (Story 2.3 failure, `type: "chat_message"`). If any two of these read ambiguously similar in the rendered Action Log, adjust the message text in `agentCoreClient.ts`/`store.ts`/the `/chat` route — that's the only "fix" this story might produce.
- [x] Task 2: End-to-end verification (AC: 1, 2, 3)
  - [x] Manually walk through: send a chat message on a `draft` onboarding (expect one `chat_message` entry). Send one on a `pending_approval` onboarding (expect a `status_change` reversion entry *and* a `chat_message` entry — two, distinguishable by their `type` and `message`). Force the mid-stream-approval race (per Story 2.3's own verification steps) and confirm the rejected-late-revision entry is clearly distinct from a normal successful one.

### Review Findings

- [x] [Review][Patch] Empty-string error message would fall through the "is it a string" fallback check in both `streamRequest` and the `/chat` route's catch block, rendering a blank error [onboardings.ts:322,327] — **fixed**: both SSE error sites now fall back to `"Unable to revise plan"` when the underlying message is empty, not just when it's non-string.
- [x] [Review][Patch] Story 2.3's own Dev Notes still described the `{ message: ... }` SSE shape this review found and fixed in code, leaving the spec doc contradicting the shipped code — **fixed**: updated `2-3-conversational-plan-revision-endpoint-streaming.md` to `{ error: ... }` with a dated correction note.
- [x] [Review][Defer] Backend never locks `/approve` or `/send-for-approval` against a concurrent `/chat` request — pre-existing gap in Story 2.3's already-merged code (`backend/src/routes/onboardings.ts`), not introduced by this diff. Frontend's new mutual-exclusion (Story 2.4's Review Findings) closes the practical UI path to it, but the server-side race technically remains open to a direct API call. Deferred — cross-track backend concurrency work, not blocking this UI-focused PR.
- [x] [Review][Defer] Zero regression coverage for the SSE error-shape bug just fixed — this project's test convention (`node:test` via `tsx --test`) doesn't yet cover HTTP routes at all (only pure functions in `agentCoreClient.test.ts`/`chatSession.test.ts`). Adding route-level test coverage is a real but separate testing-infrastructure investment, not scoped to this review.

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

claude-sonnet-5

### Debug Log References

- **Real bug found and fixed during this verification**, in `backend/src/routes/onboardings.ts`'s `/chat` route (Story 2.3's code, now merged): its two failure-path `sseWrite(res, "error", ...)` calls sent `{ message: ... }`, but the already-merged frontend `streamRequest` (and this same file's own generation/retry error path, line 99) both expect `{ error: ... }`. This exact mismatch was flagged as a risk in Story 2.4's Dev Notes and turned out to be real — before this fix, a failed chat revision would always show the generic "Unable to complete streaming request" instead of the actual reason, silently breaking Story 2.4's AC5. Fixed both call sites to `{ error: ... }`; confirmed via backend `npm test` (all 6 tests still pass — none asserted the old shape) and a live re-test showing the corrected field.
- Backend `npm run build`/`typecheck`/`test` all clean after the merge and the fix.
- **Live end-to-end verification** (real `/chat` endpoint, now merged): sent a chat message to a seeded `draft` record — one `chat_message` entry appended (AC1). Sent one to a seeded `pending_approval` record — got both a `status_change` entry (`pending_approval`→`draft`, "Chat message sent while pending approval") *and* a separate `chat_message` entry, confirming AC2's "both present and distinguishable." (Both test sends hit real AgentCore validation failures — no AWS credentials configured in this environment, and the seeded records' short custom ids don't meet the 33-character `runtimeSessionId` minimum real UUIDs satisfy — but this exercised the *failure*-path logging correctly, which is exactly what AC1/AC2 needed.)
- AC3 (mid-stream-approval-race "discarded" entry) was **not** reproduced live — the AgentCore call fails near-instantly on validation, leaving no realistic window to interleave a concurrent approve call. Verified by direct code reading instead: `applyChatRevision()`'s `current.status !== "draft"` branch appends `"Revision discarded: onboarding was approved before the response arrived"` (matches spec verbatim) and never touches `narrative`.
- Message-string distinguishability (Task 1) confirmed by reading `store.ts`/`onboardings.ts` directly — all four strings (`"Sent for approval"`, `"Chat message sent while pending approval"`, `Plan revised per chat request: "..."`, `"Revision discarded: onboarding was approved before the response arrived"`) are unambiguous and match the story's spec exactly.

### Completion Notes List

- No new code required for this story's own scope (verification-only, as designed) — but one real cross-story bug was found and fixed as a direct result of doing the verification for real: the SSE `"error"` event field-name mismatch in the `/chat` route.
- All 3 ACs verified: AC1 and AC2 live against the real merged endpoint; AC3 via direct code inspection (practical limitation on reproducing the exact race timing, not a gap in the underlying logic).
- Restored `backend/data/onboardings.json` to its original state after testing (temporary seeded records removed).

### File List

- `backend/src/routes/onboardings.ts` (modified — SSE error field-name fix, found during this story's verification)

## Change Log

- 2026-07-22 — Verified Story 2.6 end-to-end against the now-merged Story 2.2/2.3 implementation. Found and fixed a real SSE error-shape bug in the `/chat` route (`{message}` vs the established `{error}` contract) that was silently breaking Story 2.4's AC5. All 3 ACs confirmed. Status → review.
