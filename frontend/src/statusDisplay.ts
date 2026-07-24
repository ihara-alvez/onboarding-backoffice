import type { OnboardingStatus } from "./api/types";

export function isApprovedStatus(status: OnboardingStatus): boolean {
  return status === "ready_for_day_1" || status === "in_progress" || status === "completed";
}

export function statusTone(status: OnboardingStatus): "primary" | "secondary" | "error" | "review" {
  if (isApprovedStatus(status)) {
    return "primary";
  }
  if (status === "blocked") {
    return "error";
  }
  if (status === "pending_approval") {
    return "review";
  }
  return "secondary";
}
