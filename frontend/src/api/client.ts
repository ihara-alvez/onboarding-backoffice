import type {
  CreateOnboardingRequest,
  OnboardingRecord,
  ProfileSummary,
  ProgressEvent,
  ProjectSummary,
} from "./types";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.error ?? message;
    } catch {
      // ignore parse failure, fall back to statusText
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export function listProfiles(): Promise<ProfileSummary[]> {
  return fetch("/api/profiles").then((r) => handle<ProfileSummary[]>(r));
}

export function listProjects(): Promise<ProjectSummary[]> {
  return fetch("/api/projects").then((r) => handle<ProjectSummary[]>(r));
}

export function listOnboardings(): Promise<OnboardingRecord[]> {
  return fetch("/api/onboardings").then((r) => handle<OnboardingRecord[]>(r));
}

export function getOnboarding(id: string): Promise<OnboardingRecord> {
  return fetch(`/api/onboardings/${id}`).then((r) => handle<OnboardingRecord>(r));
}

export function createOnboarding(body: CreateOnboardingRequest): Promise<OnboardingRecord> {
  return fetch("/api/onboardings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => handle<OnboardingRecord>(r));
}

/**
 * Creates an onboarding while streaming live progress events (tool calls,
 * reasoning, streamed text) as they happen server-side, via Server-Sent
 * Events on the POST response body. `onProgress` fires once per event;
 * the returned promise resolves with the final record once the "done"
 * event arrives, or rejects on a non-2xx response or a malformed stream.
 */
export async function createOnboardingWithProgress(
  body: CreateOnboardingRequest,
  onProgress: (event: ProgressEvent) => void
): Promise<OnboardingRecord> {
  return streamRequest<OnboardingRecord>("/api/onboardings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, onProgress);
}

async function streamRequest<T>(
  url: string,
  options: RequestInit,
  onProgress: (event: ProgressEvent) => void
): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    return handle<T>(res);
  }
  if (!res.body) {
    throw new Error("Streaming response has no body (unsupported environment)");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line; each frame has "event: X" and "data: Y" lines.
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        const eventLine = frame.split("\n").find((l) => l.startsWith("event: "));
        const dataLine = frame.split("\n").find((l) => l.startsWith("data: "));
        if (!eventLine || !dataLine) continue;
        const eventName = eventLine.slice("event: ".length).trim();
        const data = JSON.parse(dataLine.slice("data: ".length));

        if (eventName === "progress") {
          onProgress(data as ProgressEvent);
        } else if (eventName === "done") {
          return data as T;
        } else if (eventName === "error") {
          const errorData = data as { error?: unknown };
          throw new Error(typeof errorData.error === "string" ? errorData.error : "Unable to complete streaming request");
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }

  throw new Error("Stream ended without a completion event");
}

export function retryGeneration(id: string, onProgress: (event: ProgressEvent) => void): Promise<OnboardingRecord> {
  return streamRequest<OnboardingRecord>(`/api/onboardings/${id}/retry`, { method: "POST" }, onProgress);
}

export function sendChatMessage(
  id: string,
  message: string,
  onProgress: (event: ProgressEvent) => void
): Promise<OnboardingRecord> {
  return streamRequest<OnboardingRecord>(
    `/api/onboardings/${id}/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    },
    onProgress
  );
}

export function markCompleted(id: string): Promise<OnboardingRecord> {
  return fetch(`/api/onboardings/${id}/complete`, { method: "POST" }).then((r) =>
    handle<OnboardingRecord>(r)
  );
}

export function approveOnboarding(id: string): Promise<OnboardingRecord> {
  return fetch(`/api/onboardings/${id}/approve`, { method: "POST" }).then((r) =>
    handle<OnboardingRecord>(r)
  );
}

export function sendForApproval(id: string): Promise<OnboardingRecord> {
  return fetch(`/api/onboardings/${id}/send-for-approval`, { method: "POST" }).then((r) =>
    handle<OnboardingRecord>(r)
  );
}

export async function deleteOnboarding(id: string): Promise<void> {
  const res = await fetch(`/api/onboardings/${id}`, { method: "DELETE" });
  if (!res.ok) {
    await handle(res);
  }
}
