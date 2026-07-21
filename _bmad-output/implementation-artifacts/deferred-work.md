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
