# Reconciliation: PRD (Lab 3 Capability Expansion) vs. `dayone/docs/PRODUCT_SPEC.md`

Date: 2026-07-20
Scope: input-reconciliation pass for PRD finalize. No code changed. Files compared:
- Reference: `/home/ialvez/workspace/dayone/docs/PRODUCT_SPEC.md`
- PRD: `/home/ialvez/workspace/onboarding-backoffice/_bmad-output/planning-artifacts/prds/prd-onboarding-backoffice-2026-07-17/prd.md`
- Addendum: `/home/ialvez/workspace/onboarding-backoffice/_bmad-output/planning-artifacts/prds/prd-onboarding-backoffice-2026-07-17/addendum.md`

## 0. Bottom line

No hard contradictions found between the PRD and PRODUCT_SPEC.md — the two documents describe genuinely
different (but AgentCore-runtime-sharing) product surfaces, and the PRD is explicit and correct about that
split in §2.2 and §5. However, PRODUCT_SPEC.md *does* describe the manager/backoffice side in more places
than the PRD's Non-Goals section accounts for, and one of those (J4's approver half) sits closer to
"manager-facing" than the PRD's blanket "employee-facing, therefore out of scope" framing allows. There is
also a load-bearing *qualitative* theme in PRODUCT_SPEC.md — its anti-hallucination / grounding discipline,
enforced per-journey — that the PRD's FR-9 (chat-driven plan revision) does not explicitly re-assert for the
new "revise via conversation" path, even though the underlying generation tools are unchanged.

## 1. Does PRODUCT_SPEC.md describe the manager/backoffice side, and does the PRD match it?

Yes, in three places, none of which the PRD's §4 features contradict — but the PRD does not fully account
for all three when drawing its scope boundary.

**a) The Approver persona (PRODUCT_SPEC.md lines 30–32):**
> "Secondary — Approver (manager / onboarding buddy). Needs: visibility into what was requested or granted,
> a low-friction way to approve or deny sensitive actions, and confidence the agent will never silently
> grant access it isn't authorized to grant."

The PRD's FR-5 (Requested vs. Approved Permissions), FR-6 (Progress), FR-7 (Action Log) map cleanly onto
"visibility into what was requested or granted" and "confidence... never silently grant access." No
contradiction. But "a low-friction way to approve or deny sensitive actions" is only partially covered: the
PRD is explicit (§5, §6.2) that approval stays whole-onboarding, no per-permission/line-item approve/deny.
That's a deliberate, disclosed trade-off in the PRD, not a hidden gap — but it means the Approver persona's
need, as PRODUCT_SPEC.md states it, is satisfied only at coarse (whole-record) granularity, never at the
per-action granularity PRODUCT_SPEC.md's own J4 describes (see §2 below).

**b) J1's plan output includes a "risks/approvals" field (PRODUCT_SPEC.md line 42):**
> "Output: Markdown plan — repos, permissions, Day 1 checklist, architecture summary, first tasks,
> risks/approvals."

The PRD's detail-view completeness work (§4.1) explicitly names three sections to fill in — Approved
Permissions, Progress, Action Log (PRD lines 44, 57) — but never mentions a "Risks" section. It's plausible
this is simply rendered inline as part of the plan Markdown rather than as a structured section (in which
case there's nothing to fix), but the PRD doesn't say so one way or the other, and doesn't cite
`BACKOFFICE_SPEC.md` as having settled it either way. This is a minor, low-confidence gap — worth a
one-line confirmation in the PRD (or a note that BACKOFFICE_SPEC.md doesn't call for a separate Risks
section) rather than leaving it silently absent.

**c) "Multi-tenant / multi-cohort backoffice" as an explicitly out-of-scope / future item
(PRODUCT_SPEC.md lines 64–71 and 128–132):**
> Out-of-scope boundary: "...Multi-tenant / multi-cohort backoffice."
> Future (post-workshop roadmap): "...Multi-employee/cohort backoffice."

PRODUCT_SPEC.md uses the word "backoffice" generically for exactly the kind of manager-admin surface this
PRD's app already is (it's literally named `onboarding-backoffice`), and flags a *multi*-tenant/cohort
version of it as deferred/future work on both sides of that document. The PRD's own Non-Goals (§5) lists
"Multi-project onboardings" as out of scope, which is a related but distinct axis (one employee, multiple
projects) — it never cross-references PRODUCT_SPEC.md's "multi-cohort backoffice" deferral, even though the
overlap in naming and intent is obvious. This isn't a contradiction (both documents agree it's out of
scope), just a missed cross-reference that a careful reader would expect §5 or the Glossary to make
explicit, given how central the word "backoffice" is to this PRD's own title.

