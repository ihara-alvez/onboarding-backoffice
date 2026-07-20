---
title: Onboarding Backoffice — Lab 3 Capability Expansion
status: final
created: 2026-07-17
updated: 2026-07-20
---

# PRD: Onboarding Backoffice — Lab 3 Capability Expansion

*Working title — confirm.*

## 0. Document Purpose

This PRD is for the project owner (Ihara) and any downstream BMad workflows (UX, Architecture, Epics/Stories) that build on it. It covers three capabilities that bring the onboarding-backoffice app from its current "Lab 2" shape (single binary approve/delete action, local Python-subprocess agent invocation) to its "Lab 3" shape: a full onboarding lifecycle, a manager-facing chat mode for revising a plan before approving it, and a real AWS AgentCore Runtime integration. A separate, smaller field-alignment change (optional `start_date`/`buddyEmail`/`seniority`/`location`/`notes` fields) was already implemented outside this PRD and is referenced only where relevant. Terms are defined once in the Glossary (§3) and used verbatim throughout; `[ASSUMPTION]` tags mark points inferred without explicit confirmation, indexed in §9.

Of the three capabilities, only §4.3 (AgentCore Runtime Integration) is `WORKSHOP_LABS.md`'s literal definition of "Lab 3." §4.1 (state machine/detail-view completeness) and §4.2 (Manager Revision Chat) are drawn from `BACKOFFICE_SPEC.md`'s target spec and bundled into this PRD because they ship together as one release, not because the workshop's own lab boundary requires it — worth knowing if this PRD is ever split for sequencing.

## 1. Vision

Onboarding-backoffice lets a manager turn a new hire's role and project into a concrete, agent-generated onboarding plan — repos to clone, permissions to expect, a day-1/week-1 checklist, first tasks — without chasing that information across Slack and Confluence. Today, once a plan is generated, the manager can only approve it as-is or throw it away and start over; there's no way to ask for a tweak, and the app doesn't track anything past "approved." This round of work closes both gaps and moves the underlying agent call onto the same production-grade AWS AgentCore Runtime the team is standing up in Lab 3 of the `dayone` workshop: a manager can now converse with the agent to refine a plan before approving it, the onboarding's real-world progress (draft → pending approval → ready for day 1 → in progress → blocked → completed) is visible and mostly self-updating, and every decision along the way is audited. Because the same AgentCore Runtime will also back a future employee-facing chat surface, this work is also the foundation the eventual frontoffice will build on.

## 2. Target User

### 2.1 Jobs To Be Done

