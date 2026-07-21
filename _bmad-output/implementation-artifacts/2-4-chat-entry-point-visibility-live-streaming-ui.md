# Story 2.4: Chat Entry Point Visibility & Live Streaming UI

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a manager,
I want to see a chat entry point only when there's an editable plan to revise, and watch responses stream in live,
so that I always know when I can ask for a change and never wonder if my message went through.

## Acceptance Criteria

1. Given an onboarding in `draft` or `pending_approval`, when the manager opens its detail view, then a chat entry point is visible and enabled.
2. Given an onboarding in `blocked`, `ready_for_day_1`, `in_progress`, or `completed`, when the manager opens its detail view, then no new-message entry point is offered for those statuses.
3. Given a chat message is sent, when the agent begins responding, then partial output appears incrementally in the chat panel, reusing the same progress-log presentation as initial plan generation, rather than a blind wait.
4. Given a response is streaming, when the manager looks at the message input, then it is disabled until the response completes.
5. Given the agent's revision attempt fails (per Story 2.3), when the error reaches the frontend, then the chat panel displays an inline error message and the previous plan remains shown unchanged.

## Tasks / Subtasks

- [ ] Task 1: API client (AC: 3, 5)
  - [ ] In `frontend/src/api/client.ts`, add `sendChatMessage(id: string, message: string, onProgress: (event: ProgressEvent) => void): Promise<OnboardingRecord>` calling Story 1.5's shared `streamRequest<T>` helper against `POST /api/onboardings/:id/chat` with body `{ message }`.
  - [ ] Extend `streamRequest`'s SSE-frame handling with a third event type: `else if (eventName === "error") { throw new Error(data.message); }` — Story 2.3's chat endpoint sends this distinct event on a failed revision attempt (unlike generation/retry, which always send `done`). This makes the failure surface through the same `catch (err) { setError/... }` pattern every other action on this page already uses — no new error-handling machinery needed at the call site.
- [ ] Task 2: Chat panel UI (AC: 1, 2, 3, 4, 5)
  - [ ] In `frontend/src/pages/OnboardingDetailPage.tsx`, add a `Collapsible` section (mirroring the existing "Agent console" and Story 1.8's "Action log" pattern) labeled "Revise plan via chat". **Render the section at all only when `record.status !== "blocked"`** (a `blocked` onboarding never had a plan to chat about in the first place — no entry point, nothing to show, per FR9). For the *input* specifically: enabled only when `record.status === "draft" || record.status === "pending_approval"` (AC1) — for the other three non-blocked statuses (`ready_for_day_1`/`in_progress`/`completed`), the section stays visible but the input is disabled (AC2 is about no *new-message* entry point, not about hiding history — see Story 2.5, which builds the read-only transcript view for that case on top of this section).
  - [ ] Inside it: a `TextField` for the message, a "Send" `Button`, and — once a message is submitted — a live `ProgressLog` (reusing the exact component/pattern `CreateOnboardingPage` already uses: local `events` state accumulated via the `onProgress` callback, `live={true}` while streaming). Disable the `TextField` and `Button` while a send is in flight (AC4).
  - [ ] On success: call `setRecord(updated)` with the record `sendChatMessage` resolves with (its `narrative` reflects the revision — the existing narrative `Card` above already re-renders it, no separate display needed here), clear the message input, stop showing the live console (or leave it, collapsed, as a historical trace of that one exchange — implementation's choice, not covered by any AC).
  - [ ] On failure (the `Error` thrown per Task 1's new `"error"` branch): display the error message inline in this chat section (AC5) — do **not** touch `record` at all, so the narrative `Card` above continues showing whatever it already showed, unchanged.
- [ ] Task 3: Verify (AC: 1–5)
  - [ ] `npm run build`/`lint` in `frontend/`.
  - [ ] Confirm the chat entry point is present for `draft`/`pending_approval` onboardings and absent for the other four statuses. Send a message, confirm live tool-call/reasoning/text events appear the same way they do during initial generation, confirm the input is disabled throughout, confirm the narrative updates on success and an inline error appears (with the prior narrative still visible) on a forced failure.

## Dev Notes

- **This is not a persistent multi-turn "chat bubble" UI**, and building one would be over-scoping. FR-10 explicitly keeps "only the latest plan is guaranteed to be shown, not a full version history," and FR-11's own wording is "reusing the same progress-log presentation already used for initial plan generation" — i.e. the same input → live-console → updated-result pattern `CreateOnboardingPage` already has, not a new transcript component. The durable record of past exchanges is Story 1.8's Action Log (unfiltered `actionLog` display), not this panel.
- **Naming collision reminder (same one Story 1.7 flagged):** don't confuse this story's UI with `ProgressLog.tsx` — this story *reuses* that existing component for the live console, it doesn't rename or replace it.
- **No UX design contract exists for this app** (confirmed earlier in planning) — the `Collapsible`-wrapped, `TextField`+`Button`+`ProgressLog` layout above is a reasonable, low-risk composition of components that already exist and are already used elsewhere on this exact page, not a new design system decision. If product feedback later wants a richer chat experience, that's a future iteration, not a gap in this story.
- **Handoff to Story 2.5:** this story renders the section and gates the *input*, but the read-only *transcript* content shown for `ready_for_day_1`/`in_progress`/`completed` onboardings (FR12) is Story 2.5's responsibility to fill in — don't build that rendering here, just leave the section's body conditional on the input being enabled/disabled so 2.5 has a clear seam to add its own branch.
- **Track independence:** this story only needs `record.status`/`record.narrative` (already existing fields) and Story 2.3's `/chat` endpoint contract (documented above) to build against — it doesn't need Story 2.2/2.3's actual AgentCore wiring to be *finished* to start UI work, only their documented request/response contract.

### Project Structure Notes

- Files to UPDATE: `frontend/src/api/client.ts` (new `sendChatMessage`, extend `streamRequest`), `frontend/src/pages/OnboardingDetailPage.tsx` (new Collapsible chat section). No backend changes, no new files, no new dependencies.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4: Chat Entry Point Visibility & Live Streaming UI]
- [Source: _bmad-output/planning-artifacts/prds/prd-onboarding-backoffice-2026-07-17/prd.md#FR-9, FR-11]
- [Source: frontend/src/pages/CreateOnboardingPage.tsx] — the exact input→live-console pattern this story reuses
- [Source: frontend/src/components/ProgressLog.tsx], [Source: frontend/src/components/Collapsible.tsx] — reused as-is
- [Source: _bmad-output/implementation-artifacts/1-5-manual-recovery-completion-actions.md] — `streamRequest<T>` helper this story extends
- [Source: _bmad-output/implementation-artifacts/2-3-conversational-plan-revision-endpoint-streaming.md] — the `/chat` endpoint's request/response/event contract this story consumes

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
