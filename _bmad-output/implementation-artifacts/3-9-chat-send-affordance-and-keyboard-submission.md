---
baseline_commit: 04bccf8
---

# Story 3.9: Chat Send Affordance and Keyboard Submission

Status: ready-for-dev

## Story

As a manager,
I want a recognizable send control and a keyboard shortcut for submitting chat messages,
so that sending a revision request is obvious and fast.

## Acceptance Criteria

1. Given an editable chat, when the input renders, then the adjacent button contains a visible send icon matching the onboarding detail reference, has an accessible name such as `Send message`, and is visibly disabled when sending is unavailable.
2. Given the input contains non-empty text, when the manager presses Enter without Shift, then the message is submitted through the same handler as clicking Send.
3. Given the manager presses Shift+Enter, when the input has focus, then a newline is inserted and the message is not submitted.
4. Given the input is empty, read-only, or a response is streaming, when the manager presses Enter or activates Send, then no message is submitted.

## Tasks / Subtasks

- [ ] Update `ChatPanel`'s editable control and send affordance (AC: 1, 3)
  - [ ] Replace the current single-line input with a multiline control appropriate for Shift+Enter.
  - [ ] Preserve the existing visible send SVG/icon, shared Button styling, accessible label, and disabled/loading behavior; do not add a dependency.
- [ ] Implement keyboard submission (AC: 2–4)
  - [ ] Handle only Enter without Shift and route it to the exact same `onSend` callback used by click.
  - [ ] Allow native newline insertion for Shift+Enter.
  - [ ] Guard whitespace-only, read-only, streaming, and other-action-in-flight states both in the event path and through the disabled button.
- [ ] Preserve chat lifecycle and accessibility (AC: 1–4)
  - [ ] Keep focus behavior, live streaming display, error display, history rendering, and approval read-only behavior unchanged.
  - [ ] Ensure the control has an associated accessible label and a visible focus treatment.
- [ ] Validate the change
  - [ ] Run `npm run build` and `npm run lint` from `frontend/`.
  - [ ] Manually verify click, Enter, Shift+Enter, empty text, approved/read-only, and streaming states.

## Dev Notes

### Current implementation to extend

- `frontend/src/components/ChatPanel.tsx` currently owns the chat input, send button, history, live exchange, and read-only/blocked states. It uses an `<input id="chat-message">`, so a newline-capable control is required for the Shift+Enter criterion.
- `frontend/src/pages/OnboardingDetailPage.tsx` owns `handleSendChat`; keep `ChatPanel` presentation-only and continue invoking the existing callback rather than duplicating API calls.
- `frontend/src/api/client.ts` continues to use `sendChatMessage()` and the existing SSE `ProgressEvent` contract. Do not change the endpoint in this story.
- `frontend/src/components/Button.tsx` supplies disabled opacity/cursor behavior. Preserve it and add only local classes if the send button needs an explicit affordance treatment.

### Required behavior and guardrails

- `canEdit` remains limited to `draft` and `pending_approval`; approved/in-progress/completed chat stays read-only, and blocked chat keeps its retry message.
- The effective disabled state remains `otherActionInFlight || sendingChat`, with an additional empty/whitespace guard for Send. Enter must not bypass these guards.
- Enter without Shift must prevent the browser's default newline only when it is actually submitting a non-empty editable message. Shift+Enter must not call `preventDefault` and must preserve native newline behavior.
- Do not submit on keyup, create a second send handler, or use a global keyboard listener. A native `textarea`/keyboard event handler on the control is sufficient.
- Preserve the existing streamed progress events, `lastSentMessage`, chat error recovery, action-log history, and current record refresh behavior. Outcome semantics belong to Story 3.10 and refresh policy to Story 3.11.
- Keep the send icon visible at all times; the button must not become an icon-only unlabeled control. Use `aria-label="Send message"` and a distinct loading label if retaining the current loading accessibility copy.

### Architecture and project conventions

- React function components and local state/hooks only; strict TypeScript with `import type` for type-only imports.
- Tailwind utility classes only, using tokens from `frontend/src/index.css`; no inline styles or new global state.
- No test framework is configured. Validation is frontend build/lint plus manual keyboard and accessibility checks; do not add Jest/Vitest/Playwright setup.

### Expected files

- Update: `frontend/src/components/ChatPanel.tsx`.
- Read/preserve: `frontend/src/pages/OnboardingDetailPage.tsx`, `frontend/src/api/client.ts`, `frontend/src/api/types.ts`, `frontend/src/components/Button.tsx`.
- No backend, API contract, package manifest, or lockfile changes are expected.

### Previous story and git intelligence

- Stories 3.4–3.8 established Heroicons, tokenized Tailwind styling, dark-mode tokens, visible focus conventions, sticky chat, and local UI state. Reuse these patterns.
- The current send icon is already implemented locally in `ChatPanel.tsx`; extend it rather than replacing it with a new icon library or hand-drawn alternative.
- Recent stories validate with frontend build/lint and preserve the story file plus sprint status. Keep this story scoped to chat submission affordance.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md#Story 3.9: Chat Send Affordance and Keyboard Submission`]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/EXPERIENCE.md#Interaction Primitives`]
- [Source: `_bmad-output/planning-artifacts/ux-designs/ux-onboarding-backoffice-2026-07-23/DESIGN.md#Epic 3 Follow-up Enhancements`]
- [Source: `_bmad-output/project-context.md#Framework-Specific Rules`]
- [Source: `frontend/src/components/ChatPanel.tsx`]
- [Source: `frontend/src/pages/OnboardingDetailPage.tsx`]
- [Reference: MDN keyboard and textarea behavior: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/textarea]

## Dev Agent Record

### Agent Model Used

Codex GPT-5

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story context built from Epic 3, finalized UX contract, project context, current chat/detail implementation, Stories 3.4–3.8, and recent git history.

### File List

- `_bmad-output/implementation-artifacts/3-9-chat-send-affordance-and-keyboard-submission.md`

