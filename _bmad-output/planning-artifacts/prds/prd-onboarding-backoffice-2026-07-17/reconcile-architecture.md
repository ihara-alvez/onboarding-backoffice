---
title: Reconciliation — PRD + Addendum vs. ARCHITECTURE.md
purpose: Input reconciliation for the PRD finalize pass (BMad PRD workflow)
inputs:
  - /home/ialvez/workspace/dayone/docs/ARCHITECTURE.md
  - /home/ialvez/workspace/onboarding-backoffice/_bmad-output/planning-artifacts/prds/prd-onboarding-backoffice-2026-07-17/prd.md
  - /home/ialvez/workspace/onboarding-backoffice/_bmad-output/planning-artifacts/prds/prd-onboarding-backoffice-2026-07-17/addendum.md
date: 2026-07-20
---

# Reconciliation: PRD + Addendum vs. ARCHITECTURE.md

## Method

Read all three documents in full. Walked ARCHITECTURE.md section by section (Local MVP flow, Target AWS architecture, each Component, MVP decisions, Open questions) and checked each claim/decision against the PRD's FRs/Non-Goals and the addendum's technical detail. Findings are ordered most-important first.

---

## Gap 1 (High): DynamoDB as the target persistence layer is never addressed

**ARCHITECTURE.md** (lines 54–61), under "Components > DynamoDB":

> State persistence:
> - Onboarding created.
> - Completed steps.
> - Errors.
> - Pending approvals.

This is listed as a first-class component of the target AWS architecture (line 20–30: `Web backoffice -> API backend -> AgentCore Runtime ... -> AWS tools -> ... DynamoDB ...`). Its four bullet categories map almost one-to-one onto the PRD's own domain model:
- "Onboarding created" / "Completed steps" → FR-1 (six-state lifecycle), FR-6 (Progress)
- "Errors" → FR-2's `blocked` transition, FR-7 (Action Log failure entries)
- "Pending approvals" → FR-5, `pending_approval` state

**PRD/addendum:** Neither document mentions DynamoDB anywhere. FR-1–FR-7 describe the six-state lifecycle, Progress, and Action Log purely in behavioral terms (what the UI shows, what triggers a transition) without saying whether the underlying `OnboardingRecord`/Action Log storage moves from its current (implied local/file-based, per the Lab 2 shape referenced in §0) mechanism to DynamoDB, which ARCHITECTURE.md treats as the target-state persistence tool. FR-3's own text even flags status as possibly **computed, not stored** — "status shows `in_progress` (computed at read time — see Design Notes)" — but no "Design Notes" section exists anywhere in the PRD as read; this is a dangling reference. Whether status/Progress/Action Log entries are persisted rows (DynamoDB items, per ARCHITECTURE.md) or derived at read time is exactly the kind of storage-model decision ARCHITECTURE.md stakes out and the PRD leaves entirely open, with no explicit flag that it's deferring to architecture.

**Why it matters:** this is a foundational storage decision ARCHITECTURE.md treats as settled/target-state, and the PRD is silent on it rather than explicitly punting it to the architecture phase (contrast with how it explicitly punts the AgentCore payload contract to `addendum.md`).

---

## Gap 2 (High): `track_progress` tool dropped from FR-9's tool list, and Progress/Action Log's relationship to it is undefined

**ARCHITECTURE.md** (lines 7–14), Local MVP flow:

```text
CLI / future backoffice
  -> agent.app
  -> load_profile
  -> load_project
  -> generate_onboarding_plan
  -> track_progress
```

`track_progress` is named as the fourth tool in the agent's own chain — implying progress-tracking is (at least in the local MVP) an **agent-side** capability, not purely a backoffice-app concern.

**PRD:** FR-9 (§4.2) lists only three tools the agent re-invokes during a chat revision: "`load_profile`, `load_project`, `generate_onboarding_plan`" — `track_progress` is absent, with no note explaining the omission. Meanwhile FR-6 (Progress) and FR-7 (Action Log) are specified as purely app-side features (the backoffice backend/frontend tracking transitions and audit entries), with no FR clarifying whether they are fed by the agent's own `track_progress` tool call or are entirely independent of it.

