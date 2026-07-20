# Reconciliation: BACKOFFICE_SPEC.md vs. PRD (prd.md + addendum.md)

Date: 2026-07-20
Scope: input-reconciliation pass for the PRD finalize workflow. Compares every requirement/idea in
`dayone/docs/BACKOFFICE_SPEC.md` against the PRD body (`prd.md`) and the technical addendum
(`addendum.md`), for the four flagged categories (lifecycle/status, permissions, action log/audit,
manager chat/revision) plus tone/philosophy and terminology.

Method note: where a spec item looked unaddressed, I checked the actual `onboarding-backoffice`
codebase (README.md, backend/src/types.ts, planBuilder.ts, OnboardingDetailPage.tsx) to determine
whether it's a genuine PRD gap or something already implemented in "Lab 2" that this PRD correctly
leaves untouched. Several apparent gaps turned out to be non-issues once checked against code; those
are recorded below as "checked, not a gap" so the false positives don't get re-litigated later.

---

## 1. Confirmed gaps (PRD is silent where BACKOFFICE_SPEC states something)

### 1.1 Persona list drops "Tech lead" (and narrows "People/IT admin")

BACKOFFICE_SPEC.md §"Primary user":
> - Manager.
> - Tech lead.
> - Engineering enablement.
> - People/IT admin.

