import fs from "fs";
import path from "path";
import { OnboardingRecord } from "./types";

const DATA_DIR = path.resolve(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "onboardings.json");

function ensureStore(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]", "utf-8");
}

function readAll(): OnboardingRecord[] {
  ensureStore();
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as OnboardingRecord[];
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
    status: "approved",
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
