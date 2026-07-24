---
stepsCompleted: ['requirements_extraction', 'epic_design', 'story_creation']
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-onboarding-backoffice-2026-07-17/prd.md
  - _bmad-output/planning-artifacts/prds/prd-onboarding-backoffice-2026-07-17/addendum.md
  - /home/ialvez/workspace/dayone/docs/ARCHITECTURE.md
  - _bmad-output/planning-artifacts/prds/prd-onboarding-backoffice-2026-07-17/reconcile-architecture.md
  - _bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/EXPERIENCE.md
---

# onboarding-backoffice - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for onboarding-backoffice, decomposing the requirements from the PRD (`prd.md`) and its technical addendum (`addendum.md`) into implementable stories. No dedicated Architecture.md exists for this project yet — `addendum.md` supplies the architecture-level technical decisions in its place (per user direction), and `dayone/docs/ARCHITECTURE.md` supplies the broader target-architecture context it's grounded in. No UX design contract exists; UI/interaction acceptance criteria are derived directly from the PRD's own FRs, which already specify concrete interaction states.

## Requirements Inventory

### Functional Requirements

FR1: The system tracks each onboarding's status as one of `draft`, `pending_approval`, `ready_for_day_1`, `in_progress`, `blocked`, or `completed`, replacing today's `created`/`approved` pair. Every existing record is migrated to an equivalent new status without data loss (`created`→`draft`; `approved`→`ready_for_day_1` or `in_progress` depending on stored `start_date`, per FR4's rule).

FR2: A newly created onboarding lands in `draft` when plan generation succeeds, or `blocked` when it fails (AgentCore error/timeout), automatically and without manager action. A failed generation records the failure reason in the Action Log.

FR3: A manager explicitly moves a `draft` onboarding into `pending_approval` via a "Send for approval" action. Approval is only available from `pending_approval`, never directly from `draft`. Sending another chat revision message on a `pending_approval` onboarding automatically reverts it to `draft` (logged). A concurrent revert-vs-approve race is resolved atomically at write time (status re-checked, not cached) — if the revert wins, the in-flight Approve fails with an explicit "plan changed, please review again" error.

FR4: Once a manager approves a `pending_approval` onboarding, status automatically becomes `ready_for_day_1` (if `start_date` is absent or future) or `in_progress` (if `start_date` is today or past), and automatically flips `ready_for_day_1` → `in_progress` once `start_date` arrives (computed at read time against server/UTC time, not a scheduled job).

FR5: A manager can explicitly move a `blocked` onboarding back to `draft` by retriggering generation (or back to `blocked` again on repeat failure), and can explicitly mark an `in_progress` onboarding `completed`. Marking `completed` is manual-only for this MVP — no automatic completion signal.

FR6: A manager approves a `pending_approval` onboarding as a single whole-onboarding action (no per-permission approval). Before approval, the profile's permission set is labeled "Requested Permissions"; after approval, the same set (unchanged in content) is labeled "Approved Permissions."

FR7: The detail view shows a Progress section listing each status transition (status, timestamp) the onboarding has gone through, in order. The read-time-computed `ready_for_day_1`→`in_progress` flip has no discrete Action Log entry (see FR8).

FR8: The detail view shows an append-only Action Log recording every status transition, every approve/delete action, and every Manager Revision Chat message or plan revision, each with a timestamp and actor, in chronological order. Exactly one entry is appended per action; entries are never edited or removed.

FR9: A manager can open a chat interface scoped to one onboarding whenever its status is `draft` or `pending_approval`. A `blocked` onboarding has no chat entry point (its only recovery path is FR5's retry-generation); `ready_for_day_1`, `in_progress`, and `completed` onboardings offer no entry point for new messages.

FR10: Each chat message is sent to the same agent (via AgentCore Runtime) that generated the original plan, with enough context (employee, profile, project, current plan) to re-invoke `load_profile`, `load_project`, `generate_onboarding_plan` and produce a revised plan. If the onboarding is approved while a response is in flight, the revision is discarded (approved plan never overwritten) and the Action Log records a rejected late revision. If the agent's revision attempt fails, the previous plan remains displayed unchanged and the chat surfaces the error. A message sent while a prior message is still being answered is queued and processed only after the prior response completes and is applied — never dispatched concurrently.

FR11: Chat responses stream live to the manager, reusing the existing progress-log presentation (tool-call/reasoning/text events) used for initial plan generation. The message input stays disabled while a response is streaming.

FR12: Once a manager approves an onboarding, its Manager Revision Chat becomes read-only (transcript visible, message input disabled) — no further messages can be sent.

FR13: Every chat message (manager's request and the agent's resulting narrative/revision) is recorded in the Action Log, identifying it as a revision request/response with a timestamp.

FR14: Initial plan generation is invoked against the deployed AgentCore Runtime instead of spawning `dayone`'s local Python environment as a subprocess (via the AgentCore Runtime SDK, not `child_process.spawn`). The resulting plan/narrative is stored exactly as today's subprocess-based flow would have stored it. The local Python-subprocess path (`pythonBridge.ts` + `run_narrative.py`) is removed entirely, not kept as a fallback.

FR15: Manager Revision Chat is served by the same AgentCore Runtime connection as initial generation. Conversational context across a chat's turns is carried by AgentCore Memory, keyed by a stable `userId`/`sessionId` pair minted per onboarding chat. All messages in one onboarding's chat lifetime share one stable `userId`/`sessionId` pair; two different onboardings' chats use distinct `sessionId`s and never see each other's context (isolation is per-onboarding via `sessionId`, since this app has no manager authentication and `userId` is a single shared placeholder). If the deployment's `MEMORY_ID` is not configured, the agent runs without history (each message treated as the first) — a deployment-configuration risk to verify, not a behavior this app can compensate for.

FR16: The existing Server-Sent-Events relay (`event: progress` / `event: done`) continues to work against the new AgentCore-backed transport, for both generation and chat — the frontend receives incremental `progress` events exactly as today, terminating in one `done` event.

### NonFunctional Requirements

NFR1: Action Log entries must never be editable or deletable through any app-exposed action (audit-trail immutability, per `BACKOFFICE_SPEC.md`'s "every action must be audited" rule).

NFR2: AgentCore Runtime-based generation/chat latency and success rate must be at parity with (not worse than) the current subprocess-based approach — no regression in end-to-end latency or success rate (SM-3).

NFR3: Sensitive access/permissions must require explicit human (manager) approval before being considered granted; permissions remain simulated data, not live IAM provisioning, for this MVP (per `dayone/docs/ARCHITECTURE.md`'s MVP decision "Require human approval for sensitive access" and the PRD's Non-Goals).

NFR4: The Action Log can attribute an action to "a manager" and a timestamp but not to a specific named individual, since this app has no manager authentication — a known, accepted constraint for this MVP, not a defect to silently work around.

### Additional Requirements

- **No starter template applies** — this is a brownfield change to the existing React + Express onboarding-backoffice app; Epic 1 Story 1 builds directly on the current codebase, no scaffolding step needed.
- Replace the local Python-subprocess invocation (`pythonBridge.ts` + `run_narrative.py`) entirely with calls via `@aws-sdk/client-bedrock-agentcore` (`BedrockAgentCoreClient` + `InvokeAgentRuntimeCommand`), directly from the existing Express backend — no fallback path retained (FR14).
- AgentCore Runtime connection details are fixed and known: Agent Runtime ARN `arn:aws:bedrock-agentcore:us-east-1:419466290453:runtime/htmx_chatapp_iv-YICsef3YpI`, region `us-east-1`, qualifier defaults to `DEFAULT`.
- Session/user identifier scheme: `sessionId` = the onboarding's own UUID (already 36 characters, clears the 33+ character `runtimeSessionId` minimum), reused across that onboarding's whole chat lifetime; `userId` = a fixed placeholder (e.g. `"backoffice-manager"`) since there is no manager authentication.
- Conversation continuity requires the deployment's `MEMORY_ID` env var (confirmed configured: `htmx_chatapp_iv_memory-EcqIoP3zBq`) and an explicit `MemoryHook`-equivalent pattern on this app's side: retrieve past turns before each call, persist each new turn after — continuity is not automatic from reusing `sessionId` alone.
- Exact AgentCore request payload contract (JSON encoded into the byte-buffer `payload`, `runtimeSessionId` passed alongside it): `{ prompt, userId, sessionId, modelId: "anthropic.claude-haiku-4-5", modelApi: "messages", guardrailId, guardrailVersion, guardrailEnabled }`.
- Response parsing: an NDJSON streaming body must be translated into the existing `ProgressEvent` union (`status`/`tool_call`/`reasoning`/`text` in `backend/src/types.ts` and `frontend/src/api/types.ts`) — `contentBlockDelta.delta.text` → `text`, `contentBlockDelta.delta.reasoningContent.text` → `reasoning`, `{type: "tool_use", tool_name}` → `tool_call`, `{error: true, message}` terminates the stream like today's `narrativeError` path. `{usage, metrics}` has no existing `ProgressEvent` variant — a story must decide whether to extend the union with a `metadata` variant or log it server-side only (into the Action Log's revision entry) instead of surfacing it live.
- Existing local JSON file store (`backend/data/onboardings.json`) remains the persistence layer for this round of work — no migration to DynamoDB is in scope (DynamoDB appears only in `dayone/docs/ARCHITECTURE.md`'s future target-state AWS architecture, not as a decision for this PRD's implementation).
- Bootstrap session id: FR14's very first AgentCore call (initial generation) happens before any onboarding record/id is persisted and before FR2 determines success/failure — a story must define what session id that bootstrap call uses, and whether/how any Memory events accumulated under a pre-persistence placeholder get reconciled once the real record's id exists.
- Unbounded Memory accumulation: since `sessionId` is reused for an onboarding's entire chat lifetime and FR3's auto-revert-to-draft plus FR5's blocked↔draft retry loop are both repeatable with no cap, a story must decide whether AgentCore Memory needs a cap, a reset trigger (e.g. on "Send for approval"), or is accepted as unbounded for MVP volumes.
- Delete-mid-stream: deleting an onboarding while its initial generation (FR14) or a chat revision (FR10) is still streaming is not addressed by any FR — a story must define whether the in-flight AgentCore call is cancelled and the SSE stream torn down cleanly, so a late `progress`/`done` event never writes to a deleted record.

### UX Design Requirements

No dedicated UX design contract existed for Epic 1/2 (confirmed with the user — proceeding without one at the time). UI/interaction acceptance criteria for the Manager Revision Chat and status-driven detail view were derived directly from the PRD's own FRs, which already specified concrete interaction states: chat entry-point visibility per status (FR9), disabled input while streaming (FR11), read-only chat post-approval (FR12), and Requested-vs-Approved permission labeling (FR6).

**Epic 3 introduces the project's first dedicated UX design contract** — a `bmad-ux` spine pair (`ux-designs/ux-onboarding-backoffice-2026-07-23/DESIGN.md` + `EXPERIENCE.md`), scoped to a redesign of the onboarding detail/workspace page. Unlike Epic 1/2, Epic 3 has no new FRs/NFRs behind it (no PRD change) — it is driven entirely by this UX spine, extracted below as UX-DR items:

UX-DR1: Header action bar shows Approve-slot, Complete, and Delete at all times, each individually enabled/disabled per the record's status; Retry renders only when status is `blocked`. The Approve-slot swaps label and handler by status ("Send for approval"/`handleSendForApproval` in `draft`, "Approve & send to employee"/`handleApprove` from `pending_approval` on), and swaps Button variant (filled when applicable, outlined+disabled when not) rather than just dimming opacity.

UX-DR2: Fix the Onboarding progress stepper's dot/label alignment (centered, not left-aligned) so the connector line between stages visually meets the dot centers — a real bug in the currently shipped `ProgressCard`.

UX-DR3: Replace the Onboarding narrative, Activity/action-log, and Full-plan cards with: a "Project" badge (project name) under the header subline, a "View history" link opening a client-side modal/drawer listing the full Action Log, and a "Download plan (.md)" link that downloads `record.narrative ?? record.plan` as a `.md` file via a client-side Blob/`URL.createObjectURL` — no new backend endpoint for either.

UX-DR4: Reorder and restructure the detail page's main content into nine cards, in this order: Progress, First tasks (`project.first_tasks`), Onboarding context (business goal + architecture summary + a Details sub-section carrying `profile.summary`/`startDate`/`buddyEmail`/`seniority`/`location`/`notes`, each conditionally shown), Repositories (table: Repository/Access/Setup), Permissions (table: Permission/System/Included, replacing grouped chips), Checklists (Day 1 + Week 1), Suggested documentation, Approvals and risks.

UX-DR5: Implement a "Viewed" checkbox on every card except Progress — checking it collapses the card to a single-line bar (real component state, e.g. a `Set` of viewed card ids; not a CSS-only trick). Unchecking re-expands. This state is local UI state only, not persisted to `OnboardingRecord`.

UX-DR6: Adopt Heroicons (outline, 24×24 viewBox, stroke-width 1.5) as a new icon-library dependency, replacing the hand-drawn `TrashIcon.tsx` and the hand-drawn Search/Bell SVGs in `TopAppBar.tsx`; also used for the new Download-plan, View-history, and dark-mode-toggle icons.

UX-DR7: Add a dark-mode token set and a header sun/moon toggle (between Search and Notifications) that switches the whole page's color tokens; the toggle overrides OS `prefers-color-scheme` once the user sets it explicitly, persisted client-side, otherwise follows system preference by default.

UX-DR8: Add a new semantic `success` color token (light `#16a34a` / dark `#4ade80`), used only for the Viewed-checkbox's checked state and the Permissions table's "Included" tick — a UI-accent/glyph use, never text.

UX-DR9: Confirm — no code change expected — that the Plan chat panel remains `position:sticky` while the now-longer main column scrolls; already correct in the shipped `OnboardingDetailPage.tsx`.

UX-DR10: Every color pair (light and dark), including the new `success`/`review-container` tokens, must meet WCAG AA text contrast at the sizes used; `success` is held to the 3:1 non-text bar since it's UI-accent-only. All new interactive elements (header action buttons, header meta links, dark-mode toggle, Viewed checkboxes) must show a visible focus ring and be reachable/operable via keyboard alone. A collapsed (Viewed) card's body must be genuinely removed from the accessibility tree (not just visually hidden), so screen readers don't read collapsed content.

**Epic 3 — Additional Requirements (technical, not from an Architecture.md — none exists for this change):**

- New npm dependency: `@heroicons/react` (or an equivalent Heroicons-outline SVG set) added to the frontend — a real dependency-management decision (version pin, bundle size, license check), not a trivial visual swap.
- No new backend endpoints anywhere in this epic — "View history" and "Download plan" both operate client-side on data the detail view already fetches (`record.actionLog`, `record.narrative`/`record.plan`).
- Roles/permissions model is explicitly out of scope/deferred (`EXPERIENCE.md` Open Questions) — no login system exists today; this epic keeps the page role-agnostic exactly as shipped.

### FR Coverage Map

FR1: Epic 1 - Six-state lifecycle replacing `created`/`approved`, with migration
FR2: Epic 1 - Automatic `draft`/`blocked` transition on generation outcome
FR3: Epic 1 - Manual submission to `pending_approval`, with atomic revert-vs-approve race rule
FR4: Epic 1 - Automatic post-approval transitions (`ready_for_day_1`/`in_progress`)
FR5: Epic 1 - Manual `blocked`→`draft` retry and `in_progress`→`completed` actions
FR6: Epic 1 - Whole-onboarding approval with Requested/Approved permission labeling
FR7: Epic 1 - Progress section (status transitions with timestamps)
FR8: Epic 1 - Append-only Action Log
FR9: Epic 2 - Chat entry point gated on `draft`/`pending_approval` status
FR10: Epic 2 - Conversational plan revision via agent tool re-invocation
FR11: Epic 2 - Live streaming chat responses, disabled input while streaming
FR12: Epic 2 - Chat becomes read-only after approval
FR13: Epic 2 - Chat messages recorded in the Action Log
FR14: Epic 2 - Replace subprocess invocation with AgentCore Runtime SDK calls
FR15: Epic 2 - AgentCore Runtime backs chat with Memory-based session continuity
FR16: Epic 2 - SSE streaming relay preserved against the new transport

## Epic List

### Epic 1: Full Onboarding Lifecycle & Audit Trail

Manager can see and control an onboarding's real-world status end-to-end — automatic transitions on generation/approval/date, manual actions for edge cases (retry, complete), Requested-vs-Approved permission labeling, a Progress timeline, and an immutable Action Log.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8
**NFRs covered:** NFR1, NFR3, NFR4

### Epic 2: AgentCore-Powered Generation & Manager Revision Chat

Plan generation moves off the local Python subprocess onto the deployed AgentCore Runtime, and — built on that same connection — a manager gains a chat panel to conversationally revise a plan before approving it, with live streaming and full audit logging.
**FRs covered:** FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16
**NFRs covered:** NFR2

### Epic 3: Onboarding Detail Page Redesign

Redesigns the onboarding detail/workspace page per the project's first UX design contract (`ux-designs/ux-onboarding-backoffice-2026-07-23/DESIGN.md` + `EXPERIENCE.md`): an always-visible, status-aware header action bar; a progress-stepper alignment fix; a nine-card content structure with a GitHub-PR-style "Viewed" collapse pattern replacing the old Narrative/Activity/Full-plan cards; a Heroicons icon-library adoption; full dark-mode support; and follow-up People/list and chat usability enhancements.
**UX-DRs covered:** UX-DR1, UX-DR2, UX-DR3, UX-DR4, UX-DR5, UX-DR6, UX-DR7, UX-DR8, UX-DR9, UX-DR10, plus Stories 3.9–3.14 follow-up UX requirements
**FRs/NFRs covered:** none (no PRD change — this epic is UX-spine-driven)

---

## Epic 1: Full Onboarding Lifecycle & Audit Trail

Manager can see and control an onboarding's real-world status end-to-end — automatic transitions on generation/approval/date, manual actions for edge cases (retry, complete), Requested-vs-Approved permission labeling, a Progress timeline, and an immutable Action Log.

**Parallelization note:** Story 1.1 is a shared foundation to complete first. After that, Track A (1.2–1.5, status-transition engine) and Track B (1.6–1.8, detail-view read surfaces) can proceed in parallel, since Track B only depends on the status enum and log schema 1.1 establishes, not on Track A's transition logic being finished.

### Story 1.1: Six-State Status Model, Migration & Log Schema

As a manager,
I want the onboarding record to track one of six lifecycle statuses (`draft`, `pending_approval`, `ready_for_day_1`, `in_progress`, `blocked`, `completed`),
So that I can see exactly where each onboarding stands instead of today's binary `created`/`approved` flag.

**Acceptance Criteria:**

**Given** an existing onboarding record with status `created`
**When** the migration runs
**Then** its status becomes `draft` and no other record data is lost

**Given** an existing onboarding record with status `approved`
**When** the migration runs
**Then** its status becomes `ready_for_day_1` if `start_date` is absent or in the future, or `in_progress` if `start_date` is today or in the past, and no other record data is lost

**Given** the list or detail view is opened
**When** an onboarding's status is displayed
**Then** it shows one of the six new values, never `created`/`approved`

**Given** the migration completes
**When** the status-transition-history and Action Log storage schemas are created
**Then** they are ready to receive entries from later stories (schema/types only — no UI yet)

### Story 1.2: Automatic Draft/Blocked Status on Generation Outcome

As a manager,
I want a newly created onboarding to automatically land in `draft` or `blocked` based on whether plan generation succeeded,
So that I immediately know whether the plan is ready for my review without checking logs manually.

**Acceptance Criteria:**

**Given** a manager creates an onboarding and plan generation succeeds
**When** the record is created
**Then** its status is `draft`

**Given** a manager creates an onboarding and plan generation fails (error or timeout)
**When** the record is created
**Then** its status is `blocked`

**Given** a plan generation failure
**When** the onboarding lands in `blocked`
**Then** an Action Log entry is created recording the failure reason and timestamp

**Given** a plan generation success
**When** the onboarding lands in `draft`
**Then** no Action Log entry claims a failure

### Story 1.3: Manual Submission for Approval with Atomic Race Safety

As a manager,
I want to explicitly send a `draft` onboarding for approval,
So that I signal the plan is final without anyone approving an unfinished draft by mistake.

**Acceptance Criteria:**

**Given** a `draft` onboarding
**When** the manager clicks "Send for approval"
**Then** status becomes `pending_approval` and an Action Log entry records it

**Given** a `pending_approval` onboarding
**When** a plan revision is applied instead of approving (the trigger itself, chat, is Epic 2 scope — this verifies the status service behaves correctly when invoked)
**Then** status automatically reverts to `draft` and the Action Log records the reversion

**Given** a revert-to-draft and an Approve click happen at nearly the same moment
**When** the status change is written
**Then** whichever completes first wins atomically — status is re-checked at write time, never cached from an earlier read

**And** if the revert wins that race, the pending Approve attempt fails with an explicit "plan changed, please review again" error rather than silently applying or no-oping

**Given** an onboarding not in `draft`
**When** "Send for approval" is attempted
**Then** the action is rejected

### Story 1.4: Approve Action — Automatic Post-Approval Transitions

As a manager,
I want approving a pending onboarding to automatically place it in the correct next stage based on the start date,
So that I don't have to manually track when someone's day one arrives.

**Acceptance Criteria:**

**Given** a `pending_approval` onboarding with `start_date` absent or in the future
**When** the manager approves it
**Then** status becomes `ready_for_day_1`

**Given** a `pending_approval` onboarding with `start_date` today or earlier
**When** the manager approves it
**Then** status becomes `in_progress`

**Given** an onboarding in `ready_for_day_1` whose `start_date` arrives
**When** the record is fetched (any view/read)
**Then** status is computed and displayed as `in_progress`, comparing against server/UTC time, not the viewing manager's local timezone

**And** no discrete Action Log entry is created for this read-time flip (per FR8's stated exception)

**Given** an onboarding not in `pending_approval`
**When** Approve is attempted
**Then** the action is rejected

### Story 1.5: Manual Recovery & Completion Actions

As a manager,
I want to manually retry a blocked onboarding and mark an in-progress onboarding complete,
So that I can recover from generation failures and close out finished onboardings myself.

**Acceptance Criteria:**

**Given** a `blocked` onboarding
**When** the manager retries generation
**Then** status returns to `draft` on success, or remains/returns to `blocked` on repeat failure, and the Action Log records the retry attempt and its outcome

**Given** an `in_progress` onboarding
**When** the manager marks it complete
**Then** status becomes `completed` and the Action Log records the action and timestamp

**Given** an onboarding not in `blocked`
**When** retry-generation is attempted
**Then** the action is rejected

**Given** an onboarding not in `in_progress`
**When** mark-complete is attempted
**Then** the action is rejected

### Story 1.6: Requested vs. Approved Permission Labeling

As a manager,
I want the permission set labeled "Requested" before approval and "Approved" after,
So that I never mistake a pending grant for one that's actually been signed off.

**Acceptance Criteria:**

**Given** a `draft` or `pending_approval` onboarding
**When** its detail view is opened
**Then** the permission set is labeled "Requested Permissions"

**Given** an onboarding in `ready_for_day_1`, `in_progress`, or `completed`
**When** its detail view is opened
**Then** the same permission set is labeled "Approved Permissions," unchanged in content

**Given** permissions remain simulated data, not live grants (NFR3)
**When** either label is shown
**Then** no real IAM/access provisioning occurs as part of displaying or relabeling — the label change is presentational only

### Story 1.7: Progress Timeline Display

As a manager,
I want to see a timeline of every status change an onboarding has gone through,
So that I can understand its history at a glance without piecing it together from the Action Log.

**Acceptance Criteria:**

**Given** any onboarding
**When** its detail view is opened
**Then** a Progress section lists each status transition (status value, timestamp) in chronological order

**Given** the `ready_for_day_1`→`in_progress` read-time flip has occurred (FR4)
**When** Progress is displayed
**Then** it reflects the flip as of the `start_date` itself, not a logged event time

**Given** an onboarding with only one status so far (e.g. freshly created `draft`)
**When** Progress is displayed
**Then** it shows that single entry without error

### Story 1.8: Full Action Log Display & Immutability Guarantee

As a manager,
I want an append-only audit trail of every status change and manager action on an onboarding,
So that I have a complete, tamper-proof record I can trust for compliance or answering questions about what happened.

**Acceptance Criteria:**

**Given** any status transition, approve, or delete action occurs
**When** it completes
**Then** exactly one new Action Log entry is appended, never edited or removed

**Given** the detail view is opened
**When** the Action Log section renders
**Then** entries appear in chronological order with timestamp and actor

**Given** no manager authentication exists in this app (NFR4)
**When** an entry is attributed
**Then** it identifies "a manager" generically rather than a specific named individual — documented accepted behavior, not a defect

**Given** the app's exposed actions (API/UI)
**When** checked for an edit- or delete-Action-Log-entry capability
**Then** no such capability exists anywhere in the app (NFR1)

**Given** the read-time-computed `ready_for_day_1`→`in_progress` flip (FR4)
**When** the Action Log is viewed
**Then** no entry exists for it — it's covered by Progress (1.7), not the Action Log, per FR8's stated exception

---

## Epic 2: AgentCore-Powered Generation & Manager Revision Chat

Plan generation moves off the local Python subprocess onto the deployed AgentCore Runtime, and — built on that same connection — a manager gains a chat panel to conversationally revise a plan before approving it, with live streaming and full audit logging.

**Parallelization note:** Story 2.1 is a shared foundation to complete first — it establishes the AgentCore client, payload contract, and NDJSON→`ProgressEvent` translation both tracks build on. After that, Track A (2.2–2.3, chat backend/agent integration) and Track B (2.4–2.6, chat UI/audit) can proceed in parallel against the agreed API/streaming contract.

### Story 2.1: Replace Subprocess with AgentCore Runtime SDK for Plan Generation

As a manager,
I want plan generation to run against the deployed AgentCore Runtime instead of a local Python subprocess,
So that generation is production-grade and reliable, and doesn't depend on a local Python environment.

**Acceptance Criteria:**

**Given** a manager creates an onboarding
**When** plan generation runs
**Then** the request is sent via the AgentCore Runtime SDK (`@aws-sdk/client-bedrock-agentcore`, `BedrockAgentCoreClient` + `InvokeAgentRuntimeCommand`) against Agent Runtime ARN `arn:aws:bedrock-agentcore:us-east-1:419466290453:runtime/htmx_chatapp_iv-YICsef3YpI` (region `us-east-1`, qualifier `DEFAULT`), not via `child_process.spawn` into a Python interpreter

**Given** the AgentCore call succeeds
**When** the response is received
**Then** the resulting plan/narrative is stored exactly as today's subprocess-based flow would have stored it — no change to the `OnboardingRecord` shape from this story alone

**Given** this story ships
**When** the local Python-subprocess path (`pythonBridge.ts` + `run_narrative.py`) is removed
**Then** no fallback to it remains anywhere in the codebase

**Given** no onboarding record exists yet — the very first AgentCore call for a brand-new onboarding, made before generation succeeds or fails
**When** that bootstrap call is made
**Then** it uses a defined bootstrap session id rather than failing or reusing another onboarding's session; since initial generation is single-turn and doesn't need Memory continuity (only the chat feature does), no reconciliation with the real record's id is required once it's persisted

**Given** the AgentCore Runtime streams NDJSON
**When** a response comes back
**Then** `contentBlockDelta.delta.text` maps to `{type: "text", text, complete: false}` (with one final `complete: true`), `contentBlockDelta.delta.reasoningContent.text` maps to `{type: "reasoning", text}`, `{type: "tool_use", tool_name}` maps to `{type: "tool_call", tool: tool_name, count}`, and `{error: true, message}` terminates the stream the same way today's `narrativeError` path does

**Given** a `{usage, metrics}` event arrives
**When** it's received
**Then** it is logged server-side only — no new `ProgressEvent` variant is added for it in this story

**Given** the AgentCore-based generation path is live
**When** compared against the former subprocess-based approach
**Then** end-to-end latency and success rate show no regression (NFR2)

**Given** an onboarding is deleted while its initial generation is still streaming
**When** the deletion occurs
**Then** the in-flight AgentCore call/stream is cancelled or its late `progress`/`done` events are safely discarded, and no event attempts to write to the deleted record

### Story 2.2: AgentCore Memory-Based Session Continuity for Chat

As a manager,
I want my chat conversation with the agent to remember earlier turns within the same onboarding,
So that I don't have to repeat context every message.

**Acceptance Criteria:**

**Given** a chat session on one onboarding
**When** multiple messages are sent
**Then** they share one stable `userId`/`sessionId` pair for that onboarding's chat lifetime — `sessionId` reuses the onboarding's own UUID (36 characters, clears the 33+ character `runtimeSessionId` minimum), `userId` is a fixed placeholder (e.g. `"backoffice-manager"`)

**Given** two different onboardings' chats are active
**When** either sends a message
**Then** they use distinct `sessionId`s and never see each other's context

**Given** the deployment's AgentCore Memory resource (`MEMORY_ID`, confirmed configured as `htmx_chatapp_iv_memory-EcqIoP3zBq`)
**When** a chat message is sent
**Then** past turns are retrieved (`list_events`) and injected before the call, and the new turn is persisted (`create_event`) after — continuity is not automatic from reusing `sessionId` alone

**Given** the deployment's `MEMORY_ID` were ever unset
**When** a chat is used
**Then** the agent runs without history (each message treated as the first) rather than erroring — a deployment-configuration risk the app logs but cannot compensate for at the API level

**Given** an onboarding's chat accumulates messages across repeated auto-revert-to-draft (Story 1.3) and blocked↔draft retry (Story 1.5) cycles
**When** the session grows
**Then** no cap or reset is implemented for this MVP — unbounded accumulation is accepted as-is given the app's single-user, demo-scale volumes; this is a documented decision, not an oversight

### Story 2.3: Conversational Plan Revision Endpoint & Streaming

As a manager,
I want to send a chat message describing a change and have the agent revise the plan using its existing tools,
So that I can fix an inaccurate plan without deleting and recreating the onboarding.

**Acceptance Criteria:**

**Given** a chat message requesting a specific change
**When** the agent responds
**Then** the onboarding's stored plan reflects the requested change, with enough context (employee, profile, project, current plan) sent for the agent to reason and re-invoke `load_profile`, `load_project`, `generate_onboarding_plan`

**Given** the onboarding was approved while a chat response was in flight
**When** the response arrives
**Then** the revision is discarded — the approved plan is never overwritten — and the Action Log records a rejected late revision

**Given** the agent's revision attempt fails
**When** the failure occurs
**Then** the previous plan remains displayed unchanged and the chat surfaces the error

**Given** a chat message is sent while a previous message on the same onboarding is still being answered
**When** the new message arrives
**Then** it is queued and processed only after the prior response completes and is applied — never dispatched concurrently against a plan that may already be stale

**Given** a chat message is in progress
**When** the agent streams output
**Then** the frontend receives incremental `progress` events via the existing SSE relay (`event: progress`/`event: done`) exactly as it does for initial generation, terminating in one `done` event

**Given** an onboarding is deleted while a chat revision is still streaming
**When** the deletion occurs
**Then** the in-flight AgentCore call/stream is cancelled or its late `progress`/`done` events are safely discarded, and no event attempts to write to the deleted record

### Story 2.4: Chat Entry Point Visibility & Live Streaming UI

As a manager,
I want to see a chat entry point only when there's an editable plan to revise, and watch responses stream in live,
So that I always know when I can ask for a change and never wonder if my message went through.

**Acceptance Criteria:**

**Given** an onboarding in `draft` or `pending_approval`
**When** the manager opens its detail view
**Then** a chat entry point is visible and enabled

**Given** an onboarding in `blocked`, `ready_for_day_1`, `in_progress`, or `completed`
**When** the manager opens its detail view
**Then** no new-message entry point is offered for those statuses (`blocked`'s recovery path is Story 1.5's retry-generation) — an already-approved onboarding may still show its existing read-only transcript, a display concern this story doesn't need to implement

**Given** a chat message is sent
**When** the agent begins responding
**Then** partial output appears incrementally in the chat panel, reusing the same progress-log presentation as initial plan generation (tool-call/reasoning/text events), rather than a blind wait

**Given** a response is streaming
**When** the manager looks at the message input
**Then** it is disabled until the response completes, consistent with Story 2.3's queuing rule

**Given** the agent's revision attempt fails (per Story 2.3)
**When** the error reaches the frontend
**Then** the chat panel displays an inline error message and the previous plan remains shown unchanged — the error is rendered to the manager, not just returned by the endpoint

### Story 2.5: Chat Read-Only After Approval

As a manager,
I want the chat to become read-only once I've approved an onboarding,
So that the approved plan can never be second-guessed by a stray late message.

**Acceptance Criteria:**

**Given** an approved onboarding (`ready_for_day_1`, `in_progress`, or `completed`)
**When** the manager opens its detail view
**Then** the chat transcript is visible but the message input is disabled

**Given** a chat was mid-stream when approval happened
**When** the response completes
**Then** the resulting text is still visible in the transcript for reference, but is discarded as a plan revision per Story 2.3's in-flight-approval rule — transcript is not the same as the applied plan

### Story 2.6: Chat Messages Recorded in Action Log

As a manager,
I want every chat exchange to show up in the Action Log,
So that plan revisions are just as auditable as status changes and approvals.

**Acceptance Criteria:**

**Given** a chat exchange occurs (manager's message and the agent's resulting narrative/revision)
**When** the Action Log is viewed
**Then** an entry exists identifying it as a revision request/response with a timestamp

**Given** a chat-triggered revert-to-draft occurs (Story 1.3)
**When** the Action Log is viewed
**Then** the reversion entry and the chat-message entry are both present and distinguishable

**Given** a late revision is discarded because the onboarding was approved mid-stream (Story 2.3)
**When** the Action Log is viewed
**Then** an entry records the rejected late revision, distinct from a normally-applied one

---

## Epic 3: Onboarding Detail Page Redesign

Redesigns the onboarding detail/workspace page per the project's first UX design contract (`ux-designs/ux-onboarding-backoffice-2026-07-23/DESIGN.md` + `EXPERIENCE.md`): an always-visible, status-aware header action bar; a progress-stepper alignment fix; a nine-card content structure with a GitHub-PR-style "Viewed" collapse pattern replacing the old Narrative/Activity/Full-plan cards; a Heroicons icon-library adoption; and full dark-mode support.

**Parallelization note:** Stories 3.1–3.3 (header actions, stepper fix, header meta links) touch different parts of `OnboardingDetailPage.tsx`/`TopAppBar.tsx` and can proceed in parallel. Story 3.4 (icon library) depends on 3.1 and 3.3 having introduced the icon usages it replaces/completes. Stories 3.5–3.6 (data tables, card restructure) are the core content-restructuring work and should land before 3.7 (Viewed-checkbox, which wraps the resulting cards). Story 3.8 (dark mode) lands last — it depends on 3.7's `success` token existing so it can extend it to a dark variant, and benefits from every other visual change already being in place to re-theme.

### Story 3.1: Header Action Bar — Always-Visible Status-Aware Actions

As a manager,
I want Approve, Complete, and Delete always present in the header — enabled or disabled based on the onboarding's current status — instead of only the one currently-valid action appearing,
So that I always see the full set of lifecycle actions and understand at a glance which ones apply right now.

**Acceptance Criteria:**

**Given** an onboarding in `draft`
**When** the detail view renders
**Then** the Approve-slot button shows label "Send for approval", is enabled, and calls `handleSendForApproval`; Complete renders disabled (outlined variant); Retry does not render; Delete renders enabled (subject to the existing `anyActionInFlight` guard)

**Given** an onboarding in `pending_approval`
**When** the detail view renders
**Then** the Approve-slot button shows label "Approve & send to employee", is enabled, and calls `handleApprove`; Complete renders disabled (outlined variant); Retry does not render

**Given** an onboarding in `ready_for_day_1` or `completed`
**When** the detail view renders
**Then** both the Approve-slot and Complete buttons render disabled (outlined variant); Retry does not render

**Given** an onboarding in `in_progress`
**When** the detail view renders
**Then** the Approve-slot button renders disabled (outlined variant); Complete renders enabled (filled variant) and calls `handleComplete`; Retry does not render

**Given** an onboarding in `blocked`
**When** the detail view renders
**Then** both Approve-slot and Complete render disabled (outlined variant); Retry renders enabled (filled variant) and calls `handleRetry` — the only status where Retry appears

**Given** the currently-applicable action in the Approve-slot/Complete pair (or Retry, when shown)
**When** it renders
**Then** it uses the Button component's filled variant; the inapplicable member of the pair renders the outlined variant, disabled — not the same filled button dimmed by opacity alone

**Given** any action (approve/send-for-approval/retry/complete/delete/chat-send) is in flight
**When** Delete is evaluated
**Then** it is disabled, matching today's `anyActionInFlight` guard — unchanged behavior

**Given** the manager clicks Delete
**When** the click is handled
**Then** the existing `window.confirm()` guard still fires before deletion proceeds — unchanged

### Story 3.2: Progress Stepper Alignment Fix

As a manager,
I want the connecting line between progress-stepper stages to visually meet the stage dots,
So that the timeline reads as one continuous progression instead of a misaligned line and dots.

**Acceptance Criteria:**

**Given** the Onboarding progress card renders
**When** each stage column lays out its dot and label
**Then** both are horizontally centered within the column (`align-items: center`), not left-aligned as in the current shipped `ProgressCard`

**Given** two adjacent stage columns
**When** the connector line between them renders
**Then** it visually spans from one dot's center to the next dot's center, with no gap or offset, in every stepper state (0 through 5 completed stages)

**Given** this is a pure layout fix
**When** it ships
**Then** no change occurs to the stepper's underlying status/data logic (`buildProgressEntries`, stage completion calculation) — visual alignment only

### Story 3.3: Header Meta Links — Project Badge, View History, Download Plan

As a manager,
I want to see which project this onboarding is for, review the full action history, and download the generated plan, all from the page header,
So that I don't need the old Narrative, Activity, or Full-plan cards taking up space in the main content column.

**Acceptance Criteria:**

**Given** the detail view header
**When** it renders
**Then** a "Project" badge showing `record.project.name` appears under the employee email/role subline

**Given** the header's meta-links row
**When** it renders
**Then** it shows two links: "View history" and "Download plan (.md)", both under the Project badge

**Given** the manager clicks "View history"
**When** the click is handled
**Then** a client-side modal/drawer opens listing the full `record.actionLog` (timestamp, actor, message, in chronological order) — the same content the old `ActionLogCard` rendered — with no new backend route or endpoint

**Given** the manager clicks "Download plan (.md)"
**When** the click is handled
**Then** a `.md` file download is triggered client-side (Blob + `URL.createObjectURL`) containing `record.narrative ?? record.plan` (the same fallback `FullPlanCard` used), named `<employee-slug>-onboarding-plan.md`, with no new backend endpoint

**Given** this story ships
**When** the page renders
**Then** the old Onboarding narrative card, Activity/action-log card, and Full-plan card no longer render anywhere on the page

### Story 3.4: Heroicons Icon Library Adoption

As a manager,
I want the header and Delete icons to use a consistent, professional icon set,
So that the interface reads as polished rather than a mix of hand-drawn shapes.

**Acceptance Criteria:**

**Given** the frontend's dependencies
**When** this story ships
**Then** `@heroicons/react` (or an equivalent Heroicons-outline SVG set) is added as a real, version-pinned dependency

**Given** the Delete icon button
**When** it renders
**Then** it uses the Heroicons outline Trash icon, replacing the hand-drawn `TrashIcon.tsx`; `TrashIcon.tsx` is removed, not kept as a fallback

**Given** the header's Search and Notifications buttons
**When** they render
**Then** they use Heroicons outline MagnifyingGlass and Bell icons, replacing the hand-drawn inline SVGs in `TopAppBar.tsx`

**Given** the "View history" and "Download plan" links (Story 3.3)
**When** they render
**Then** they use Heroicons outline Clock and ArrowDownTray icons respectively

**Given** all adopted icons
**When** rendered
**Then** they share one consistent spec: 24×24 viewBox, stroke-width 1.5, round linecap/linejoin — no leftover hand-drawn icon remains alongside them in the redesigned surfaces

### Story 3.5: Repositories & Permissions as Data Tables

As a manager,
I want Repositories and Permissions each shown as a compact table,
So that I can scan access and setup information row by row instead of parsing paragraph-style blocks or grouped chips.

**Acceptance Criteria:**

**Given** the Repositories card
**When** it renders
**Then** it shows a table with columns Repository | Access | Setup, using the real `bootstrap`/`test` commands from each `ProjectRepo` — no "Last synced" column, since no such field exists on `ProjectRepo`

**Given** the Permissions card
**When** it renders
**Then** it shows a table with columns Permission | System | Included, listing every entry from `profile.permissions.aws`, `.repositories`, and `.ci_cd` — replacing the old grouped-chips-by-category layout

**Given** the Permissions card title
**When** the record's status changes
**Then** it continues to swap "Requested permissions" ↔ "Approved permissions" via the existing `isApprovedStatus()` check — unchanged behavior, only the layout beneath it changes

**Given** either table's content is wider than its container
**When** it renders
**Then** the table scrolls horizontally within its own container (`overflow-x: auto`) and never causes the page itself to scroll sideways

### Story 3.6: Card Restructure — Onboarding Context, Checklists, Suggested Documentation, Approvals & Risks

As a manager,
I want the rest of the generated plan's content organized into clearly labeled cards in a sensible order, with nothing from the generated plan missing,
So that I can review the whole plan without hunting for a section or wondering if something was left out.

**Acceptance Criteria:**

**Given** the detail view's main content column
**When** it renders
**Then** cards appear in this order: Progress, First tasks, Onboarding context, Repositories, Permissions, Checklists, Suggested documentation, Approvals and risks — with nothing rendering below Approvals and risks

**Given** the First tasks card
**When** it renders
**Then** it lists `project.first_tasks` in full, with no fabricated fields (e.g. no due dates, since none exist on the data model)

**Given** the Onboarding context card
**When** it renders
**Then** it shows three labeled sub-sections: Business goal (`project.business_goal`), Architecture summary (`project.architecture_summary`), and Details — Details shows `profile.summary` ("Role focus") and, only when present, `record.startDate`, `buddyEmail`, `seniority`, `location`, and `notes`, matching the conditional-display behavior of today's `OverviewCard`

**Given** the Checklists card
**When** it renders
**Then** it shows two labeled sub-lists, Day 1 (`profile.base_checklist.day_1`) and Week 1 (`profile.base_checklist.week_1`), each in full

**Given** the Suggested documentation card
**When** it renders
**Then** it lists `project.key_docs` in full

**Given** the Approvals and risks card
**When** it renders
**Then** it shows two labeled sub-lists, Approvals required (`profile.approvals_required`) and Project risk notes (`project.risk_notes`), each in full

**Given** this story ships
**When** the page is compared to today's shipped version
**Then** the old Day 1/Week 1 checklist pair, "Suggested first tasks"/"Suggested documentation" pair, and "Approvals and risks" card are superseded by the cards above — no duplicate rendering of the same content in two places

**Given** the main content column is now longer (full content per card, no truncation)
**When** the manager scrolls the page
**Then** the Plan chat panel remains visible via its existing `position: sticky` behavior (`OnboardingDetailPage.tsx`'s aside is already `sticky top-16 h-[calc(100vh-4rem)]`) — this story only needs to verify this still holds against the new content length, no new sticky implementation is expected

### Story 3.7: Viewed-Checkbox Review Pattern

As a manager,
I want to check off each card as I review it and have it collapse out of my way,
So that I can track my own review progress on a plan the way I would review files in a pull request.

**Acceptance Criteria:**

**Given** any card except Progress (First tasks, Onboarding context, Repositories, Permissions, Checklists, Suggested documentation, Approvals and risks)
**When** it renders
**Then** it shows an unchecked "Viewed" checkbox in its header by default, and its full content is visible

**Given** a card's "Viewed" checkbox
**When** the manager checks it
**Then** the card collapses to a single-line bar — its body content is hidden, its background shifts to a muted/surface-variant tone, and its title dims — driven by real component state (e.g. a `Set` of viewed card ids in `OnboardingDetailPage.tsx`), not a CSS-only mechanism

**Given** a collapsed (Viewed) card
**When** the manager unchecks its box
**Then** it re-expands to its full content — the action is always reversible

**Given** the app introduces its first semantic "success" color
**When** the Viewed-checkbox's checked state and the Permissions table's "Included" column render their checkmarks
**Then** both use one new token, `success` (`#16a34a`), rather than an untokenized literal color

**Given** the manager reloads the page or navigates away and back
**When** the detail view renders again
**Then** all cards return to their default (unchecked, expanded) state — Viewed state is local UI state only, not persisted to `OnboardingRecord` or any backend field

**Given** a collapsed (Viewed) card
**When** inspected with assistive technology
**Then** its hidden body content is genuinely removed from the accessibility tree (e.g. not rendered, or `hidden`/`aria-hidden`), not merely visually hidden while still exposed to screen readers

**Given** any Viewed checkbox
**When** navigated to via keyboard
**Then** it shows a visible focus ring and can be toggled with `Space`, consistent with standard checkbox semantics

### Story 3.8: Dark Mode Support

As a manager,
I want to switch the onboarding workspace to a dark theme,
So that I can use the tool comfortably in low-light conditions or per my own preference.

**Acceptance Criteria:**

**Given** the app's existing light-mode token set (`frontend/src/index.css`)
**When** this story ships
**Then** a complete parallel dark-mode token set exists for every color role used on this page, including the new `success` token from Story 3.7 (`success-dark`, `#4ade80`) and the `review-container`/`on-review-container` pending-approval chip pair

**Given** the header
**When** it renders
**Then** a sun/moon toggle appears between the Search and Notifications icons, using the Heroicons Sun/Moon icons from Story 3.4

**Given** the manager clicks the theme toggle
**When** the click is handled
**Then** the whole page switches between light and dark token sets immediately, with no page reload

**Given** the manager has not yet set a manual preference
**When** the page loads
**Then** it follows the OS/browser `prefers-color-scheme` setting

**Given** the manager has clicked the toggle at least once
**When** the page is reloaded or revisited
**Then** the manually-chosen theme persists (client-side, e.g. `localStorage`) and overrides `prefers-color-scheme` until changed again

**Given** every color pair in both the light and dark token sets
**When** audited for contrast
**Then** all pairs meet WCAG AA text contrast at the sizes they're used, except `success`/`success-dark`, which — being used only as a UI accent/glyph (checkbox, tick), never as text — is held to the 3:1 non-text contrast bar instead

### Story 3.9: Chat Send Affordance and Keyboard Submission

As a manager,
I want a recognizable send control and a keyboard shortcut for submitting chat messages,
So that sending a revision request is obvious and fast.

**Acceptance Criteria:**

**Given** an editable chat
**When** the input renders
**Then** the adjacent button contains a visible send icon matching the onboarding detail reference, has an accessible name such as "Send message", and is visibly disabled when sending is unavailable

**Given** the input contains non-empty text
**When** the manager presses Enter without Shift
**Then** the message is submitted through the same handler as clicking Send

**Given** the manager presses Shift+Enter
**When** the input has focus
**Then** a newline is inserted and the message is not submitted

**Given** the input is empty, read-only, or a response is streaming
**When** the manager presses Enter or activates Send
**Then** no message is submitted

### Story 3.10: Chat Response Intent and Outcome Handling

As a manager,
I want responses to unrelated prompts to explain that they are out of scope,
So that the UI does not claim that an onboarding plan changed when it did not.

**Acceptance Criteria:**

**Given** a prompt unrelated to the onboarding process or plan
**When** the agent responds
**Then** the transcript shows a clear out-of-scope or informational response and does not show "Plan updated"

**Given** a prompt produces a valid onboarding-plan revision
**When** the revision is applied
**Then** the success response may show "Plan updated" and the revised plan is displayed

**Given** a prompt cannot be classified or the agent reports an error
**When** the response completes
**Then** the chat shows an error or clarification state, preserves the previous plan, and does not claim success

**Given** the response is classified
**When** the frontend renders the result
**Then** it uses an explicit response/result contract rather than client-side keyword guessing

### Story 3.11: Refresh People Data After Chat Plan Changes

As a manager,
I want the People/list view to reflect a chat-driven Markdown plan update,
So that the list and detail data do not remain stale after a manager revision.

**Acceptance Criteria:**

**Given** a chat request changes the stored onboarding `.md` plan
**When** the revision completes successfully
**Then** the current detail state and People/list data are refreshed from the persisted record

**Given** the revision is unrelated, rejected, or fails
**When** the response completes
**Then** no refresh is presented as a successful plan update and the prior persisted plan remains intact

**Given** the People/list data is refreshed
**When** the updated record is applied
**Then** onboarding identity, profile/project snapshot, and unrelated local UI state are preserved

**Given** the user is on another route when the change occurs
**When** the People/list view is opened later
**Then** it reads the current persisted record through the existing API

### Story 3.12: Responsive People and Onboarding Detail Layout

As a manager,
I want the People list and onboarding detail page to remain usable at narrow and wide viewport sizes,
So that the workspace does not clip, overlap, or force unexpected page-level scrolling.

**Acceptance Criteria:**

**Given** a desktop-width viewport
**When** the detail page renders
**Then** the main content and sticky chat remain in the two-pane layout represented by the reference mockup

**Given** a tablet or mobile-width viewport
**When** the detail page renders
**Then** it collapses into a single readable column, with chat in page flow and no clipped fixed-width aside

**Given** any supported viewport width
**When** header actions, status chips, tables, chat input, and send button render
**Then** they wrap or resize without horizontal page overflow; tables may scroll within their own container

**Given** the People list renders at a narrow width
**When** the manager scans or operates it
**Then** employee identity, status, and primary actions remain readable and usable

### Story 3.13: Simplify Permissions Table

As a manager,
I want the Permissions table to show only useful permission information,
So that the table is easier to scan.

**Acceptance Criteria:**

**Given** the Requested or Approved permissions table renders
**When** its columns are displayed
**Then** it shows exactly `Permission` and `System`

**Given** the simplified table renders
**When** it is inspected visually or with assistive technology
**Then** no `Included` header, checkmark, or screen-reader-only Included label remains

**Given** the permissions card renders
**When** the onboarding status changes
**Then** Requested-versus-Approved title behavior remains unchanged and table overflow remains contained within the card

### Story 3.14: Human-Readable Onboarding List Statuses

As a manager,
I want lifecycle statuses in the main People/onboarding list to use readable labels,
So that I can scan onboarding progress without interpreting storage values.

**Acceptance Criteria:**

**Given** an onboarding is shown in the main list
**When** its status is rendered
**Then** it displays `Draft`, `Pending approval`, `Ready for day 1`, `In progress`, `Blocked`, or `Completed`

**Given** a status label is displayed in the list or detail chip
**When** the UI formats it
**Then** it uses a centralized display-label helper and never exposes the raw API/storage value as user-facing copy

**Given** human-readable labels are introduced
**When** status tone, sorting, filtering, or lifecycle transitions operate
**Then** their existing behavior remains unchanged
