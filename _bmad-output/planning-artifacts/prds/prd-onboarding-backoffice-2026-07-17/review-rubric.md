# PRD Quality Review — Onboarding Backoffice: Lab 3 Capability Expansion (2026-07-17)

## Overall verdict

This PRD is in good shape: FR-level done-ness is unforgiving in the best sense (every FR carries given/when/then consequences, no hedge language found), scope honesty is thorough (Non-Goals, `[ASSUMPTION]`/`[NOTE FOR PM]` tags, an honestly-open §8 with owners and revisit triggers), and the capability-spec shape fits a single-manager-operator internal tool without UJ over-formalization. The newly-reconciled FR-3 ("Send for approval") is cleanly integrated — every cross-reference to it (FR-6, FR-10, §6.1, §8) resolves correctly, and the renumbering that followed its insertion was done consistently throughout `prd.md`. What's at risk is smaller: two secondary personas that never drive a decision, one real trade-off (removing the subprocess fallback against the workshop's own stated "additive, non-breaking" philosophy) that's surfaced only in the addendum's low-priority tail rather than in the PRD body, and — most concretely — the addendum itself has two stale FR-number references left over from before the FR-3 renumbering, which is exactly the kind of drift that misleads an architecture reader who trusts the addendum's citations.

## Decision-readiness — adequate

The two new Open Questions in §8 (`track_progress` tool status; J4 approval-queue overlap) are genuinely open — each has an owner, a concrete revisit trigger, and no answer smuggled into the next sentence. The `[NOTE FOR PM]` at §5 (manager-auth gap) lands on a real tension — it admits `BACKOFFICE_SPEC.md`'s "every action must be audited" rule is only *partially* satisfiable, not smoothed to "handled." FR-3 itself is stated as a real decision with a real consequence: "a manager cannot approve directly from `draft`" (§4.1, FR-3).

### Findings
- **low** FR-14's trade-off is named but what's given up isn't (§4.1 FR-14, "Out of Scope") — The PRD body states the decision ("the local Python-subprocess path... is removed entirely... not kept as a fallback — confirmed") but doesn't name the cost: `addendum.md`'s "Minor reconciliation notes" reveals this contradicts `WORKSHOP_LABS.md`'s stated philosophy that Lab 2/Lab 3 stay "optional/additive and don't break the local path." That trade-off is real (a downstream reader loses a fallback path) but is filed only in the addendum's tail as something that "none warranted a PRD-body change." *Fix:* if this PRD is read without its addendum, add one clause to FR-14's Out of Scope note acknowledging the fallback-removal is a deliberate departure from the workshop's stated additive principle, not just "confirmed."

## Substance over theater — adequate

The Vision statement (§1) is specific to this product — it names the six states, the current binary-status limitation, and the frontoffice foundation rationale — not boilerplate that could swap into another PRD. FR-8's NFR ("Audit entries must never be editable or deletable") is a real, testable constraint, not "system must be secure" boilerplate.

### Findings
- **low** Two secondary personas never drive a decision (§2.1) — The platform-admin and tech-lead JTBD bullets are explicitly sourced "per `BACKOFFICE_SPEC.md`'s persona list" rather than from this PRD's own discovery, and neither persona reappears in a UJ, FR, Non-Goal, or Success Metric — both UJs (UJ-1, UJ-2) are Priya/manager journeys. The visibility these personas ask for is already delivered incidentally by FR-7/FR-8 for the primary persona. *Fix:* either cut the two bullets or add one line tying each to a concrete FR/UJ it independently motivates (e.g., if tech-lead visibility ever requires a distinct view/permission, say so; otherwise drop them).

## Strategic coherence — adequate

SM-2 (reduction in delete-and-recreate churn) is a well-chosen thesis-validating metric — it measures whether Manager Revision Chat actually replaces the workaround it was built to eliminate, not just activity. SM-C1 is a real counter-metric, not decoration. §0's own admission — "only §4.3... is `WORKSHOP_LABS.md`'s literal definition of 'Lab 3'... bundled into this PRD because they ship together as one release, not because the workshop's own lab boundary requires it" — is commendably transparent, but it also concedes the three features (§4.1 state machine, §4.2 chat, §4.3 transport) are joined by release-timing convenience more than by a single product thesis.

### Findings
- **low** Feature bundling is release-driven, not thesis-driven (§0) — Worth flagging only because it explains why this PRD reads as three well-specified capability specs stitched by a Vision paragraph, rather than one arc with three consequences. Not a defect — the PRD names this itself — but downstream sequencing decisions (mentioned in §0: "worth knowing if this PRD is ever split") should treat the three features as more independent than the Vision section's narrative implies. No fix needed; already self-aware.

## Done-ness clarity — strong

Every one of FR-1 through FR-16 has at least one given/when/then "Consequences (testable)" block, and a scan for the rubric's flagged hedge phrases ("handles X gracefully," "reasonable performance," "user-friendly") turns up none. Edge cases get explicit treatment: FR-2's failure path, FR-10's "agent's revision attempt fails" consequence, FR-15's uncomfortable "if `MEMORY_ID` is not configured" consequence stated as a deployment risk rather than papered over.

