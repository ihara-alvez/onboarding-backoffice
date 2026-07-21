export interface RepoAccess {
  access: string;
}

export interface ProfilePermissions {
  aws: string[];
  repositories: RepoAccess;
  ci_cd: string[];
}

export interface BaseChecklist {
  day_1: string[];
  week_1: string[];
}

export interface Profile {
  id: string;
  name: string;
  summary: string;
  permissions: ProfilePermissions;
  base_checklist: BaseChecklist;
  approvals_required: string[];
}

export interface ProjectRepo {
  name: string;
  description: string;
  clone_url: string;
  bootstrap: string;
  test: string;
}

export interface Project {
  id: string;
  name: string;
  business_goal: string;
  architecture_summary: string;
  repositories: ProjectRepo[];
  key_docs: string[];
  first_tasks: string[];
  risk_notes: string[];
}

export interface NotificationRecord {
  sentTo: string;
  sentAt: string;
  channel: string;
}

export type OnboardingStatus =
  | "draft"
  | "pending_approval"
  | "ready_for_day_1"
  | "in_progress"
  | "blocked"
  | "completed";

export type ProgressEvent =
  | { type: "status"; message: string }
  | { type: "tool_call"; tool: string; count: number }
  | { type: "reasoning"; text: string }
  | { type: "text"; text: string; complete: boolean };

export type ActionLogEntryType =
  | "status_change"
  | "approve"
  | "delete"
  | "chat_message"
  | "generation_failure"
  | "retry";

export interface ActionLogEntry {
  id: string;
  timestamp: string; // ISO 8601
  actor: "manager" | "system";
  type: ActionLogEntryType;
  message: string;
  fromStatus?: OnboardingStatus;
  toStatus?: OnboardingStatus;
}

export interface OnboardingRecord {
  id: string;
  employeeName: string;
  employeeEmail: string;
  profileId: string;
  projectId: string;
  startDate?: string;
  buddyEmail?: string;
  seniority?: string;
  location?: string;
  notes?: string;
  createdAt: string;
  status: OnboardingStatus;
  approvedAt?: string;
  notification?: NotificationRecord;
  plan: string;
  narrative: string | null;
  narrativeError?: string;
  events: ProgressEvent[];
  actionLog: ActionLogEntry[];
  profile: Profile;
  project: Project;
}
