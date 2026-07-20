# Reconciliation: PRD vs. `dayone/docs/WORKSHOP_LABS.md`

**Reference input:** `/home/ialvez/workspace/dayone/docs/WORKSHOP_LABS.md`
**PRD under review:** `prd.md` (+ `addendum.md`), dated 2026-07-17
**Purpose:** verify the PRD's "Lab 3 Capability Expansion" framing against what WORKSHOP_LABS.md actually defines Lab 3 to be.

---

## 1. Scope mismatch: the PRD bundles three things under one "Lab 3" label; WORKSHOP_LABS.md's Lab 3 only defines one of them

WORKSHOP_LABS.md's Lab 3 section (lines 75–88) defines exactly one deliverable:

> "**Goal:** use `aws-samples/sample-strands-agentcore-starter` for infra/UI/deploy, keeping this repo as the domain layer (**Option C** recommended — see `accelerator/INTEGRATION_PLAN.md`)."

Cross-referenced against the lab comparison table (lines 8–14), the only row that changes value at Lab 3 *without* a "(future)" qualifier is **Orchestration: "Agent on AgentCore Runtime."** Every other row for Lab 3 — Tools, Data, Permissions, State — is explicitly marked `(future)`, i.e. not actually part of what Lab 3 itself delivers, only the direction it points toward.

The PRD's §4.3 (AgentCore Runtime Integration, FR-13–FR-15) maps cleanly onto this — swapping the local Python-subprocess Strands-agent invocation for calls to the deployed AgentCore Runtime is exactly the Lab 2→Lab 3 orchestration change the table describes. **This part of the PRD is accurately scoped against WORKSHOP_LABS.md.**

However, the PRD's other two features have no basis in WORKSHOP_LABS.md at all:

