import assert from "node:assert/strict";
import { test } from "node:test";
import { CHAT_USER_ID, getChatSessionId } from "./chatSession";

test("uses the fixed manager id and onboarding id for chat sessions", () => {
  const onboardingId = "2b6f7b73-748a-4c0c-b6b7-e8de18ab0b7b";

  assert.equal(CHAT_USER_ID, "backoffice-manager");
  assert.equal(getChatSessionId(onboardingId), onboardingId);
});

test("keeps different onboarding chats isolated by session id", () => {
  const firstOnboardingId = "2b6f7b73-748a-4c0c-b6b7-e8de18ab0b7b";
  const secondOnboardingId = "a7f25b1f-29f7-4ce4-9a1b-c3e5ee2a6e34";

  assert.notEqual(getChatSessionId(firstOnboardingId), getChatSessionId(secondOnboardingId));
});
