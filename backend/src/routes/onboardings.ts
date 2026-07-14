import { Router } from "express";
import crypto from "crypto";
import { getProfile, getProject } from "../catalog";
import { buildOnboardingPlan } from "../planBuilder";
import { runNarrative, ProgressEvent } from "../pythonBridge";
import { listOnboardings, getOnboarding, saveOnboarding, approveOnboarding, deleteOnboarding } from "../store";
import { OnboardingRecord } from "../types";

export const onboardingsRouter = Router();

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

onboardingsRouter.post("/", async (req, res) => {
  const { employeeName, employeeEmail, profileId, projectId } = req.body ?? {};
  if (!employeeName || !employeeEmail || !profileId || !projectId) {
    res.status(400).json({ error: "employeeName, employeeEmail, profileId, projectId are required" });
    return;
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

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const collectedEvents: ProgressEvent[] = [];
  const onEvent = (event: ProgressEvent) => {
    collectedEvents.push(event);
    sseWrite(res, "progress", event);
  };

  // Isolate the risky agent call: onboarding creation must succeed even if this fails/times out.
  const narrativeOutcome = await runNarrative({ employeeName, employeeEmail, profileId, projectId }, onEvent);

  const record: OnboardingRecord = {
    id: crypto.randomUUID(),
    employeeName,
    employeeEmail,
    profileId,
    projectId,
    createdAt: new Date().toISOString(),
    status: "created",
    plan,
    narrative: narrativeOutcome.ok ? narrativeOutcome.narrative : null,
    narrativeError: narrativeOutcome.ok ? undefined : narrativeOutcome.error,
    events: collectedEvents,
    profile,
    project,
  };

  saveOnboarding(record);
  sseWrite(res, "done", record);
  res.end();
});

onboardingsRouter.post("/:id/approve", (req, res) => {
  const existing = getOnboarding(req.params.id);
  if (!existing) {
    res.status(404).json({ error: `Onboarding '${req.params.id}' not found` });
    return;
  }
  if (existing.status === "approved") {
    res.json(existing);
    return;
  }
  const updated = approveOnboarding(req.params.id);
  res.json(updated);
});

onboardingsRouter.delete("/:id", (req, res) => {
  const deleted = deleteOnboarding(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: `Onboarding '${req.params.id}' not found` });
    return;
  }
  res.status(204).end();
});