## 2. Is the "manager-only revision chat" vs. "employee-facing frontoffice" boundary actually clean?

Mostly, but not entirely — **J4 is the blurry case.**

The PRD's boundary statement (§2.2, line 31, restated in §5 line 210):
> "`PRODUCT_SPEC.md`'s employee-facing journeys (grounded Q&A, cross-session progress tracking,
> access-request approval) describe a *different*, not-yet-built product surface... This PRD's manager
> chat (§4.2) is a distinct, manager-only revision surface — the two should not be conflated."
> §5: "Employee-facing RAG Q&A, cross-session memory, or access-request approval workflows
> (`PRODUCT_SPEC.md` journeys J2–J4) — those describe the *employee's* future assistant experience..."

But PRODUCT_SPEC.md's J4 (lines 58–62) is explicitly bilateral, not employee-only:
> "Input: 'I need write access to the payments repo.' Agent behavior: checks the profile's
> `approvals_required` list. If listed, creates an approval request (HITL) — it never confirms access
> itself. **The approver reviews and approves/denies** ... Output: a pending-approval record **visible to
> both employee and approver.**"

The *request* in J4 is employee-initiated (frontoffice), but the *approval action* is squarely a
manager/approver task — the same persona this PRD is written for. The PRD's Non-Goals labels all of J2–J4
as "the employee's future assistant experience" and waves it away as a frontoffice concern, but J4's
approve/deny half is not employee-facing at all; it is a manager-facing capability that doesn't exist
anywhere in this PRD's FRs, and isn't obviously subsumed by FR-5 (whole-onboarding, plan-time permission
approval) either — J4 describes an ad hoc, mid-project runtime access request, a different lifecycle event
than approving the Day-1 plan.

This matters for sequencing, which the PRD's own addendum flags as a concern in the other direction
(addendum.md, "Relationship to the other project chat app," lines 14–25): the AgentCore runtime work this
PRD stands up is explicitly the same runtime the future frontoffice will reuse. If/when that frontoffice
ships J4, its approver-side UI will very likely need to live in *this* backoffice app (there is no other
manager surface described anywhere) — yet this PRD's Non-Goals doesn't flag "a future queue of ad hoc J4
access-request approvals distinct from onboarding-plan approval" as a known future extension point the way
it does for other future work (e.g., it explicitly flags real notification delivery and IAM provisioning as
deferred-but-anticipated). Recommend the PRD's §5 or Assumptions Index note this explicitly rather than
folding J4 wholesale into "employee-facing, not our problem."

Everything else in the boundary is clean: J2 (RAG Q&A) and J3 (cross-session progress tracking, employee
side) are unambiguously employee-facing per PRODUCT_SPEC.md's own text, and the PRD is correct to exclude
them without qualification.

## 3. Qualitative vision / tone / "what good looks like" not carried forward

**a) Anti-hallucination discipline as the document's central organizing theme, not carried forward
explicitly into the new chat-revision path.**

PRODUCT_SPEC.md treats grounding/anti-hallucination as close to its top concern — it has a dedicated
per-journey tolerance table (lines 92–99) and a dedicated "Source-of-truth data model" section (lines
73–83) whose closing line is:
> "This is the concrete anti-hallucination boundary between 'documents' and 'facts.'"