### Findings
- **low** FR-16's latency NFR has no numeric bound (§4.3, "Feature-specific NFRs") — "No regression in end-to-end latency or success rate versus the current subprocess-based approach" is tied to SM-3, which itself defers the actual dashboards/thresholds to the architecture phase. This is reasonable for MVP, but as written neither the FR nor SM-3 gives an engineer a bound to test against ("parity" without a tolerance). *Fix:* note in SM-3 (or flag as an Open Question) that architecture must define the acceptable latency delta, not just "not worse."

## Scope honesty — strong

§5's nine Non-Goals each do real work rather than gesture at completeness — several cite the specific source doc and rationale (e.g., multi-project cut cites `BACKOFFICE_SPEC.md`'s plural `project_ids`), and the manager-auth Non-Goal carries a `[NOTE FOR PM]` naming the exact downstream consequence (Action Log can attribute to "a manager," not a named person). Both inline `[ASSUMPTION]` tags (FR-1, FR-10) round-trip cleanly into §9's Assumptions Index. De-scoping is proposed honestly, not silent: FR-14's subprocess removal and FR-5's manual-only `completed` transition are both stated as confirmed choices with their consequences spelled out, not assumed away. Open-item density (2 genuinely unresolved items in §8, each with an owner and revisit trigger; 6 previously-open items resolved by source inspection rather than guessed) is proportionate for a PRD feeding architecture next, not a green-light-to-ship document.

No findings — this dimension is doing real work throughout.

## Downstream usability — strong

The Glossary (§3) terms are used identically everywhere they recur — "Requested Permissions"/"Approved Permissions," "Action Log," "Manager Revision Chat" all match their definitions verbatim in the FRs that use them. FR IDs (FR-1–FR-16), UJ IDs (UJ-1, UJ-2), and SM IDs (SM-1–3, SM-C1) are contiguous with no gaps or duplicates, and every in-body cross-reference resolves to the FR it names (verified FR-3→FR-6/FR-10, FR-4→FR-5/FR-6/FR-7/FR-8, FR-6→FR-3, FR-8→FR-4, FR-9→FR-12, FR-10→FR-8, FR-13→FR-8, §5→FR-5/FR-6/FR-8/FR-15, §7→FR-1/FR-2/FR-4/FR-9/FR-10, §8→FR-3/FR-5/FR-6/FR-14/FR-15/FR-16, §9→FR-1/FR-10 — all correct after the FR-3 renumbering). Both UJs name Priya as protagonist consistently. Brownfield references were spot-checked against the actual codebase and are accurate: `backend/src/types.ts` confirms `OnboardingStatus = "created" | "approved"` (matching FR-1's claimed pre-state) and the exact `ProgressEvent` union (`status`/`tool_call`/`reasoning`/`text`) the addendum's NDJSON-mapping section builds on; `backend/src/pythonBridge.ts` and `backend/python-bridge/run_narrative.py` exist as named.

The one gap is in the addendum, not the PRD body — see Mechanical notes.

## Shape fit — strong

This is correctly shaped as a capability spec for a single-manager-operator internal tool: two UJs (not UJ-density overhead), FRs carrying the actual specification weight, and Success Metrics that are operational (SM-1 automatic-transition coverage, SM-3 latency/success parity) rather than forced into user-facing vanity metrics. The brownfield distinction is handled explicitly — §2.2 draws a hard line between this PRD's manager-only chat and the `PRODUCT_SPEC.md` employee-facing journeys "explicitly not a user of this PRD's scope," preventing the two AgentCore-Runtime-adjacent surfaces from being conflated during architecture, per its own stated intent.

No findings.

## Mechanical notes

- **Addendum has two stale FR references from before the FR-3 renumbering.** `addendum.md` line 60 says "Chat continuity (**FR-14**) is achievable as designed" — chat continuity is **FR-15** ("AgentCore Runtime backs Manager Revision Chat"); FR-14 is the plan-generation transport swap. `addendum.md` line 66 says "the Action Log (**FR-7**)" — the Action Log is **FR-8**; FR-7 is Progress display. Both are almost certainly leftover from before the FR-3 insertion shifted every later FR number by one — the PRD body itself got the shift right everywhere it was checked (e.g., `prd.md` §8 correctly says "chat continuity (FR-15)"), but these two addendum spots weren't re-synced. Since the addendum is framed as detail that "must survive into architecture," these will mislead a reader who cites the addendum without cross-checking `prd.md`'s current numbering.
- **Assumptions Index roundtrip: clean.** Both inline `[ASSUMPTION]` tags (FR-1, FR-10) are indexed in §9, and both §9 entries have a corresponding inline tag — no drift.
- **Glossary: no drift found.** Checked "Action Log," "Manager Revision Chat," "Requested/Approved Permissions," "AgentCore Runtime," and "Strands Agent" for consistent casing and usage across all FRs, Non-Goals, and §8 — all consistent with §3's definitions.
- **ID continuity: clean in `prd.md`.** FR-1–FR-16, UJ-1–UJ-2, SM-1–3/SM-C1 are contiguous with no gaps or duplicates.
