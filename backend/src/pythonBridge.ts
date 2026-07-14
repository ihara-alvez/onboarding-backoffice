import { spawn } from "child_process";
import path from "path";
import { DAYONE_REPO_PATH } from "./catalog";
import { ProgressEvent } from "./types";

const PYTHON_EXECUTABLE = path.join(DAYONE_REPO_PATH, ".venv", "bin", "python3");
const BRIDGE_SCRIPT = path.resolve(__dirname, "..", "python-bridge", "run_narrative.py");
const NARRATIVE_TIMEOUT_MS = 40_000;

export interface NarrativeArgs {
  employeeName: string;
  employeeEmail: string;
  profileId: string;
  projectId: string;
}

export type NarrativeOutcome = { ok: true; narrative: string } | { ok: false; error: string };

export type { ProgressEvent };

/**
 * Runs the Python bridge and relays each stderr NDJSON line to `onEvent` as it
 * arrives (not just at the end) — this is what lets the frontend show live
 * progress instead of a blind spinner. stdout is still buffered and parsed
 * once, as a single JSON blob, exactly as before.
 */
export function runNarrative(
  args: NarrativeArgs,
  onEvent?: (event: ProgressEvent) => void
): Promise<NarrativeOutcome> {
  return new Promise((resolve) => {
    const child = spawn(
      PYTHON_EXECUTABLE,
      [
        BRIDGE_SCRIPT,
        "--employee",
        args.employeeName,
        "--email",
        args.employeeEmail,
        "--profile",
        args.profileId,
        "--project",
        args.projectId,
      ],
      {
        cwd: DAYONE_REPO_PATH,
        env: { ...process.env, DAYONE_REPO_PATH },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    let stdout = "";
    let stderrBuffer = ""; // holds an incomplete trailing line between "data" events
    let stderrTail = ""; // last ~2000 chars, kept for error reporting on failure
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, NARRATIVE_TIMEOUT_MS);

    child.stdout.on("data", (c) => {
      stdout += c.toString("utf-8");
    });

    child.stderr.on("data", (c) => {
      const chunk = c.toString("utf-8");
      stderrTail = (stderrTail + chunk).slice(-2000);
      stderrBuffer += chunk;
      const lines = stderrBuffer.split("\n");
      stderrBuffer = lines.pop() ?? ""; // keep the last, possibly-incomplete line
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          onEvent?.(JSON.parse(trimmed) as ProgressEvent);
        } catch {
          // a non-JSON stray line on stderr (e.g. a Python warning) — ignore for
          // the live feed, it's still captured in stderrTail for error reporting.
        }
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ ok: false, error: `Failed to spawn python-bridge: ${err.message}` });
    });

    child.on("close", () => {
      clearTimeout(timer);
      if (timedOut) {
        resolve({ ok: false, error: `Narrative generation timed out after ${NARRATIVE_TIMEOUT_MS}ms` });
        return;
      }
      let parsed: { narrative?: string; error?: string } | null = null;
      try {
        parsed = JSON.parse(stdout.trim());
      } catch {
        // fall through
      }
      if (parsed && typeof parsed.narrative === "string") {
        resolve({ ok: true, narrative: parsed.narrative });
        return;
      }
      const reason = parsed?.error ?? (stderrTail.trim() || "unknown error");
      resolve({ ok: false, error: `python-bridge failed: ${reason}` });
    });
  });
}
