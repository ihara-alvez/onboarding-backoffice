import { Router } from "express";
import crypto from "crypto";
import { getProfile, getProject } from "../catalog";
import { buildOnboardingPlan } from "../planBuilder";
import { invokeAgent, runNarrative, NarrativeArgs, NarrativeOutcome } from "../agentCoreClient";
import type { ProgressEvent } from "../types";
import { CHAT_USER_ID, getChatSessionId } from "../chatSession";
import {
  listOnboardings,
  getOnboarding,
  saveOnboarding,
  approveOnboarding,
  deleteOnboarding,
  markCompleted,
  sendForApproval,
  computeApprovalStatus,
  finalizeGeneration,
  finalizeRetry,
  revertToDraft,
  applyChatRevision,
} from "../store";
import type { OnboardingRecord } from "../types";

export const onboardingsRouter = Router();
const chatLocks = new Map<string, Promise<void>>();

onboardingsRouter.get("/", (_req, res) => {
  res.json(listOnboardings());
});

onboardingsRouter.get("/:id", (req, res) => {
  const record = getOnboarding(req.params.id);
  if (!record) {
    res.status(404).json({ error: `Onboarding '${req.params.id}' not found` });
    return;
  }
  res.json(record);
});

function sseWrite(res: import("express").Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

async function withChatLock<T>(id: string, work: () => Promise<T>): Promise<T> {
  const previous = chatLocks.get(id) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  chatLocks.set(id, current);
  await previous;
  try {
    return await work();
  } finally {
    release();
    if (chatLocks.get(id) === current) chatLocks.delete(id);
  }
}

async function streamGeneration(
  res: import("express").Response,
  args: NarrativeArgs,
  buildRecord: (outcome: NarrativeOutcome, events: ProgressEvent[]) => OnboardingRecord,
  onError: (error: string, events: ProgressEvent[]) => void
): Promise<void> {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const collectedEvents: ProgressEvent[] = [];
  const abortController = new AbortController();
  let disconnected = false;
  const handleDisconnect = () => {
    disconnected = true;
    abortController.abort();
  };
  res.once("close", handleDisconnect);
  const onEvent = (event: ProgressEvent) => {
    collectedEvents.push(event);
    sseWrite(res, "progress", event);
  };

  try {
    const narrativeOutcome = await runNarrative(args, onEvent, abortController.signal);
    if (disconnected || abortController.signal.aborted) return;
    const record = buildRecord(narrativeOutcome, collectedEvents);
    sseWrite(res, "done", record);
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unable to generate onboarding";
    try {
      onError(error, collectedEvents);
    } catch {
      // The record may have been deleted while the initial AgentCore stream was active.
    }
    try {
      sseWrite(res, "error", { error });
    } finally {
      res.end();
    }
    return;
  }
  finally {
    res.off("close", handleDisconnect);
  }
  res.end();
}

onboardingsRouter.post("/", async (req, res) => {
  const { employeeName, employeeEmail, profileId, projectId, startDate, buddyEmail, seniority, location, notes } =
    req.body ?? {};
  if (!employeeName || !employeeEmail || !profileId || !projectId) {
    res.status(400).json({ error: "employeeName, employeeEmail, profileId, projectId are required" });
    return;
  }

  if (startDate) {
    try {
      computeApprovalStatus(startDate);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
      return;
    }
  }

  // Validate + build the deterministic parts BEFORE switching to a streaming
  // response, so a bad profile/project id still gets a normal 400 JSON error
  // rather than a malformed SSE stream (headers can't change once sent).
  let profile, project, plan: string;
  try {
    profile = getProfile(profileId);
    project = getProject(projectId);
    plan = buildOnboardingPlan(employeeName, employeeEmail, profile, project);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  const creationTimestamp = new Date().toISOString();
  const recordId = crypto.randomUUID();
  const initialRecord: OnboardingRecord = {
    id: recordId,
    employeeName,
    employeeEmail,
    profileId,
    projectId,
    startDate: startDate || undefined,
    buddyEmail: buddyEmail || undefined,
    seniority: seniority || undefined,
    location: location || undefined,
    notes: notes || undefined,
    createdAt: creationTimestamp,
    status: "blocked",
    plan,
    narrative: null,
    narrativeError: "Generation in progress",
    events: [],
    actionLog: [
      {
        id: crypto.randomUUID(),
        timestamp: creationTimestamp,
        actor: "system",
        type: "status_change",
        message: "Generation in progress",
        toStatus: "blocked",
      },
    ],
    profile,
    project,
  };

  try {
    saveOnboarding(initialRecord);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Unable to save onboarding" });
    return;
  }

  await streamGeneration(
    res,
    { employeeName, employeeEmail, profileId, projectId },
    (narrativeOutcome, events) => finalizeGeneration(recordId, plan, narrativeOutcome, events),
    (error, events) => {
      finalizeGeneration(recordId, plan, { ok: false, error }, events);
    }
  );
});

onboardingsRouter.post("/:id/retry", async (req, res) => {
  let existing: OnboardingRecord | undefined;
  try {
    existing = getOnboarding(req.params.id);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Unable to load onboarding" });
    return;
  }
  if (!existing) {
    res.status(404).json({ error: `Onboarding '${req.params.id}' not found` });
    return;
  }
  if (existing.status !== "blocked") {
    res.status(409).json({ error: "Cannot retry generation: onboarding is not blocked" });
    return;
  }

  let plan: string;
  try {
    plan = buildOnboardingPlan(existing.employeeName, existing.employeeEmail, existing.profile, existing.project);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  await streamGeneration(
    res,
    {
      employeeName: existing.employeeName,
      employeeEmail: existing.employeeEmail,
      profileId: existing.profileId,
      projectId: existing.projectId,
    },
    (narrativeOutcome, events) => finalizeRetry(req.params.id, plan, narrativeOutcome, events),
    (error, events) => {
      finalizeRetry(req.params.id, plan, { ok: false, error }, events);
    }
  );
});

onboardingsRouter.post("/:id/chat", async (req, res) => {
  const id = req.params.id;
  const message = req.body?.message;
  if (typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  let existing: OnboardingRecord | undefined;
  try {
    existing = getOnboarding(id);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Unable to load onboarding" });
    return;
  }
  if (!existing) {
    res.status(404).json({ error: `Onboarding '${id}' not found` });
    return;
  }
  if (existing.status !== "draft" && existing.status !== "pending_approval") {
    res.status(409).json({ error: "Cannot revise plan: onboarding is not a draft or pending approval" });
    return;
  }
  await withChatLock(id, async () => {
    const current = getOnboarding(id);
    if (!current) {
      res.status(404).json({ error: `Onboarding '${id}' not found` });
      return;
    }
    if (current.status !== "draft" && current.status !== "pending_approval") {
      res.status(409).json({ error: "Cannot revise plan: onboarding is not a draft or pending approval" });
      return;
    }

    let chatRecord = current;
    if (current.status === "pending_approval") {
      const reverted = revertToDraft(id, "Chat message sent while pending approval");
      if (!reverted.ok) {
        res.status(reverted.code === "not_found" ? 404 : 409).json({ error: reverted.error });
        return;
      }
      chatRecord = reverted.record;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const abortController = new AbortController();
    let disconnected = false;
    const handleDisconnect = () => {
      disconnected = true;
      abortController.abort();
    };
    res.once("close", handleDisconnect);

    try {
      const prompt = `The manager wants to revise the onboarding plan for employee '${chatRecord.employeeName}' (email ${chatRecord.employeeEmail}), profile '${chatRecord.profileId}', project '${chatRecord.projectId}'.

Current plan:
${chatRecord.narrative ?? ""}

Requested change: ${message}

Use the load_profile and load_project tools to reload the data, then use generate_onboarding_plan to produce the REVISED plan in Markdown, reflecting the requested change. Show me the full updated plan.`;
      const sessionId = getChatSessionId(chatRecord.id);
      const outcome = await invokeAgent(
        {
          prompt,
          userId: CHAT_USER_ID,
          sessionId,
          modelId: "anthropic.claude-haiku-4-5",
          modelApi: "messages",
          guardrailId: process.env.AGENTCORE_GUARDRAIL_ID ?? "wb4578p8755b",
          guardrailVersion: process.env.AGENTCORE_GUARDRAIL_VERSION ?? "1",
          guardrailEnabled: true,
        },
        sessionId,
        (event) => {
          if (!disconnected) sseWrite(res, "progress", event);
        },
        abortController.signal
      );
      if (disconnected || abortController.signal.aborted) return;

      const result = applyChatRevision(id, message, outcome);
      if (result.kind === "deleted") return;
      if (result.kind === "failed") {
        sseWrite(res, "error", { error: result.error });
        return;
      }
      sseWrite(res, "done", result.record);
    } catch (err) {
      if (!disconnected) sseWrite(res, "error", { error: err instanceof Error ? err.message : "Unable to revise plan" });
    } finally {
      res.off("close", handleDisconnect);
      res.end();
    }
  });
});

onboardingsRouter.post("/:id/complete", (req, res) => {
  try {
    const result = markCompleted(req.params.id);
    if (!result.ok) {
      res.status(result.code === "not_found" ? 404 : 409).json({ error: result.error });
      return;
    }
    res.json(result.record);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Unable to mark onboarding complete" });
  }
});

onboardingsRouter.post("/:id/approve", (req, res) => {
  try {
    const result = approveOnboarding(req.params.id);
    if (!result.ok) {
      res.status(result.code === "not_found" ? 404 : 409).json({ error: result.error });
      return;
    }
    res.json(result.record);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Unable to approve onboarding" });
  }
});

onboardingsRouter.post("/:id/send-for-approval", (req, res) => {
  try {
    const result = sendForApproval(req.params.id);
    if (!result.ok) {
      res.status(result.code === "not_found" ? 404 : 409).json({ error: result.error });
      return;
    }
    res.json(result.record);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Unable to send onboarding for approval" });
  }
});

onboardingsRouter.delete("/:id", (req, res) => {
  const deleted = deleteOnboarding(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: `Onboarding '${req.params.id}' not found` });
    return;
  }
  res.status(204).end();
});
