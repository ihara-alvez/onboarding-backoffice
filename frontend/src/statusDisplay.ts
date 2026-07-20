import type { OnboardingStatus } from "./api/types";

export function statusTone(status: OnboardingStatus): "primary" | "secondary" | "error" {
  if (status === "ready_for_day_1" || status === "in_progress" || status === "completed") {
    return "primary";
  }
  if (status === "blocked") {
    return "error";
  }
  return "secondary";
}
