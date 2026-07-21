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
