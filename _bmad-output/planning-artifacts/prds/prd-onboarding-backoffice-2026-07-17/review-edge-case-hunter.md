---
title: Edge Case Hunter Review — Onboarding Backoffice Lab 3 PRD
reviewed:
  - prd.md
  - addendum.md
date: 2026-07-20
method: bmad-review-edge-case-hunter (exhaustive branching-path walk; unhandled paths only)
---

# Edge Case Hunter Findings

Scope walked: the six-state lifecycle (§4.1, FR-1–FR-8), Manager Revision Chat (§4.2, FR-9–FR-13), and AgentCore Runtime integration incl. Memory/session mechanics (§4.3, FR-14–FR-16 + addendum). Only findings below are real event sequences the FRs leave unspecified, or places where two FRs' stated behaviors collide. Handled paths are omitted.

10 findings.

---

### 1. In-flight chat revision can silently overwrite an already-approved plan, bypassing FR-12's read-only guarantee

**Location:** FR-6 (approval) × FR-10 (revision write-back) × FR-12 (chat closes on approval)

**Trigger condition:** A manager sends a chat message on a `draft`/`pending_approval` onboarding (FR-9/FR-11 begin streaming a revision). Before that revision completes, the manager (or a second tab/session) finishes "Send for approval" → "Approve" using the pre-revision plan. The onboarding becomes `ready_for_day_1`/`in_progress` (approved, chat now read-only per FR-12). The earlier in-flight revision then finishes, and FR-10's consequence ("the onboarding's stored plan reflects the requested change") fires unconditionally — no FR requires checking current approval status before this write-back.

**Conflict:** FR-12 states an approved onboarding's plan/chat is frozen and read-only; FR-10 has no status guard on completion, so a message sent *before* approval can still mutate the *approved* plan *after* approval, with no Action Log signal distinguishing this from a normal pre-approval revision.

**Consequence:** An onboarding a manager believes they approved can have its stored plan change out from under them post-approval, undetected.

---

### 2. No atomic guard between FR-3's auto-revert and FR-6's approval (TOCTOU race)

**Location:** FR-3 (auto-revert on chat message) × FR-6 (approve requires `pending_approval`)

**Trigger condition:** Status is `pending_approval`. Nearly simultaneously: (a) a chat message is sent, which per FR-3 auto-reverts status to `draft`, and (b) "Approve" is submitted (client had status cached as `pending_approval`, e.g., stale UI or a second tab).

**Gap:** FR-3 says approval "is only available once an onboarding is in `pending_approval`" but never states whether the approve action re-validates status atomically at write time, what happens if the revert wins the race (reject? silently no-op? error?), or what the manager sees if their approve click is invalidated out from under them.

**Consequence:** Undefined outcome for a plausible, easy-to-trigger race — could approve a plan the manager never saw finalized, or fail silently with no explained error state.

---

### 3. Chat revision on a `blocked` onboarding: no plan to revise, and no defined exit from `blocked` on success

**Location:** FR-9 (chat open while `blocked`) × FR-10 (needs "current plan" as context) × FR-5 (blocked→draft only via explicit retry-generation)

**Trigger condition:** An onboarding lands in `blocked` via FR-2 because *initial* generation failed — meaning no plan was ever produced. FR-9 still permits opening chat in this state. The manager sends a chat message instead of using FR-5's "retry generation."

**Gap:** FR-10 requires "current plan" as context for the agent to reason about a change, but there may be none. If the agent nonetheless produces a plan via chat, no FR says what status that leaves the record in — FR-5 defines only its own distinct "retry generation" action as the sole path out of `blocked`. Two independent recovery mechanisms for the same `blocked` state (chat vs. retry-generation) have no stated precedence or unification.

**Consequence:** A onboarding could end up with a valid, chat-produced plan while still permanently flagged `blocked`, or the two recovery paths could race/conflict with no defined winner.

---

### 4. Two rapid chat messages on one onboarding: no serialization or plan-versioning rule

**Location:** FR-10 × FR-11 (streaming)

**Trigger condition:** Manager sends message A; before the agent's response to A completes and is applied, sends message B.

