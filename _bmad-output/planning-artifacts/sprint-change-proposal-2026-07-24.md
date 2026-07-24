# Sprint Change Proposal — Epic 3 People Experience Enhancements

**Date:** 2026-07-24  
**Project:** onboarding-backoffice  
**Change scope:** Moderate backlog adjustment; Epic 3 remains the owning epic  
**Status:** Approved by user on 2026-07-24

## 1. Issue Summary

Stakeholder review of the Epic 3 People/onboarding workspace identified several usability and correctness gaps:

- The chat send control has no clear send icon, and Enter does not submit a message.
- Unrelated chat prompts receive a misleading “Plan updated” success response.
- A chat-driven update to the onboarding Markdown plan does not refresh the main People/list view.
- The detail page needs a responsive-layout review against the onboarding detail reference mockup.
- The Permissions table exposes an unnecessary `Included` column.
- Status values on the main onboarding list expose storage-oriented snake_case labels.

Evidence: the supplied stakeholder findings; the current implementation renders `record.status.replaceAll("_", " ")`, displays the `Included` table column, and always renders the successful “Plan updated” chat bubble for a completed chat response. The current UX contract also explicitly marks chat internals as unchanged and the People list as untouched, so these are newly identified requirements rather than implementation details already covered by Epic 3.

## 2. Impact Analysis

### Epic impact

Epic 3 can still be completed as planned. Add six stories after Story 3.8; no existing story needs to be removed, rolled back, or renumbered:

- **3.9 — Chat send affordance and keyboard submission**
- **3.10 — Chat response intent and outcome handling**
- **3.11 — Refresh People data after chat plan changes**
- **3.12 — Responsive People/onboarding detail layout**
- **3.13 — Simplify Permissions table**
- **3.14 — Human-readable onboarding list statuses**

No new epic or priority resequencing is required. Stories 3.9, 3.12, 3.13, and 3.14 can proceed largely in parallel; 3.10 and 3.11 depend on the existing chat flow and should be coordinated.

### Artifact impact

- **Epics:** Add Stories 3.9–3.14 and update Epic 3's scope/coverage note.
- **PRD:** No core functional requirement changes are required. Add a UX/quality addendum only if the team wants these behaviors represented as formal requirements; they do not change the MVP goal.
- **UX design:** Update `DESIGN.md` and `EXPERIENCE.md` because the current contract says chat internals are unchanged, specifies `Permission | System | Included`, and says the People list is untouched. Add responsive breakpoints, send-button affordance/keyboard behavior, intent-aware chat outcomes, list refresh behavior, simplified permissions, and display-label rules.
- **Mockup:** Update `mockups/onboarding-detail.html` to remove `Included`, use the final send icon treatment, and demonstrate narrow/stacked responsive states. The mock is a visual reference; the UX spines remain the behavioral contract.
- **Architecture:** No architecture document exists for Epic 3 and no new endpoint or persistence model is required. Existing chat SSE handling and list/detail fetches remain the integration points. 3.11 may use the existing fetch path; it must not mutate the onboarding snapshot/history rules.
- **Testing/documentation:** Add manual acceptance coverage to the story handoff. No test framework is configured, so do not introduce one as part of this change.

## 3. Recommended Approach

### Option evaluation

| Option | Assessment |
|---|---|
| Direct adjustment — add stories to Epic 3 | **Viable. Low–medium effort, medium risk.** Keeps related UX work together and preserves the current architecture. |
| Rollback completed work | Not viable. Nothing in Stories 3.1–3.8 prevents these fixes; rollback would create unnecessary regression risk. |
| PRD/MVP review | Not required. The changes improve usability, correctness, and presentation without changing the product goal or data model. |

**Recommendation:** Direct adjustment. Add Stories 3.9–3.14, update the UX contract/mockup, and implement against the existing React/Express APIs. Estimated effort is medium overall, with the main uncertainty in defining the agent's unrelated-request response contract and ensuring list refresh does not overwrite local navigation state.

