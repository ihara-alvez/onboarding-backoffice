import fs from "fs";
import path from "path";
import { ActionLogEntry, OnboardingRecord, OnboardingStatus } from "./types";

const DATA_DIR = path.resolve(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "onboardings.json");
const VALID_STATUSES = new Set<OnboardingStatus>([
  "draft",
  "pending_approval",
  "ready_for_day_1",
  "in_progress",
  "blocked",
  "completed",
]);

// Shape of a record as it may actually exist on disk: `status` may still be a
// legacy value ("created"/"approved") predating the six-state model, and
// `actionLog` may be entirely absent on records written before it existed.
type RawOnboardingRecord = Omit<OnboardingRecord, "status" | "actionLog"> & {
  status: string;
  actionLog?: ActionLogEntry[];
};

// Migrates a legacy record to the current six-state model and ensures
// `actionLog` defaults to `[]`. Idempotent: already-migrated records pass
// through unchanged. Called on every read inside `readAll()` rather than a
// one-off migration script (this app has no migration runner) — the next
// `writeAll()` from any caller persists the migrated value going forward.
function normalizeRecord(raw: RawOnboardingRecord): OnboardingRecord {
  let status: OnboardingStatus;
  if (raw.status === "created") {
    status = "draft";
  } else if (raw.status === "approved") {
    const hasFutureOrNoStartDate = !raw.startDate || new Date(raw.startDate).getTime() > Date.now();
    status = hasFutureOrNoStartDate ? "ready_for_day_1" : "in_progress";
  } else if (VALID_STATUSES.has(raw.status as OnboardingStatus)) {
    status = raw.status as OnboardingStatus;
  } else {
    throw new Error(`Invalid onboarding status: ${raw.status}`);
  }
  return { ...raw, status, actionLog: raw.actionLog ?? [] };
}

function ensureStore(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]", "utf-8");
}

function readAll(): OnboardingRecord[] {
  ensureStore();
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as RawOnboardingRecord[];
  return raw.map(normalizeRecord);
}

function writeAll(records: OnboardingRecord[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), "utf-8");
}

export const listOnboardings = (): OnboardingRecord[] =>
  readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const getOnboarding = (id: string): OnboardingRecord | undefined =>
  readAll().find((r) => r.id === id);

export function saveOnboarding(record: OnboardingRecord): void {
  const all = readAll();
  all.push(record);
  writeAll(all);
}

export function approveOnboarding(id: string): OnboardingRecord | undefined {
  const all = readAll();
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) return undefined;
  const now = new Date().toISOString();
  all[idx] = {
    ...all[idx],
    // Placeholder — Story 1.4 replaces this with real start_date-conditional
    // branching between "ready_for_day_1" and "in_progress".
    status: "ready_for_day_1",
    approvedAt: now,
    notification: { sentTo: all[idx].employeeEmail, sentAt: now, channel: "email (simulated)" },
  };
  writeAll(all);
  return all[idx];
}

export function deleteOnboarding(id: string): boolean {
  const all = readAll();
  const remaining = all.filter((r) => r.id !== id);
  if (remaining.length === all.length) return false;
  writeAll(remaining);
  return true;
}