**Gap:** Neither FR-10 nor FR-11 states whether message B is queued behind A's completion or dispatched concurrently against the "current plan" captured at B's send time (which may already be stale if A's revision is still pending). No locking/versioning/sequencing rule is stated either way.

**Consequence:** Possible lost update — B's revision, computed against a stale plan, could overwrite A's already-applied revision with no record of the conflict (FR-10's out-of-scope note only disclaims full version *history*, not concurrent-write ordering).

---

### 5. Initial-generation AgentCore call has no session id to use before the onboarding record exists

**Location:** FR-14 (initial generation via AgentCore) × addendum "Session model" / "Proposed session/user identifiers"

**Trigger condition:** The very first AgentCore call for a brand-new onboarding — i.e., before FR-2 has determined success (`draft`) or failure (`blocked`) and before any record/id is persisted.

**Gap:** The addendum requires every `InvokeAgentRuntimeCommand` to carry a `runtimeSessionId` (33+ chars) and proposes reusing "the onboarding's own id" as that value — but FR-2's wording ("its status is `draft`... when the onboarding record is created") implies the record and its id may not exist until generation outcome is known. No text says what session id the bootstrap call uses, or how/whether a placeholder id used pre-persistence gets reconciled with the persisted record's real id (and with whatever Memory events accumulated under the placeholder).

**Consequence:** Undefined bootstrapping step in an otherwise fully-specified session model; if unresolved, the first call could use an invalid/inconsistent session id or orphan Memory events.

---

### 6. Unbounded AgentCore Memory accumulation across the blocked↔draft and pending_approval↔draft retry loops

**Location:** FR-3 (pending_approval↔draft loop) × FR-5 (blocked↔draft loop) × addendum "MemoryHook" mechanics

**Trigger condition:** An onboarding cycles repeatedly through retry-generation (FR-5) and/or chat-message-triggered auto-revert (FR-3) — both are stated as repeatable, uncapped actions.

**Gap:** Session id = the onboarding's own id, reused "for that onboarding's whole chat lifetime" (addendum), so `list_events`/`create_event` keep appending to the *same* Memory session across every cycle. No FR or addendum text defines a reset/truncation point (does "Send for approval," a successful retry-generation, or anything else ever clear prior Memory turns?).

**Consequence:** A heavily revised or repeatedly-blocked onboarding accumulates an ever-growing conversational context with no stated cap — degrading agent output quality or eventually exceeding the model's context window, with no fallback specified.

---

### 7. FR-15's "distinct userId/sessionId pairs" conflicts with the addendum's proposed fixed `userId`

**Location:** FR-15 consequence text × addendum "Proposed session/user identifiers"

**Trigger condition:** Two different onboardings' chats are both active (exactly the scenario FR-15's own consequence describes).

**Conflict:** FR-15 states: "Given two different onboardings' chats are active... they use distinct `userId`/`sessionId` pairs and do not see each other's context." The addendum's proposed technical default fixes `userId` to a single constant placeholder (`"backoffice-manager"`) for *every* onboarding and manager — only `sessionId` actually varies. FR-15's text asserts a property (distinct `userId` per pair) that the addendum's own "confirmed mechanism" reference contradicts.

**Consequence:** If architecture treats the addendum as already-ratified (as §8 suggests it should), FR-15's stated consequence is false as written — a latent spec inconsistency, not just a wording nit, since isolation guarantees are exactly what FR-15 is asserting.

---

### 8. Chat-revision failures never route to `blocked`, unlike initial-generation failures

**Location:** FR-2 (initial-generation failure → `blocked`) × FR-10 (chat-revision failure)

**Trigger condition:** Repeated chat-revision attempts on a `draft`/`pending_approval`/`blocked` onboarding each fail (AgentCore error/timeout) via FR-10.

**Gap:** FR-2 gives initial-generation failures a defined status outcome (`blocked`, logged with reason). FR-10 gives revision failures only an inline chat error with the plan left unchanged — it never states whether/when repeated revision failures should also produce a status change. Two structurally identical "agent call failed" events are handled asymmetrically with no unifying rule, and the chat-failure path can never reach `blocked` no matter how persistent the failure.

**Consequence:** An onboarding could sit in `draft` indefinitely absorbing repeated silent revision failures with no escalation path, while an equivalent initial-generation failure would have been surfaced as `blocked`.

---

### 9. Timezone reference for FR-4's "today or in the past" is unspecified

**Location:** FR-4 (read-time `start_date` comparison)

**Trigger condition:** `start_date` is set to a date that is "today" in one timezone but not another (e.g., manager's local time vs. server/UTC time), evaluated right at a day boundary.

**Gap:** FR-4's Design Notes describe the comparison as computed "at read time" but never state which timezone anchors "today" — server, UTC, or manager-local.

**Consequence:** An onboarding could flip to `in_progress` a day early or late relative to what the manager expects, purely from timezone mismatch, with no stated resolution.

---

### 10. Deleting an onboarding mid-stream (generation or chat in progress)

**Location:** FR-8 (delete is audited) × FR-16 (SSE relay for in-flight generation/chat)

**Trigger condition:** A manager deletes an onboarding (existing capability) while its initial generation (FR-14) or a chat revision (FR-10) is still streaming progress events (FR-16).

**Gap:** No FR states whether the in-flight AgentCore call is cancelled, whether the SSE stream is torn down, or what happens when a subsequent `progress`/`done` event arrives for a record that no longer exists (dropped silently? errors? recreates a ghost Action Log entry?).

**Consequence:** Possible orphaned in-flight AgentCore call, a client left waiting on a stream that never resolves, or a late event attempting to write to a deleted record.