**Timeline impact:** Add one focused Epic 3 iteration; no expected impact to Epics 1–2 or the MVP release boundary if the responsive review remains scoped to the referenced People/list and onboarding detail surfaces.

## 4. Detailed Change Proposals

### Story 3.9: Chat send affordance and keyboard submission

**Section:** New story after 3.8  
**As a manager,** I want a recognizable send control and a keyboard shortcut for submitting chat messages, so that sending a revision request is obvious and fast.

**Acceptance criteria:**

- Given an editable chat, when the input renders, then the adjacent button contains a visible send icon matching the icon treatment in `onboarding-detail.html`, has an accessible name such as “Send message,” and remains visibly disabled when sending is unavailable.
- Given the input contains non-empty text, when the manager presses Enter without Shift, then the message is submitted through the same handler as clicking Send.
- Given the manager presses Shift+Enter, then a newline is inserted and the message is not submitted.
- Given the input is empty, read-only, or a response is streaming, then Enter and the Send button do not submit a message.

**Rationale:** Removes ambiguity in the primary chat action and supports expected keyboard behavior without changing the SSE/API contract.

### Story 3.10: Chat response intent and outcome handling

**Section:** New story after 3.9  
**As a manager,** I want responses to unrelated prompts to explain that they are out of scope, so that the UI does not claim that an onboarding plan changed when it did not.

**Acceptance criteria:**

- Given a prompt unrelated to the onboarding process or plan, when the agent responds, then the transcript shows a clear out-of-scope/informational response and does not show “Plan updated.”
- Given a prompt that produces a valid onboarding-plan revision, when the revision is applied, then the existing success response may show “Plan updated” and the revised plan is displayed.
- Given a prompt that cannot be classified or the agent reports an error, then the chat shows an error/clarification state, preserves the previous plan, and does not claim success.
- The response classification is represented by the existing streamed response/result contract or a documented extension; no client-side keyword guessing is used as the source of truth.

**Rationale:** Corrects a misleading success state while preserving the existing revision and error guarantees.

### Story 3.11: Refresh People data after chat plan changes

**Section:** New story after 3.10  
**As a manager,** I want the People/list view to reflect a chat-driven Markdown plan update, so that the list and detail data do not remain stale after a manager revision.

**Acceptance criteria:**

- Given a manager submits a chat request that changes the stored onboarding `.md` plan, when the revision completes successfully, then the current detail state and the People/list data are refreshed from the persisted record.
- Given the revision is unrelated, rejected, or fails, then no refresh is presented as a successful plan update and the prior persisted plan remains intact.
- Refreshing the list does not create a duplicate onboarding, change the onboarding identity, rewrite the original profile/project snapshot, or discard unrelated local UI state.
- If the user is on another route when the change occurs, the next load of the People/list view reads the current persisted record through the existing API.

**Rationale:** Keeps the primary People surface consistent with the plan the manager just changed.

### Story 3.12: Responsive People/onboarding detail layout

**Section:** New story after 3.11  
**As a manager,** I want the People list and onboarding detail page to remain usable at narrow and wide viewport sizes, so that the workspace does not clip, overlap, or force unexpected page-level scrolling.

**Acceptance criteria:**

- At desktop widths, the main content and chat remain in the two-pane layout represented by the reference mockup, with the chat sticky while the main column scrolls.
- At tablet/mobile widths, the layout collapses into a single readable column; the chat moves below or into the page flow and is not clipped by a fixed-width aside.
- Header actions, status chips, tables, chat input, and send button wrap or resize without horizontal page overflow; tables may scroll within their own container.
- The People list remains readable and operable at narrow widths, including employee identity, status, and primary actions.
- Keyboard focus order and visible focus states remain usable in both layout modes.

**Rationale:** Converts the requested “review responsiveness” into testable behavior while retaining the mockup's desktop composition.

