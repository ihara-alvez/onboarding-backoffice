# Deferred Work

- source_spec: none
  summary: Full onboarding state machine + detail-view completeness (draft/pending_approval/ready_for_day_1/in_progress/blocked/completed statuses, approved-vs-requested permissions, progress, action/audit log)
  evidence: Split out of the "missing requirements" intent on 2026-07-17 — independently shippable but touches OnboardingRecord shape, so it should follow the field-alignment goal to avoid reworking the record twice.

- source_spec: none
  summary: Manager interactive chat/revision mode to request changes to a generated onboarding plan before approving (replacing the current binary delete/approve actions)
  evidence: Split out of the "missing requirements" intent on 2026-07-17 — a substantial new conversational feature, independently shippable from data-model/state-machine work.

- source_spec: none
  summary: Replace the local Python-subprocess + direct Bedrock call with a real AWS AgentCore Runtime integration, per ARCHITECTURE.md's target architecture
  evidence: Split out of the "missing requirements" intent on 2026-07-17 — pure backend/infra swap of the agent execution mechanism, orthogonal to UI/data-model work. User noted the project is "mid-way through lab 3," making this the workshop-progression item.

- source_spec: none
  summary: Employee-facing frontoffice app giving employees access to the chat app from the other project
  evidence: User explicitly framed this as "once we have this MVP" — pre-deferred by the user's own sequencing, not part of the current multi-goal split.

## Deferred from: code review of 1-1-six-state-status-model-migration-log-schema (2026-07-21)

- Handle a valid JSON store whose root value is not an array. This is pre-existing behavior: `readAll()` already assumed an array and would fail at `.map()` before Story 1.1.

## Deferred from: code review of 1-3-manual-submission-for-approval-with-atomic-race-safety (2026-07-21)

- Multi-process concurrent writers can still race in the JSON store; this story intentionally guarantees only single-process synchronous event-loop serialization.
- Direct `fs.writeFileSync` persistence can be left partially written if the process crashes during a rewrite; crash-safe persistence is outside this story's atomic status-transition scope.

## Deferred from: code review of 1-5-manual-recovery-completion-actions (2026-07-21)

- Retry requests can race because the local JSON store has no concurrency control; this remains outside the single-user demo scope.
- Retry and completion routes have no authentication/authorization guard because the application has no authentication layer; existing state-changing routes use the same trust model.

## Deferred from: code review of 1-6-requested-vs-approved-permission-labeling (2026-07-21)

- Completed timelines omit the synthetic `in_progress` entry when a record reaches `completed` (`frontend/src/pages/OnboardingDetailPage.tsx:50-59`).
- Legacy records receive empty action logs (`backend/src/store.ts:52`).
- Retry replaces prior generation events (`backend/src/routes/onboardings.ts:181`).
- Create accepts malformed start dates that approval later rejects (`backend/src/routes/onboardings.ts:117`).
- One invalid legacy status can break the entire store read (`backend/src/store.ts:45-50`).
- Legacy `createOnboarding()` parses an SSE response as JSON (`frontend/src/api/client.ts:39-45`).
- Date-only status comparisons use UTC midnight (`backend/src/store.ts:25-33,55-59`).
- Progress entries are rendered without chronological sorting (`frontend/src/pages/OnboardingDetailPage.tsx:50-59`).
- Malformed ready-for-day-1 dates are handled inconsistently (`backend/src/store.ts:62-67`).
- The baseline-to-HEAD diff includes unrelated backend, API, manifest, and environment changes despite Story 1.6’s pure-display/file-scope constraint.
## Deferred from: code review of 1-7-progress-timeline-display (2026-07-21)

- State-changing endpoints have no authorization boundary in `backend/src/routes/onboardings.ts:190-227`; authentication is pre-existing application-wide scope, not introduced by Story 1.7.

## Deferred from: code review of 1-8-full-action-log-display-immutability-guarantee (2026-07-21)

- Delete actions are not audited; deferred because implementing this requires cross-record audit storage beyond this story's scope.

## Deferred from: code review of 3-1-header-action-bar-always-visible-status-aware-actions (2026-07-23)

- In-flight action state (`approving`/`sendingForApproval`/`retrying`/`completing`) is not reset when navigating to a different onboarding (`id` changes) — pre-existing gap in the `[id]` effect (only chat state is reset there), not introduced by Story 3.1.
- Approve/SendForApproval/Complete handlers have no internal `record.status` guard, relying solely on the `disabled` HTML attribute plus server-side rejection (Stories 1.3/1.4/1.5) as defense-in-depth. Low actual risk since the backend already validates status transitions.

## Deferred from: code review of 3-2-progress-stepper-alignment-fix (2026-07-23)

- Progress stepper has no `role="list"`/`aria-current="step"` semantics for assistive tech — real accessibility gap, out of scope for a pure layout/alignment fix; candidate for a future accessibility pass across the app.

## Deferred from: code review of 3-3-header-meta-links-project-badge-view-history-download-plan (2026-07-23)

- "Download plan" link ignores `record.status` — a `blocked` record could produce an empty/unhelpful download; gating it needs a product decision on which statuses should disable/warn, out of this story's scope.
- `HistoryModal` has no Tab/Shift+Tab focus trap — real accessibility gap in this first-modal-in-the-codebase, but a full focus trap is a bigger addition than this story's stated accessibility scope. Flagged since later modals will likely copy this pattern.
- `historyOpen` is not reset when the route's `id` param changes — same class of pre-existing gap already deferred in Story 3.1 (other in-flight state not reset on `id` change in the same effect).
- Backdrop click can close the modal mid-text-selection-drag — real but rare/minor.
- `HistoryModal` isn't rendered via a portal — currently harmless, no clipping ancestor exists, but a latent fragility if that ever changes; no portal precedent exists elsewhere in the codebase.

## Deferred from: code review of 2-4/2-5/2-6-chat-ui-and-audit (2026-07-22)

- Backend never locks `/approve` or `/send-for-approval` against a concurrent `/chat` request — pre-existing gap in Story 2.3's already-merged code (`backend/src/routes/onboardings.ts`). Frontend's new mutual-exclusion closes the practical UI path to it, but a direct API call could still race the server-side state. Cross-track backend concurrency work, not blocking the Track B UI PR.
- Zero regression coverage for the SSE error-shape bug this review found and fixed — this project's test convention (`node:test` via `tsx --test`) doesn't yet cover HTTP routes at all, only pure functions. Adding route-level test coverage is a separate testing-infrastructure investment.