And for J1 specifically (the journey this PRD's plan generation *is*):
> "J1 (plan generation) | Zero — tool-only, no generative content in repo/permission fields"

The PRD's FR-9 (conversational plan revision) says the agent will "reason about the requested change and
re-invoke its existing tools... to produce a revised plan" (PRD line 139), which is consistent in spirit —
but the PRD never states, as an explicit testable requirement or NFR, that a **revised** plan must uphold
the same zero-hallucination-tolerance bar PRODUCT_SPEC.md sets for the original one (e.g., a revision could
plausibly hallucinate a repo name or permission in freeform chat before falling back to the tool). Given
how much weight PRODUCT_SPEC.md puts on this distinction being *enforced*, not just intended ("Enforcement,
not just intent," line 79), its absence as an explicit FR/NFR in §4.2 is a real gap in rigor, even though
the PRD's design (re-invoking `generate_onboarding_plan`) probably already satisfies it in practice.
Recommend adding one line to FR-9's Consequences: revised repo/permission fields must come from the
re-invoked tool output, never from freeform agent text, mirroring PRODUCT_SPEC.md's J1 tolerance row.

**b) "The agent is the primary surface, the plan generator is demoted to one tool" — the PRD's chat
feature is a good match for this vision, worth confirming as a plus.**

PRODUCT_SPEC.md's organizing principle (lines 6–13):
> "The deterministic plan generator... **stays**, but it is demoted from 'the demo' to **one tool the
> agent calls**. The agent... is the primary surface."

The PRD's Manager Revision Chat (§4.2) is a faithful extension of exactly this vision into the manager
domain — plan generation becomes one tool the agent calls in service of a conversation, rather than the
whole interaction. This is a genuine alignment, not a gap; flagging it so the finalize pass doesn't
second-guess a place where the PRD is actually doing the right thing.

**c) HITL framing: PRODUCT_SPEC.md's HITL gate is agent-enforced (Guardrails + a custom approval-state
tool the agent itself calls); the PRD's approval is a plain app-level button (FR-5), unchanged from today.**
This is not a contradiction — PRODUCT_SPEC.md's HITL gate is scoped to J4 (live access grants), which is
correctly out of this PRD's scope, and J1's "risks/approvals" field is exactly what a human manager reviews
before clicking the PRD's Approve button. Noted only so the finalize pass doesn't need to re-litigate it.

## 4. Manager-side requirements implied by PRODUCT_SPEC.md's personas/journeys that the PRD's §4 FRs
   don't fully cover

- **J4's approver-side approve/deny action** (see §2 above) — no FR in the PRD covers a manager acting on
  an ad hoc, employee-initiated access request; FR-5 only covers whole-onboarding, plan-time approval.
  Genuine coverage gap relative to what PRODUCT_SPEC.md's Approver persona and J4 describe, currently
  papered over by lumping J4 into "employee-facing."
- **Audit trail attribution ("who" not just "when")** — PRODUCT_SPEC.md's Approver persona needs
  "confidence the agent will never silently grant access it isn't authorized to grant," which the PRD's
  Action Log (FR-7) supports for *this app's* actions. The PRD is already self-aware about the identity gap
  (§5's manager-authentication non-goal, addendum's "Product-level consequence" note) — this is flagged
  correctly already, not a new gap.
- No other manager-side requirement in PRODUCT_SPEC.md (data model, retention, metrics) implies anything
  the PRD's FRs miss; PRODUCT_SPEC.md's KPIs and data-retention gap are scoped to the agent/employee side
  and correctly not inherited by this PRD.

## 5. Summary of findings, ranked

1. **(Moderate) J4's manager/approver-facing half is miscategorized as purely "employee-facing" and waved
   out of scope without acknowledging it will likely need a home in this backoffice app later.** PRD §2.2,
   §5 vs. PRODUCT_SPEC.md lines 58–62, 30–32.
2. **(Minor-moderate) FR-9 doesn't explicitly re-assert PRODUCT_SPEC.md's zero-hallucination-tolerance
   rule for revised plans**, even though the design (tool re-invocation) likely already satisfies it. PRD
   §4.2 FR-9 vs. PRODUCT_SPEC.md lines 92–99, 73–83.
3. **(Minor) No cross-reference between the PRD's Non-Goals and PRODUCT_SPEC.md's "multi-tenant/multi-cohort
   backoffice" deferred/future item**, despite the naming overlap with this app. PRD §5 vs. PRODUCT_SPEC.md
   lines 64–71, 128–132.
4. **(Minor, low-confidence) J1's "risks/approvals" plan field has no explicit corresponding detail-view
   section in the PRD's §4.1 completeness work** (only Permissions/Progress/Action Log are named) — may
   already be covered inline in the plan Markdown, needs a one-line confirmation. PRD §4.1 vs.
   PRODUCT_SPEC.md line 42.
5. **(Noted, not a gap) Approver persona's "low-friction approve/deny" need is only satisfied at
   whole-onboarding granularity**, per the PRD's own explicit, disclosed non-goal on per-permission
   approval — consistent, just calling it out per the task's checklist.