PRD §2.1 (Jobs To Be Done) only lists:
- "manager/approver" (primary)
- "engineering-enablement/platform admin" (secondary, explicitly cited as "per BACKOFFICE_SPEC.md's
  persona list")

**Gap:** "Tech lead" never appears anywhere in `prd.md` or `addendum.md` (confirmed via grep — zero
hits). It is not merged into "manager/approver" explicitly, not carried into Non-Goals as an excluded
persona, and not defined in the Glossary. A downstream UX/Architecture reader has no way to know
whether "tech lead" was intentionally folded into "manager" (a reasonable read, given tech leads often
act as approvers) or simply dropped. Likewise, "People/IT admin" from the spec became
"engineering-enablement/**platform admin**" — the PRD invents a "platform admin" role not in the
spec's persona list while narrowing the spec's separate "People/IT admin" persona into UJ-2 flavor text
("answer a Slack question from People/IT") rather than a tracked JTBD. This is a persona-coverage gap,
not a functional-requirement gap, but it matters for who Epics/UX end up designing screens for.

### 1.2 `pending_approval` state has no explicit transition rule

BACKOFFICE_SPEC.md lists six states including `pending_approval`. PRD Glossary (§3) and FR-1 both list
it as one of the six, and FR-8 gates chat availability partly on it ("Given an onboarding in
`draft`/`pending_approval`/`blocked`..."). But no FR in §4.1 ever specifies **what causes entry into or
exit from `pending_approval`**:

- FR-2 covers `draft`/`blocked` on generation outcome.
- FR-3 jumps straight from "once a manager approves an onboarding" to "`ready_for_day_1`/`in_progress`"
  — it does not mention `pending_approval` as an intermediate stop.
- UJ-1's narrative (§2.3) says clicking Approve "moves the onboarding to `pending_approval` and then
  automatically to `ready_for_day_1`" — implying `pending_approval` is a real, if transient, stop — but
  this mechanic is never promoted to a testable FR/Consequence the way every other transition is.

**Gap:** one of the spec's six states is acknowledged to exist but has zero explicit
Consequences/testable behavior in the FRs — inconsistent with how rigorously FR-2/FR-3/FR-4 spell out
every other transition. An architecture/epics reader following FR-1 through FR-4 literally would not
know when/whether a record ever visibly sits in `pending_approval`, or whether it's purely a
UJ-narrative flourish.

### 1.3 Security rules 1 and 3 are never explicitly mapped

BACKOFFICE_SPEC.md §"Security rules" states four rules:
1. "The backoffice must not grant sensitive production access without approval."
2. "Every action must be audited."
3. "The employee should only see authorized information."
4. "Permission templates must be versioned and reviewed by security/platform."

The PRD explicitly quotes and addresses rules **2** and **4**:
- Rule 2 is quoted verbatim in FR-7's NFR and again in the manager-auth Non-Goal (§5) with an honest
  "only partially satisfiable" caveat.
- Rule 4 is explicitly waived in Non-Goals §5 with a stated rationale (it's a `dayone`
  YAML-authoring/governance concern, not this app's job).

Rules **1** and **3** are never quoted, referenced, or mapped to any FR/Non-Goal/Glossary entry:
- Rule 1 ("must not grant sensitive production access without approval") is *implicitly* satisfied only
  because Non-Goals §5 separately states permissions stay simulated/non-real ("Real IAM Identity
  Center/permission provisioning... permissions remain simulated text/data, not live grants"). But the
  PRD never draws the connection between that Non-Goal and this specific security rule, so a reader
  auditing "did we satisfy BACKOFFICE_SPEC's security rules" would not find rule 1 addressed by name.
- Rule 3 ("the employee should only see authorized information") is arguably satisfied *a fortiori*
  since §2.2 says the employee has no login/view/chat surface at all in this PRD's scope — but again,
  this is never stated as an intentional fulfillment of that rule. It reads as accidental coverage, not
  a design decision made with the rule in mind.

**Gap:** two of four named security rules are silently un-cross-referenced, even though the PRD
otherwise treats "does this satisfy BACKOFFICE_SPEC's security framing" as worth calling out explicitly
(as it does for rules 2 and 4). This is a completeness-of-traceability gap, not a functional defect —
but for a security-flagged spec section, a downstream reader deserves 4-for-4 explicit treatment, not 2.

---

## 2. Deviations that ARE flagged (verified as honest, not silent — no action needed, listed for completeness)

These are places the PRD's Non-Goals/scope cuts contradict something BACKOFFICE_SPEC.md states, but
the PRD does explicitly call out the contradiction rather than hiding it. Per the task's framing these
are "conflicts flagged," which is the correct behavior — recorded here so the reconciliation record is
complete, not because they need fixing:

- **Multi-project (`project_ids` plural) → single-project.** BACKOFFICE_SPEC.md's minimal-form spec
  requires `project_ids` (plural). PRD Non-Goals §5 explicitly says: "Multi-project onboardings
  (`project_ids` plural per `BACKOFFICE_SPEC.md`) — explicitly confirmed to stay single-project." Also
  independently confirmed as a pre-existing, documented limitation in the app's own README ("Single
  project per onboarding (not the plural `project_ids` from `dayone/docs/BACKOFFICE_SPEC.md`)"). Honest,
  well-flagged deviation.
- **Per-permission approval → whole-onboarding approval.** Spec's button-action list includes "Flag
  required approvals" (arguably implying per-item granularity). PRD FR-5 and Non-Goals §5 explicitly
  keep approval as one whole-onboarding action and name this as a deliberate scope cut.
- **Permission-template versioning/security review → out of scope for this app.** Addressed above
  under Rule 4; flagged Non-Goal with rationale.
- **Manager authentication → none.** Addressed above under Rule 2; flagged Non-Goal with an explicit,
  unusually candid consequence statement connecting it back to the audit-everything security rule.

---

## 3. Checked and found NOT to be gaps (verified against the codebase, recorded to prevent false positives)

BACKOFFICE_SPEC.md's "Detail view must show" list has 8 items: Generated plan, Repositories, Requested
permissions, Approved permissions, Checklist, Progress, Risks, Action logs.

PRD §4.1's description claims the *only* missing sections today are "Approved Permissions (distinct
from Requested), Progress, and Action Log." I verified this claim against the current codebase rather
than taking it on faith, since an incorrect scoping claim here would be exactly the kind of silent gap
this reconciliation is meant to catch:

- **Risks** — already implemented today as "Project risk notes" (`backend/src/planBuilder.ts` §"##
  Approvals and risks", `frontend/src/pages/OnboardingDetailPage.tsx` "Approvals required & risk
  notes" section, backed by `risk_notes: string[]` in `types.ts`). Not a gap — correctly left out of
  this PRD's FR list because it's pre-existing, not because it was overlooked.
- **Repositories** and **Checklist** (day-1/week-1) — both already implemented today (`planBuilder.ts`
  "## Repositories to clone" / "## Day 1 checklist", rendered in `OnboardingDetailPage.tsx`). Same
  conclusion: correctly out of this PRD's scope.
- **Generated plan** — already implemented (this is the app's core existing feature).

So PRD §4.1's scoping statement is accurate, not a silent omission. This is worth recording explicitly
because a shallower reconciliation pass might have flagged "Risks isn't in the PRD's FRs" as a gap;
it isn't, once checked against what already exists.

**Terminology note:** since Risks/Repositories/Checklist/Generated Plan are unaffected by this PRD,
the Glossary (§3) also has no reason to define them, and doesn't — consistent, not a gap.

---

## 4. Minor / low-severity note (pre-existing, not introduced by this PRD, but un-cross-referenced)

**"Send link to the new employee" (BACKOFFICE_SPEC.md button-action step 8) fires at approval time,
not creation time, and the PRD's Non-Goal doesn't flag the mismatch.**

BACKOFFICE_SPEC.md's "Create onboarding" button-action list has this notification as step 8 of *record
creation* — implying it fires when the onboarding is first created. The actual implementation (and the
app's own README: `"Approve & send to employee" — a manager-only action...`) ties the simulated
notification to **approval**, not creation — confirmed in `frontend/src/pages/OnboardingDetailPage.tsx`
(`record.status === "approved" && record.notification`) and `backend/src/store.ts`.

The PRD's relevant Non-Goal (§5) only says: "Real notification delivery (email/Slack) for approvals —
stays simulated, unchanged from today." This correctly preserves the current (approval-time) behavior
and correctly notes it stays simulated, but never acknowledges that this timing already diverges from
BACKOFFICE_SPEC.md's literal create-time sequencing — unlike the multi-project and per-permission-item
deviations (§2 above), which *are* explicitly cross-referenced against the spec. Low severity because
it's a pre-existing Lab-2 behavior this PRD doesn't touch, but it's an inconsistency in how thoroughly
the PRD cross-checks its Non-Goals against the spec's literal text.

---

## 5. Qualitative/tone check

BACKOFFICE_SPEC.md's overall framing ("start a technical onboarding without running scattered manual
steps") and its security-rules section read as governance-first — the four security rules are grouped
together as a single coherent "this is a security-sensitive internal tool" statement. The PRD's vision
(§1) picks up the practical framing well ("without chasing that information across Slack and
Confluence") and does surface security/audit concerns prominently (FR-7's NFR, the manager-auth
Non-Goal's candid caveat) — but because those four rules are addressed piecemeal (2 explicit, 2 absent,
per §1.3 above) rather than as a single tracked "security rules compliance" block, the spec's original
intent — that these four rules be read and satisfied *together* as one governance statement — doesn't
fully survive into the PRD's structure. Not a factual gap, but a structural/emphasis one: a reader
scanning the PRD for "did we account for BACKOFFICE_SPEC's security rules" has to reconstruct the
answer from three different sections (FR-7, two Non-Goals) rather than finding one place that maps all
four rules 1:1.

---

## Summary table

| BACKOFFICE_SPEC.md item | PRD coverage | Verdict |
|---|---|---|
| 4 personas (Manager, Tech lead, Eng enablement, People/IT admin) | 2 of 4 named explicitly; Tech lead absent | **Gap** |
| Minimal form required/optional fields | Field-alignment done outside this PRD; `project_ids` plural cut flagged | OK (flagged deviation) |
| Button actions 1–2 (validate profile/project) | Pre-existing, unchanged, out of this PRD's delta | OK (no change claimed) |
| Button action 3 (generate plan) | FR-13 (transport change only) | OK |
| Button action 4 (create state record) | FR-1/FR-2 | OK |
| Button action 5 (calculate expected permissions) | FR-5 | OK |
| Button action 6 (create day-1 tasks / checklist) | Pre-existing; step-completion tracking explicitly a Non-Goal | OK |
| Button action 7 (flag required approvals) | FR-5 keeps whole-onboarding approval; flagged Non-Goal | OK (flagged deviation) |
| Button action 8 (send link to new employee) | Pre-existing (approval-time, not creation-time); Non-Goal covers "simulated" but not the timing mismatch | **Minor gap** |
| Detail view: plan/repos/checklist/risks | Pre-existing, correctly unaddressed | OK (checked, not a gap) |
| Detail view: requested/approved permissions | FR-5 | OK |
| Detail view: progress | FR-6 | OK |
| Detail view: action logs | FR-7 | OK |
| 6 onboarding states | FR-1 (all six named); `pending_approval` transition unspecified | **Gap** (partial) |
| Security rule 1 (no sensitive access w/o approval) | Implicit only, never named | **Gap** |
| Security rule 2 (every action audited) | FR-7, Non-Goals (explicit, candid) | OK |
| Security rule 3 (employee sees only authorized info) | Implicit only (employee has no view at all), never named | **Gap** |
| Security rule 4 (permission templates versioned/reviewed) | Explicit Non-Goal with rationale | OK |