**Addendum:** The "Confirmed against the deployed agent's actual source" section (lines 27–34, 48) enumerates the tools/events actually registered in `my_agent.py` and observed in the NDJSON stream (`load_profile`/`load_project`/`generate_onboarding_plan` via `tool_use`/`tool_result` events) — `track_progress` is not mentioned as present in the deployed AgentCore agent either.

**Why it matters:** either `track_progress` was deliberately dropped between the local MVP and the AWS deployment (worth confirming explicitly, since ARCHITECTURE.md still documents it as part of the canonical tool chain), or it exists but the PRD/addendum simply never reconciled the app's Progress/Action Log feature against it — leaving the architecture phase to guess whether "Progress" (FR-6) is an app-level derived view or should be sourced from an agent tool.

---

## Gap 3 (Medium): Multi-project cut contradicts ARCHITECTURE.md's own component spec, not just `BACKOFFICE_SPEC.md`

**ARCHITECTURE.md** (lines 37–44), Backoffice component, minimum fields:

> - Employee name.
> - Email.
> - Profile.
> - **Project or set of projects.**
> - Start date.
> - Optional buddy.

ARCHITECTURE.md's own component spec explicitly anticipates an employee being tied to "a set of projects" — i.e., multi-project support is baked into the target architecture's minimum backoffice fields, independent of anything in `BACKOFFICE_SPEC.md`.

**PRD Non-Goals (§5):**

> **Multi-project onboardings** (`project_ids` plural per `BACKOFFICE_SPEC.md`) — explicitly confirmed to stay single-project; an employee on multiple projects gets separate onboarding records, one per project.

The PRD justifies cutting multi-project support by citing `BACKOFFICE_SPEC.md`'s plural-field naming, but never cross-references that ARCHITECTURE.md — one of the PRD's own stated grounding sources — independently bakes "set of projects" into its component spec. This isn't necessarily wrong (one-onboarding-record-per-project is a reasonable data-modeling choice that can still satisfy "a set of projects" at the UI/employee level), but the PRD doesn't surface the tension or explain why ARCHITECTURE.md's phrasing doesn't apply, which is exactly the kind of thing ARCHITECTURE.md's own "Open questions" flags as unresolved (line 87: "Will projects be one-to-one, or can an employee join multiple projects?"). The PRD effectively answers that open question but attributes the answer to a different document and doesn't say so explicitly.

---

## Gap 4 (Medium): ARCHITECTURE.md's open question on approval roles (manager/tech lead/security) is narrowed without being flagged as such

**ARCHITECTURE.md** (line 89), Open questions:

> Which actions require approval from the manager, tech lead or security?

This is listed as unresolved — implying the target architecture anticipates approval may need to route through more than one role.

**PRD FR-5** answers this implicitly and permanently for this MVP: "A manager approves an onboarding as a single action ... no per-permission approval." Non-Goals (§5) confirms: "Per-permission-item approval — approval stays a single whole-onboarding action (FR-5); no line-item approve/deny workflow." Combined with the last Non-Goals bullet (no manager authentication exists at all — "the Action Log ... can attribute an action to 'a manager' ... but not to a specific named person"), the PRD forecloses any tech-lead/security-approval branch ARCHITECTURE.md's open question was holding space for, without stating that this is a resolution of that specific open question rather than an orthogonal MVP simplification. §8 of the PRD claims "No open questions remain at this time" — but this is only true from the PRD's own frame; ARCHITECTURE.md's line 89 question is still open relative to the sibling repo's architecture doc, and a downstream architect reading only the PRD would not know this tension exists.

---

## Gap 5 (Medium): Guardrails, EventBridge, and CloudWatch/X-Ray — the two documents talk past each other on security/observability tooling

**ARCHITECTURE.md** (lines 20–30) lists the target AWS tool surface as: IAM Identity Center, CodeCommit/Git provider, DynamoDB, S3 docs, **EventBridge**, **CloudWatch / X-Ray**. It never mentions guardrails anywhere.

**Addendum** (line 44), in the "Exact request payload" confirmed against the deployed agent's actual source:

```json
{ ..., "guardrailId": "...", "guardrailVersion": "...", "guardrailEnabled": true }
```

Guardrails are a real, already-wired security control in the deployed runtime that ARCHITECTURE.md's document never anticipates or discusses — worth flagging to the architecture phase as a security-posture element that needs to be folded into the target architecture narrative, not just carried as an implementation detail in an addendum.

Conversely, ARCHITECTURE.md's EventBridge and CloudWatch/X-Ray are never mentioned in the addendum's "confirmed against deployed source" sections, nor in the PRD's FR-15 (streaming relay) or SM-3 (latency/success-rate parity metric). SM-3 in particular ("AgentCore Runtime-based generation/chat latency and success rate at parity with ... today's subprocess-based approach") implies some form of measurement/instrumentation, but neither document says whether that measurement will come from CloudWatch/X-Ray (as ARCHITECTURE.md's target stack would suggest) or from some other means. This leaves SM-3 without a stated measurement mechanism that a downstream architect can act on.

---

## Checked and found consistent (no gap)

To avoid over-flagging, the following were checked carefully and found to reconcile cleanly:

- **Simulated permissions / IAM Identity Center:** ARCHITECTURE.md's MVP decision #2 ("Keep permissions simulated until the flow is validated") and Component note ("Real assignment of groups and permission sets in later phases") are explicitly and correctly cited by the PRD's Non-Goals (§5): "Real IAM Identity Center / permission provisioning ... stays simulated ... per `ARCHITECTURE.md`'s stated MVP decision." This is the one place the PRD directly names ARCHITECTURE.md as its source — good practice, and no contradiction found.
- **S3 / employee-facing RAG indexing:** ARCHITECTURE.md's S3 component (versioned docs "ready for indexing") is correctly recognized by the PRD as belonging to the future employee-facing frontoffice, not this PRD's manager-only scope (§2.2, §5).
- **AgentCore session management framing:** ARCHITECTURE.md's high-level claim that "AgentCore Runtime handles ... session management ... letting the team focus on the agent experience" (line 48) could read as implying conversational continuity is automatic. The addendum correctly complicates this (session isolation via MicroVM ≠ conversational memory; continuity requires an explicit `MemoryHook` with `list_events`/`create_event` calls against a separate AgentCore Memory resource), and PRD FR-14 explicitly states this nuance ("the runtime does not carry context automatically just from reusing a session id"). This is a case where the PRD/addendum correctly caught and corrected a potential oversimplification in ARCHITECTURE.md rather than silently inheriting it — flagged here only as a positive confirmation, not a gap.
- **Backend topology:** ARCHITECTURE.md's target flow (`Web backoffice -> API backend -> AgentCore Runtime`) matches FR-13's description of the Express backend calling AgentCore via `@aws-sdk/client-bedrock-agentcore` directly (no subprocess bridge) — consistent.
- **"Require human approval for sensitive access" (MVP decision #5):** satisfied today by FR-5's whole-onboarding approval gate, since permissions are simulated and there's no live-grant sensitivity gradient yet to require finer-grained approval. Flagged only as a **future** tension (see Gap 4) once real IAM provisioning arrives in "later phases," not a present contradiction.

## Minor notes (not elevated to top gaps)

- ARCHITECTURE.md's MVP decision #4 ("Let the agent explain what it would do before doing it") is a dry-run/explain design principle with no explicit counterpart FR in the PRD. Low material impact today since no real actions are taken (permissions simulated), but worth a one-line acknowledgment if this principle is meant to persist into later phases when real actions exist.
- ARCHITECTURE.md's open question "How will day-1 productivity be measured?" (line 90) is not addressed by the PRD's Success Metrics (§7), which measure process health (auto-transition coverage, churn, latency parity) rather than productivity outcomes. Likely intentional scope narrowing, but the PRD doesn't say so.

---

## Summary

Five reconciliation gaps found, two high-severity (storage-layer target state and the `track_progress` tool's fate are both left for the architecture phase to discover cold rather than being explicitly punted, the way the AgentCore payload contract was). The rest are medium and mostly take the form of the PRD resolving an ARCHITECTURE.md open question or component spec without saying so, rather than an outright contradiction.