- As the **manager/approver**, I need to generate an accurate onboarding plan and be able to correct it through conversation, not by deleting and recreating the whole record.
- As the **manager/approver**, I need to see at a glance where an onboarding actually stands (still being drafted? blocked because generation failed? the employee's first day arrived?) without manually tracking it myself.
- As the **manager/approver**, I need confidence that nothing sensitive gets granted without my explicit approval, and that every action — mine or the system's — is recorded.

### 2.2 Non-Users (v1)

The **new-hire employee** is explicitly not a user within this PRD's scope — they have no login, view, or chat surface here. `PRODUCT_SPEC.md`'s employee-facing journeys (grounded Q&A, cross-session progress tracking, access-request approval) describe a *different*, not-yet-built product surface (the future frontoffice pointed at the same AgentCore-hosted agent). This PRD's manager chat (§4.2) is a distinct, manager-only revision surface — the two should not be conflated during architecture or implementation.

### 2.3 Key User Journeys

- **UJ-1. Priya refines a plan before she'll put her name on it.**
  Priya, an engineering manager, creates an onboarding for a new backend hire and watches the agent stream its plan live, same as today. Reading it, she notices the plan recommends a repo the new hire won't actually need for their first project slice. Instead of deleting the onboarding and starting over, she opens the chat panel on the (still-`draft`) onboarding and types "drop the `internal-tools` repo, they won't touch it in month one." The same agent that generated the plan responds conversationally, re-runs its tools, and produces a revised plan reflecting the change. Priya reviews the update, is satisfied, and clicks Approve. The chat closes to read-only, and the onboarding moves to `pending_approval` and then automatically to `ready_for_day_1` (the start date is next week). **Edge case:** if the agent's revision fails (AgentCore error), the chat surfaces the error inline and the plan is left unchanged — no partial/corrupted revision is ever shown as final.

- **UJ-2. Priya checks why an onboarding is stuck.**
  A week later, Priya opens the onboarding list and sees one record tagged `blocked` — a Bedrock timeout during initial generation left it without a narrative. She opens the detail view, sees the Action Log entry explaining exactly when and why it landed in `blocked`, and re-triggers generation. Once it succeeds, the record automatically moves back into the normal flow (`draft`, pending her review). For a different, already-`in_progress` onboarding, she opens the detail view to answer a Slack question from People/IT ("did we already approve prod DB access for this hire?") — the Approved Permissions section and Action Log give her the answer without asking anyone.

## 3. Glossary

- **Onboarding** — a single record tracking one employee's onboarding for one project (see Non-Goals §5 — multi-project stays out of scope). Carries a `profile`, a `project`, a generated `plan`, and a lifecycle `status`.
- **Onboarding Status** — one of six states: `draft`, `pending_approval`, `ready_for_day_1`, `in_progress`, `blocked`, `completed` (per `BACKOFFICE_SPEC.md`). Replaces today's binary `created`/`approved`. See FR-1–FR-5 for transition rules.
- **Requested Permissions** — the permission set from the employee's `Profile` as captured at plan-generation (or latest revision) time, shown before approval.
- **Approved Permissions** — the same permission set, relabeled once the manager approves the onboarding as a whole (this PRD keeps whole-onboarding approval, not per-permission approval — see FR-6).
- **Action Log** (a.k.a. audit log) — an append-only, timestamped record of every status transition and every manager action (approve, delete, chat message/revision) on an onboarding.
- **Manager Revision Chat** — the conversational interface (§4.2) letting a manager ask the agent to change a generated plan before approving. Open only while the onboarding is not yet approved; read-only afterward.
- **AgentCore Runtime** — the AWS Bedrock AgentCore–hosted deployment of the Strands agent (`dayone/agent/strands_agent.py`) this app calls for both plan generation and Manager Revision Chat, replacing the current local Python-subprocess invocation (`pythonBridge.ts` + `run_narrative.py`). Connection details in `addendum.md`.
- **Strands Agent** — the underlying agent (defined in the sibling `dayone` repo, unmodified) that reasons over `load_profile`, `load_project`, and `generate_onboarding_plan` tools to produce the plan and its revisions.
- **`dayone`** — the sibling workshop repo that is this app's read-only source of truth for `profiles/*.yaml` and `projects/*.yaml`, and the owner of the agent code this app invokes.

## 4. Features

### 4.1 Full Onboarding State Machine & Detail-View Completeness

**Description:** Replaces the current binary `created`/`approved` status with the six-state lifecycle from `BACKOFFICE_SPEC.md`, with the "obvious" transitions happening automatically and the rest left to explicit manager action. Also fills in the detail-view sections `BACKOFFICE_SPEC.md` calls for that don't exist today: Approved Permissions (distinct from Requested), Progress, and Action Log. Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-1: Six-state onboarding lifecycle

The system tracks each onboarding's status as one of `draft`, `pending_approval`, `ready_for_day_1`, `in_progress`, `blocked`, or `completed`, replacing today's `created`/`approved` pair.

**Consequences (testable):**

- Every existing onboarding record (previously `created` or `approved`) is migrated to an equivalent new status without data loss. `[ASSUMPTION: "created" maps to "draft" and "approved" maps to "ready_for_day_1" or "in_progress" depending on stored start_date, per FR-4's rule.]`
- The list and detail views display the current status using the new six-value set.

#### FR-2: Automatic status transitions on generation outcome

A newly created onboarding lands in `draft` when plan generation succeeds, or `blocked` when it fails (AgentCore error, timeout), without any manager action.

**Consequences (testable):**

- Given a successful plan generation, when the onboarding record is created, then its status is `draft`.
- Given a failed plan generation (AgentCore error/timeout), when the onboarding record is created, then its status is `blocked` and the Action Log records the failure reason.

#### FR-3: Manual submission for approval

A manager explicitly moves a `draft` onboarding into `pending_approval` via a "Send for approval" action, signaling the plan is final and ready for an approve/reject decision. Approval (FR-6) is only available once an onboarding is in `pending_approval` — a manager cannot approve directly from `draft`. Sending another revision-chat message (FR-10) on a `pending_approval` onboarding automatically reverts it to `draft`, since the plan under decision no longer matches what was actually sent for approval.

**Consequences (testable):**

- Given a `draft` onboarding, when the manager clicks "Send for approval," then status becomes `pending_approval` and the Action Log records it.
- Given a `pending_approval` onboarding, when the manager sends another chat message instead of approving, then status automatically reverts to `draft` and the Action Log records the reversion.
- Given a chat-triggered revert and an Approve click happen at nearly the same moment, when the status change is written, then whichever completes first wins atomically (status is re-checked at write time, not cached from an earlier read) — if the revert wins, the Approve attempt fails with an explicit "plan changed, please review again" error rather than silently applying or no-oping.

#### FR-4: Automatic status transitions after approval

Once a manager approves a `pending_approval` onboarding (FR-6), its status automatically becomes `ready_for_day_1` if `start_date` is absent or in the future, or `in_progress` if `start_date` is today or in the past — and automatically flips from `ready_for_day_1` to `in_progress` once `start_date` arrives.

**Consequences (testable):**

- Given an approved onboarding with a future `start_date`, when the record is viewed, then status shows `ready_for_day_1`.
- Given an approved onboarding whose `start_date` has arrived, when the record is viewed, then status shows `in_progress` (computed at read time — see Design Notes below).

**Design Notes:** The `ready_for_day_1` → `in_progress` flip has no discrete server-side occurrence to timestamp — it's computed at read time by comparing the stored `start_date` to the current date (server/UTC time, not the viewing manager's local timezone) on every fetch, not written by a background job or scheduled transition. Progress (FR-7) and the Action Log (FR-8) reflect it as of the `start_date` itself rather than an observed event time; see FR-8's exception note.

