export interface ProfileRepoAccess {
  access: string;
}

export interface ProfilePermissions {
  aws: string[];
  repositories: ProfileRepoAccess;
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

export interface ProfileSummary {
  id: string;
  name: string;
  summary: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  business_goal: string;
}

export interface NotificationRecord {
  sentTo: string;
  sentAt: string;
  channel: string;
}

export type OnboardingStatus = "created" | "approved";

export type ProgressEvent =
  | { type: "status"; message: string }
  | { type: "tool_call"; tool: string; count: number }
  | { type: "reasoning"; text: string }
  | { type: "text"; text: string; complete: boolean };

export interface OnboardingRecord {
  id: string;
  employeeName: string;
  employeeEmail: string;
  profileId: string;
  projectId: string;
  createdAt: string;
  status: OnboardingStatus;
  approvedAt?: string;
  notification?: NotificationRecord;
  plan: string;
  narrative: string | null;
  narrativeError?: string;
  // optional: records saved before this field existed won't have it
  events?: ProgressEvent[];
  profile: Profile;
  project: Project;
}

export interface CreateOnboardingRequest {
  employeeName: string;
  employeeEmail: string;
  profileId: string;
  projectId: string;
}
