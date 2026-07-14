import { Profile, Project } from "./types";

const bullet = (items: string[] = []): string => items.map((i) => `- ${i}`).join("\n");

export function buildOnboardingPlan(
  employeeName: string,
  employeeEmail: string,
  profile: Profile,
  project: Project
): string {
  const repos = project.repositories ?? [];
  const perms: Profile["permissions"] = profile.permissions ?? {
    aws: [],
    repositories: { access: "pending" },
    ci_cd: [],
  };
  const checklist: Profile["base_checklist"] = profile.base_checklist ?? { day_1: [], week_1: [] };

  const repoSections = repos.map(
    (repo) =>
      `### ${repo.name}\n` +
      `${repo.description ?? ""}\n\n` +
      "```bash\n" +
      `git clone ${repo.clone_url ?? "<clone-url-pending>"}\n` +
      `cd ${repo.name}\n` +
      `${repo.bootstrap ?? "# bootstrap pending"}\n` +
      `${repo.test ?? "# test command pending"}\n` +
      "```"
  );

  const plan = `# Onboarding plan - ${employeeName}

**Employee:** ${employeeName}
**Email:** ${employeeEmail}
**Profile:** ${profile.name ?? profile.id}
**Project:** ${project.name ?? project.id}

## Project business goal

${project.business_goal ?? "Pending documentation."}

## Architecture summary

${project.architecture_summary ?? "Pending documentation."}

## Expected permissions

### AWS
${bullet(perms.aws)}

### Repositories
- Expected access: ${perms.repositories?.access ?? "pending"}

### CI/CD
${bullet(perms.ci_cd)}

## Repositories to clone

${repoSections.join("\n")}

## Day 1 checklist

${bullet(checklist.day_1)}

## Week 1 checklist

${bullet(checklist.week_1)}

## Suggested first tasks

${bullet(project.first_tasks)}

## Suggested documentation

${bullet(project.key_docs)}

## Approvals and risks

### Approvals required by profile
${bullet(profile.approvals_required)}

### Project risk notes
${bullet(project.risk_notes)}

## MVP status

This plan was generated with local declarative data. In the production version, these steps can be connected to IAM Identity Center, real repos, pipelines and DynamoDB.
`;
  return plan.trim() + "\n";
}