**Out of Scope:** what specifically drives the transition into `completed` is not defined by this FR — see FR-5.

#### FR-5: Manual status actions

A manager can explicitly mark a `blocked` onboarding back into `draft` (e.g. after fixing whatever caused the failure and re-triggering generation) and can explicitly mark an `in_progress` onboarding as `completed`.

**Consequences (testable):**

- Given a `blocked` onboarding, when the manager retries generation, then status returns to `draft` (or `blocked` again on repeat failure) and the Action Log records the retry.
- Given an `in_progress` onboarding, when the manager marks it complete, then status becomes `completed` and the Action Log records who/when.

**Notes:** Confirmed: marking `completed` is manual-only for this MVP — no automatic completion signal is planned (checklist step-tracking / `mark_step_done` stays out of scope, per the current README's known limitations).

#### FR-6: Whole-onboarding approval with Requested vs. Approved permissions

A manager approves a `pending_approval` onboarding as a single action (unchanged from today — no per-permission approval; see FR-3 for how an onboarding reaches `pending_approval`). Before approval, the detail view labels the profile's permission set "Requested Permissions"; after approval, the same set is relabeled "Approved Permissions."

**Consequences (testable):**

- Given a `draft` or `pending_approval` onboarding, when viewed, then permissions are labeled "Requested."
- Given an approved onboarding, when viewed, then the same permissions are labeled "Approved," unchanged in content.

#### FR-7: Progress display

The detail view shows the onboarding's current status and the timestamp of each status change it has gone through.

**Consequences (testable):**

- Given any onboarding, when its detail view is opened, then a Progress section lists each transition (status, timestamp) in order.

#### FR-8: Action Log (audit trail)

The detail view shows an append-only Action Log recording every status transition, every approve/delete action, and every Manager Revision Chat message or plan revision (§4.2), each with a timestamp and actor.

**Consequences (testable):**

- Given any action listed above occurs, when it completes, then exactly one new Action Log entry is appended (never edited or removed).
- Given the detail view is opened, when the Action Log section renders, then entries appear in chronological order.

**Exception:** the read-time-computed `ready_for_day_1` → `in_progress` flip (FR-4's Design Notes) has no discrete occurrence to log and does not get its own Action Log entry.

**Feature-specific NFRs:**

- Audit entries must never be editable or deletable through any app-exposed action, satisfying `BACKOFFICE_SPEC.md`'s "every action must be audited" security rule.

### 4.2 Manager Interactive Chat / Plan Revision

**Description:** Lets a manager converse with the same agent that generated a plan to request changes, before deciding whether to approve. Replaces "delete and recreate from scratch" as the only way to fix an inaccurate plan. Realizes UJ-1.

**Functional Requirements:**

#### FR-9: Open a revision chat on a not-yet-approved onboarding with a plan to revise

A manager can open a chat interface scoped to one onboarding whenever its status is `draft` or `pending_approval` — i.e., a plan exists and hasn't been approved yet. A `blocked` onboarding (failed initial generation, no plan yet) has no chat entry point; its sole recovery path is FR-5's retry-generation, avoiding two competing ways out of `blocked`.

**Consequences (testable):**

- Given an onboarding in `draft`/`pending_approval`, when the manager opens its detail view, then a chat entry point is visible and enabled.
- Given an onboarding in `blocked`, `ready_for_day_1`, `in_progress`, or `completed`, when the manager opens its detail view, then no chat entry point is offered for new messages (see FR-5 for `blocked`'s recovery path, FR-12 for the approved case).

#### FR-10: Conversational plan revision

Each chat message is sent to the same agent (via AgentCore Runtime, §4.3) that generated the original plan, with enough context (employee, profile, project, current plan) for it to reason about the requested change and re-invoke its existing tools (`load_profile`, `load_project`, `generate_onboarding_plan`) to produce a revised plan.

**Consequences (testable):**

- Given a chat message requesting a specific change, when the agent responds, then the onboarding's stored plan reflects the requested change — *unless* the onboarding was approved while the response was in flight, in which case the revision is discarded (the approved plan is never overwritten) and the Action Log records a rejected late revision instead.
- Given the agent's revision attempt fails, when the failure occurs, then the previous plan remains displayed unchanged and the chat surfaces the error.
- Given a chat message is sent while a previous message on the same onboarding is still being answered, when the new message arrives, then it is queued and processed only after the prior response completes and is applied — messages are never dispatched concurrently against a plan that may already be stale.

**Out of Scope:** retaining a full version history of every past plan revision — only the latest plan is guaranteed to be shown; the Action Log (FR-8) records *that* a revision happened, not a diff. `[ASSUMPTION: latest-plan-only, not full version history — confirm this is acceptable.]`

#### FR-11: Live streaming in chat

Chat responses stream live to the manager, reusing the same progress-log presentation already used for initial plan generation (tool-call/reasoning/text events), rather than a blind wait. The message input stays disabled while a response is streaming (see FR-10's queuing rule).

**Consequences (testable):**

- Given a chat message is sent, when the agent begins responding, then partial output appears incrementally rather than only upon full completion, and the input is disabled until the response completes.

#### FR-12: Chat closes on approval

Once a manager approves an onboarding, its Manager Revision Chat becomes read-only — no further messages can be sent.

**Consequences (testable):**

- Given an approved onboarding, when the manager opens its detail view, then the chat transcript is visible but the message input is disabled.

#### FR-13: Chat is part of the audit trail

Every chat message (manager's request and the agent's resulting narrative/revision) is recorded in the Action Log (FR-8).

**Consequences (testable):**

- Given a chat exchange occurs, when the Action Log is viewed, then an entry exists identifying it as a revision request/response with a timestamp.

### 4.3 AgentCore Runtime Integration

**Description:** Replaces the current local Python-subprocess invocation of the `dayone` Strands agent with calls to the already-deployed AWS AgentCore Runtime, for both initial plan generation (existing capability, new transport) and Manager Revision Chat (§4.2, new capability). This is also the foundation the future employee-facing frontoffice will build on, since it targets the same deployed runtime. Realizes UJ-1 (both its generation and revision halves).

**Functional Requirements:**

#### FR-14: Replace subprocess invocation with AgentCore Runtime calls

Initial plan generation is invoked against the deployed AgentCore Runtime instead of spawning `dayone`'s local Python environment as a subprocess.

**Consequences (testable):**

- Given a manager creates an onboarding, when plan generation runs, then the request is sent via the AgentCore Runtime SDK, not via `child_process.spawn` into a Python interpreter.
- Given the AgentCore call succeeds, when the response is received, then the resulting plan/narrative is stored exactly as today's subprocess-based flow would have stored it (no change to the `OnboardingRecord` shape from this FR alone).

**Out of Scope:** the local Python-subprocess path (`pythonBridge.ts` + `run_narrative.py`) is removed entirely as part of this feature, not kept as a fallback — confirmed.

#### FR-15: AgentCore Runtime backs Manager Revision Chat

Manager Revision Chat (FR-10) is served by the same AgentCore Runtime connection as initial generation. Conversational context across a chat's turns is carried by AgentCore Memory, keyed by a stable `userId`/`sessionId` pair this app mints per onboarding chat (confirmed mechanism — see `addendum.md`; the runtime does not carry context automatically just from reusing a `sessionId`).

**Consequences (testable):**

- Given a chat session on one onboarding, when multiple messages are sent, then they share one stable `userId`/`sessionId` pair for that onboarding's chat lifetime.
- Given two different onboardings' chats are active, when either sends a message, then they use distinct `sessionId`s and do not see each other's context — isolation is per-onboarding via `sessionId`, not per-manager via `userId`, since this app has no manager authentication (`userId` is a single shared placeholder; see addendum.md).
- Given the deployment's AgentCore Memory resource (`MEMORY_ID`) is not configured, when a chat is used, then the agent runs without history (each message is treated as if it were the first) — this is a deployment-configuration risk to verify in architecture, not a behavior this app can compensate for at the API level.

#### FR-16: Streaming relay preserved

The existing Server-Sent-Events relay (`event: progress` / `event: done`) that gives today's live plan-generation UI continues to work against the new AgentCore-backed transport, for both generation and chat.

**Consequences (testable):**

- Given plan generation or a chat message in progress, when the agent streams output, then the frontend receives incremental `progress` events exactly as it does today, terminating in one `done` event.

**Feature-specific NFRs:**

- No regression in end-to-end latency or success rate versus the current subprocess-based approach (see SM-3).

## 5. Non-Goals (Explicit)

- **Multi-project onboardings** (`project_ids` plural per `BACKOFFICE_SPEC.md`) — explicitly confirmed to stay single-project; an employee on multiple projects gets separate onboarding records, one per project.
- **The employee-facing frontoffice** — noted (§1, §4.3) as sharing the same AgentCore Runtime dependency this PRD stands up, but its scope (UI, employee auth, the chat experience itself) is not defined here.
- **Per-permission-item approval** — approval stays a single whole-onboarding action (FR-6); no line-item approve/deny workflow.
- **Real notification delivery** (email/Slack) for approvals — stays simulated, unchanged from today.
- **Real IAM Identity Center / permission provisioning** — permissions remain simulated text/data, not live grants, per `ARCHITECTURE.md`'s stated MVP decision.
- **Employee-facing RAG Q&A, cross-session memory, or access-request approval workflows** (`PRODUCT_SPEC.md` journeys J2–J4) — those describe the *employee's* future assistant experience, a different product surface than this PRD's manager-only chat (see §2.2). J4's approval-review half is *not* the same thing as FR-6's whole-onboarding approval: it's a distinct, ad-hoc "approve this one access request raised mid-onboarding" capability whose own approval-state tool `PRODUCT_SPEC.md` states isn't built yet anywhere, including in the source `dayone` repo ("today this is a static Markdown list, not a stateful action"). Confirmed: FR-6 does not need to generalize to cover it — there's nothing upstream for this PRD to accommodate yet.
- **Checklist step-completion tracking** (`mark_step_done`) — remains out of scope; flagged in FR-5's notes as a possible gap for the `completed` transition. Confirmed via `dayone/agentcore/agent/my_agent.py`: this tool *is* registered in the deployed agent's tool list (alongside `load_profile`/`load_project`/`generate_onboarding_plan`), so the agent could invoke it during a Manager Revision Chat exchange — but its implementation (`tools/track_progress.py`) writes to `/tmp` on the AgentCore Runtime container, "intentionally file-based for the workshop... in production, replace with DynamoDB writes." That storage is ephemeral, per-MicroVM, and unreachable by this app — so an agent-initiated call is a harmless no-op from this app's perspective, not a data-integrity risk, and FR-10's tool list (§4.2) is otherwise accurate as the three tools this app's own workflow actually relies on.
- **Permission-template versioning/security review workflow** — `BACKOFFICE_SPEC.md`'s governance rule for permission templates is a `profiles/`/`projects/` YAML-authoring concern in the sibling `dayone` repo, not something this app enforces.
- **Manager authentication/login** — this app has none today (single-user-demo shaped, per the existing README). `[NOTE FOR PM]` This means the Action Log (FR-8) can attribute an action to "a manager" and a timestamp, but not to a specific named person, and AgentCore's `userId` (FR-15) is necessarily a fixed placeholder rather than a real identity. `BACKOFFICE_SPEC.md`'s "every action must be audited" rule is only partially satisfiable until manager auth is built — revisit if/when this becomes a multi-manager tool.

## 6. MVP Scope

### 6.1 In Scope

- Six-state onboarding lifecycle with automatic transitions on generation outcome and approval/date, plus manual submission into `pending_approval` (FR-1–FR-5).
- Requested vs. Approved permission labeling, Progress display, and Action Log (FR-6–FR-8).
- Manager Revision Chat: open pre-approval, conversational, streamed, closes on approval, logged (FR-9–FR-13).
- AgentCore Runtime as the transport for both generation and chat (FR-14–FR-16).

### 6.2 Out of Scope for MVP

- Everything listed in §5.
- Full version history of plan revisions (only latest is guaranteed — FR-10's Out of Scope note).
- Automatic `completed` transition (manual only for now — FR-5).

## 7. Success Metrics

### Primary

- **SM-1:** % of approved onboardings that reach `ready_for_day_1`/`in_progress` without any manual status edit — target 100% (validates FR-1, FR-2, FR-4; a miss means the automatic-transition logic has a gap).
- **SM-2:** Reduction in "delete and recreate" onboarding churn (onboardings deleted within, say, 10 minutes of creation, a proxy for "the plan was wrong and there was no other fix") after Manager Revision Chat ships, vs. before — target: meaningful decrease (validates FR-9–FR-10).

### Secondary

- **SM-3:** AgentCore Runtime-based generation/chat latency and success rate at parity with (not worse than) today's subprocess-based approach. `ARCHITECTURE.md` names CloudWatch/X-Ray as the deployment's observability stack — the exact dashboards/alarms this metric reads from are TBD in the architecture phase, not decided here.

### Counter-metrics (do not optimize)

- **SM-C1:** Do not optimize automatic-transition coverage (SM-1) by silently hiding `blocked` states or auto-recovering without an Action Log entry — every automatic transition must remain individually auditable (FR-8). Counterbalances SM-1.

## 8. Open Questions

Questions from the initial draft were resolved during this PRD's drafting by inspecting the deployed agent's actual source (`dayone/agentcore/`) rather than guessing:

- `completed` transitions are manual-only (FR-5).
- The local Python-subprocess path is removed entirely, not kept as a fallback (FR-14).
- AgentCore streaming is confirmed token-level (FR-16).
- AgentCore Memory (`MEMORY_ID`) is confirmed configured for the deployed runtime — chat continuity (FR-15) is achievable as designed, no deployment gap.
- The request/response payload contract and the NDJSON→`ProgressEvent` mapping are proposed in `addendum.md` as technical defaults for architecture to ratify.
- `ARCHITECTURE.md`'s own open question ("which actions require approval — manager, tech lead, or security?") is resolved by this PRD: approval stays manager-only for this MVP (FR-6), gated by the explicit "Send for approval" step (FR-3).

Two items surfaced during reference-doc reconciliation (Finalize pass, 2026-07-20) and were resolved by checking the deployed agent's actual source and `PRODUCT_SPEC.md` directly, rather than left open:

- **`track_progress` tool status — resolved.** It's registered in the deployed agent (confirmed in `dayone/agentcore/agent/my_agent.py`) but writes to ephemeral, per-MicroVM local disk unreachable by this app (see §5's Non-Goals note) — no impact on FR-7/FR-8.
- **J4 approval-queue overlap — resolved.** Distinct from FR-6; its own approval-state tool isn't built anywhere yet per `PRODUCT_SPEC.md` itself. FR-6 does not need to generalize (see §5).

No open questions remain at this time.

## 9. Assumptions Index

- §4.1 FR-1 — existing `created`/`approved` records map to `draft`/(`ready_for_day_1` or `in_progress`) during migration; exact mapping rule per FR-4.
- §4.2 FR-10 — plan revisions replace the latest plan only; no full version history is retained.