### Story 3.13: Simplify Permissions table

**Section:** New story after 3.12  
**As a manager,** I want the Permissions table to show only useful permission information, so that the table is easier to scan.

**OLD:** `Permission | System | Included` with a checkmark in every row.  
**NEW:** `Permission | System`; remove the `Included` header and all corresponding cells/checkmarks.

**Acceptance criteria:**

- The Requested/Approved permissions table renders exactly the `Permission` and `System` columns.
- No `Included` header, checkmark, or screen-reader-only Included label remains.
- Requested-versus-approved card title behavior remains unchanged.
- The table remains horizontally contained within its card where needed.

**Rationale:** The column provides no differentiating information in the current data and adds visual noise.

### Story 3.14: Human-readable onboarding list statuses

**Section:** New story after 3.13  
**As a manager,** I want lifecycle statuses in the main People/onboarding list to use readable labels, so that I can scan onboarding progress without interpreting storage values.

**OLD:** Render the raw value after replacing underscores, e.g. `ready for day 1`, `in progress`.  
**NEW:** Render centralized display labels, including `In progress` and `Ready for day 1`, with title-style capitalization for all statuses.

**Acceptance criteria:**

- The list displays `Draft`, `Pending approval`, `Ready for day 1`, `In progress`, `Blocked`, and `Completed`.
- Storage/API status values remain unchanged and are not used as user-facing copy.
- The same display-label helper is reusable by the list and detail status chip so labels do not diverge.
- Status tone, sorting, filtering, and lifecycle behavior remain unchanged.

**Rationale:** Improves scanability while preserving the existing six-state status model.

## 5. Implementation Handoff

**Classification:** Moderate. The work is implementation-sized but requires backlog and UX-contract updates before development.

**Product Owner / Developer:**

- Add Stories 3.9–3.14 to `epics.md` with the acceptance criteria above.
- Update Epic 3's parallelization note and `sprint-status.yaml` with six `backlog` story entries after approval.
- Confirm the response classification contract for unrelated prompts with the agent/backend owner.

**UX/Developer:**

- Update `DESIGN.md`, `EXPERIENCE.md`, and the referenced mockup for the superseded assumptions.
- Implement the chat, refresh, responsive, permissions, and status-label changes using existing components and API paths.

**Success criteria:**

- All six stories meet their acceptance criteria.
- A revision request that changes the plan updates the detail and People/list data; an unrelated request never shows a false “Plan updated” result.
- Chat supports click and keyboard submission with an accessible visible icon.
- The responsive review passes at desktop, tablet, and mobile widths without page-level horizontal overflow.
- Permissions has two columns and statuses use human-readable labels.
- `npm run build` and `npm run lint` pass for the frontend; backend validation remains unchanged unless the response contract requires backend changes.

## 6. Checklist Status

- [x] 1.1–1.3 Trigger, problem, and evidence identified from stakeholder findings and repository inspection.
- [x] 2.1–2.5 Epic 3 remains viable; no new epic, rollback, or resequencing required.
- [x] 3.1 PRD conflict checked — no MVP or core FR change required.
- [x] 3.2 Architecture impact checked — no architecture document or new persistence/API requirement identified.
- [x] 3.3 UX impact identified — current chat/list/permissions/responsive assumptions require updates.
- [x] 3.4 Secondary impact checked — implementation and manual validation artifacts only; no CI/test framework change.
- [x] 4.1 Direct adjustment selected; 4.2 rollback not viable; 4.3 MVP review not required.
- [x] 5.1–5.5 Proposal, story changes, MVP impact, and handoff defined.
- [x] 6.1–6.2 Proposal reviewed for completeness and consistency.
- [x] 6.3 Explicit user approval received; backlog and UX artifacts finalized.

## Approval

Approval recorded: **yes**, received 2026-07-24. The backlog and UX artifacts have been updated, and the stories are routed to the Developer agent for implementation.