- **§4.1 Full Onboarding State Machine & Detail-View Completeness** (six-state lifecycle, Approved Permissions, Progress, Action Log) — sourced entirely from `BACKOFFICE_SPEC.md` (per the PRD's own §4.1 description line 57: "the six-state lifecycle from `BACKOFFICE_SPEC.md`... the detail-view sections `BACKOFFICE_SPEC.md` calls for"). WORKSHOP_LABS.md never mentions onboarding statuses, audit logs, or permission labeling — the lab table is entirely about the *agent's* orchestration/tools/data/permissions/state, not about a downstream consuming app's UI/lifecycle model.
- **§4.2 Manager Interactive Chat / Plan Revision** — also not called for anywhere in WORKSHOP_LABS.md's Lab 3 section. The closest analog is actually in **Lab 2**'s exercises (lines 65–69): "Ask the agent to explain **what it would do** before doing it (human-in-the-loop)" and "review the dangerous-tools contract." Conceptually, manager-facing conversational human-in-the-loop review is a Lab 2 pedagogical idea, productized here — but the PRD labels it a Lab 3 deliverable, presumably because it depends on AgentCore Memory (FR-14, a Lab 3 transport concern) rather than because WORKSHOP_LABS.md defines it as such.

**Net finding:** the PRD's title ("Lab 3 Capability Expansion") and §0/§1 framing ("moves the app from its current 'Lab 2' shape... to its 'Lab 3' shape") imply a 1:1 mapping to the workshop's lab definition. Only 1 of the 3 bundled features actually is that mapping; the other two are `BACKOFFICE_SPEC.md`-driven product features riding along under the same label. This isn't wrong to build, but it is a naming/framing overreach — a reader using WORKSHOP_LABS.md as "the naming source for this whole PRD" (per the task brief) would not derive FR-1–FR-12 from it.

---

## 2. The employee-facing frontoffice: WORKSHOP_LABS.md arguably places its UI *inside* Lab 3, not a later lab — and there is no later lab defined

This is the most consequential gap. The PRD explicitly defers the employee-facing frontoffice:

> §2.2: "The **new-hire employee** is explicitly not a user of this PRD's scope... `PRODUCT_SPEC.md`'s employee-facing journeys... describe a *different*, not-yet-built product surface (**the future frontoffice** pointed at the same AgentCore-hosted agent)."
> §5 Non-Goals: "**The employee-facing frontoffice** — noted (§1, §4.3) as sharing the same AgentCore Runtime dependency this PRD stands up, but its scope... is not defined here."

But WORKSHOP_LABS.md's Lab 3 goal (line 77, quoted above) says the accelerator provides **infra/UI/deploy** — UI is explicitly bundled into what Lab 3 is about. The addendum independently confirms which UI that is:

> addendum.md lines 15–16: "the AgentCore Runtime above (`htmx_chatapp_iv`) is the **same deployed system** backing the 'other project' chat app referenced for the future employee-facing frontoffice — a Lambda + CloudFront + ECR stack (`htmx-chatapp-iv`)"

So the chat app the PRD calls "the future frontoffice" is, per the addendum's own words, the *same* accelerator UI that WORKSHOP_LABS.md's Lab 3 goal names as part of Lab 3's deliverable ("infra/UI/deploy"). And critically: **WORKSHOP_LABS.md defines no Lab 4.** Lab 3 is explicitly the terminal lab — its section header is "Lab 3 — AWS accelerator (**path to production**)" and its success criterion (lines 87–88) is about the team being able to "evolve it toward an AWS-native production solution," not about a subsequent lab picking up remaining work. There is no lab boundary in this document for the frontoffice to be "later" relative to.

The PRD/addendum are aware of the shared-runtime relationship (addendum line 25: "even though the frontoffice itself remains out of scope for this PRD") but never acknowledges that WORKSHOP_LABS.md doesn't actually provide a "later lab" home for it — the PRD's "future" language implies a subsequent stage that this reference document doesn't define. This is exactly the scope-boundary risk to flag: the PRD is deferring something WORKSHOP_LABS.md's own Lab 3 goal statement arguably already includes.

**Caveat:** this is a defensible product decision (the PRD is explicitly manager/backoffice-scoped, and the frontoffice needs its own auth/UX/product definition that doesn't exist yet) — but it should be an *explicit, flagged* deferral against the workshop doc, not an implicit one, given WORKSHOP_LABS.md's wording.

---

## 3. Pedagogical success criterion vs. product success metrics

WORKSHOP_LABS.md measures Lab 3 completion by participant comprehension, not by shipped features or KPIs:

> line 87–88: "**Workshop success criterion:** the team can explain, modify and extend the onboarding flow, and knows how to evolve it toward an AWS-native production solution."

The PRD's §7 Success Metrics (SM-1: % of approved onboardings reaching `ready_for_day_1`/`in_progress` automatically; SM-2: reduction in delete-and-recreate churn; SM-3: latency/success-rate parity) are all product/operational metrics with no analog in WORKSHOP_LABS.md's framing. This is a reasonable and probably necessary translation for a PRD (a workshop comprehension goal isn't directly measurable as a product KPI), but the PRD doesn't flag that it has substituted a different kind of success criterion than the one the workshop doc uses for "is Lab 3 done." Anyone checking "did this PRD achieve Lab 3's goal" against WORKSHOP_LABS.md would be checking team understanding/extensibility, not SM-1–3. Minor, but worth noting as a framing gap rather than a scope gap.

---

## 4. Tension with WORKSHOP_LABS.md's "golden rule" (additive, non-breaking labs)

WORKSHOP_LABS.md states an explicit cross-lab invariant:

> lines 16–17: "> Golden rule: **the repo must always run in Lab 1 without installing the Strands SDK.**
> Lab 2 and Lab 3 are optional and additive; they don't break the local path."

This rule is written about the `dayone` repo (which the PRD correctly leaves unmodified — Glossary: "Strands Agent — ...defined in the sibling `dayone` repo, unmodified"). However, the PRD commits the **consuming** onboarding-backoffice app to an irreversible cutover:

> §4.3 FR-13 Out of Scope: "the local Python-subprocess path (`pythonBridge.ts` + `run_narrative.py`) is removed entirely as part of this feature, not kept as a fallback — confirmed."
> addendum.md: "**Decision:** the local Python-subprocess path... is removed entirely, not kept as a fallback (user confirmed)."

Once this ships, the backoffice app itself can no longer run in a Lab 1/Lab 2-equivalent (local, no-AWS-credentials) configuration — it hard-depends on a deployed AgentCore Runtime. This doesn't literally violate the golden rule (which is scoped to the `dayone` repo, not this one), but it runs counter to the workshop's broader "optional and additive, never break the earlier/local path" philosophy for anything built on top of the labs. The PRD confirms this as a deliberate decision (twice) but never discusses it against WORKSHOP_LABS.md's stated philosophy — it's presented as a purely technical/product call, not a pedagogical tradeoff.

---

## 5. Areas where the PRD is well-aligned with WORKSHOP_LABS.md (no gap)

For completeness, these checked out cleanly:

- **§4.3 / FR-13–15** (AgentCore Runtime replacing subprocess invocation) is an accurate, well-scoped implementation of WORKSHOP_LABS.md's Lab 3 Orchestration-row change, including correctly using the already-deployed accelerator runtime per "Option C" (`accelerator/INTEGRATION_PLAN.md`), consistent with WORKSHOP_LABS.md line 78's pointer to the same doc.
- **§5 Non-Goals** — "Real IAM Identity Center / permission provisioning" and the absence of any S3/DynamoDB persistence commitment — correctly match WORKSHOP_LABS.md's own `(future)` tags on the Permissions/Data/State columns for Lab 3 (table, lines 8–14). The PRD is not arbitrarily narrowing scope here; it's correctly declining to build things WORKSHOP_LABS.md itself marks as beyond Lab 3.
- The "Lab 2 shape → Lab 3 shape" framing, read narrowly as *just* the orchestration/transport layer (subprocess-invoked Strands agent → AgentCore-hosted Strands agent), is accurate against the table's Orchestration row and against Lab 2's own "criterion to move to Lab 3" (line 71: "the agent loads profile + project, generates the plan and records a step" — i.e., the Lab 2 agent already works locally; Lab 3 is purely about relocating where it runs).
- FR-4's Non-Goal note on `mark_step_done`/checklist completion is self-aware: WORKSHOP_LABS.md's Lab 2 criterion (line 71) already requires "records a step" to work at the agent level, and the PRD explicitly flags (rather than silently omits) that automatic `completed` transitions tied to that capability are left out of MVP.

---

## Summary of gaps, ranked

1. **Frontoffice/UI scope-boundary risk (highest confidence, most consequential):** WORKSHOP_LABS.md's Lab 3 goal bundles "infra/UI/deploy" from the accelerator; the addendum confirms that UI is the same chat app the PRD calls "the future frontoffice." WORKSHOP_LABS.md defines no Lab 4 for that deferred work to belong to — Lab 3 is the terminal, "path to production" lab. The PRD's deferral is defensible as a product decision but is not flagged against this specific tension.
2. **Naming/framing overreach:** the PRD's "Lab 3 Capability Expansion" title and Lab 2→Lab 3 framing cover two features (§4.1 state machine/detail-view, §4.2 manager chat) that derive entirely from `BACKOFFICE_SPEC.md`, not from WORKSHOP_LABS.md's Lab 3 definition (which is solely an orchestration/infra change). Only §4.3 is a genuine Lab-3-per-the-workshop-doc deliverable.
3. **Golden-rule tension:** the workshop's "Lab 2/3 are optional and additive, never break the local path" philosophy is in tension with the PRD's confirmed, no-fallback removal of the subprocess path — not a literal rule violation (the rule targets `dayone`, not this repo) but an undiscussed tradeoff against the stated philosophy.
4. **Pedagogical vs. product success criteria:** WORKSHOP_LABS.md measures Lab 3 by team comprehension/extensibility; the PRD substitutes product KPIs (SM-1–3) without noting the substitution.

No scope-creep findings in the other direction were found — i.e., nothing in WORKSHOP_LABS.md's Lab 3 definition is present in the PRD that shouldn't be; the PRD's Non-Goals are, if anything, well-calibrated to WORKSHOP_LABS.md's own "(future)" qualifiers.
