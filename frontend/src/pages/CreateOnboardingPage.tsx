import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createOnboardingWithProgress, listProfiles, listProjects } from "../api/client";
import type { ProfileSummary, ProgressEvent, ProjectSummary } from "../api/types";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ProgressLog } from "../components/ProgressLog";
import { Select } from "../components/Select";
import { TextField } from "../components/TextField";

export function CreateOnboardingPage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [employeeName, setEmployeeName] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [profileId, setProfileId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listProfiles(), listProjects()])
      .then(([p, j]) => {
        setProfiles(p);
        setProjects(j);
      })
      .catch((err) => setError(err.message));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEvents([]);
    setSubmitting(true);
    try {
      const record = await createOnboardingWithProgress(
        { employeeName, employeeEmail, profileId, projectId },
        (event) => setEvents((prev) => [...prev, event])
      );
      navigate(`/onboardings/${record.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  if (submitting) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <h1 className="mb-2 text-headline-small font-medium text-on-surface">
          Generating onboarding plan
        </h1>
        <p className="text-body-medium text-on-surface-variant">
          Live from the Strands agent (agent/strands_agent.py) via Amazon Bedrock — not a canned response.
        </p>
        <ProgressLog events={events} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-headline-small font-medium text-on-surface">New onboarding</h1>

      {error && <Card tint="error" className="mb-4">{error}</Card>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <TextField
          label="Employee name"
          required
          value={employeeName}
          onChange={(e) => setEmployeeName(e.target.value)}
        />
        <TextField
          label="Employee email"
          type="email"
          required
          value={employeeEmail}
          onChange={(e) => setEmployeeEmail(e.target.value)}
        />
        <Select
          label="Profile"
          required
          placeholder="Select a profile"
          value={profileId}
          onChange={(e) => setProfileId(e.target.value)}
          options={profiles.map((p) => ({ value: p.id, label: p.name }))}
        />
        <Select
          label="Project"
          required
          placeholder="Select a project"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
        />
        <Button type="submit" className="mt-2 self-start">
          Create onboarding
        </Button>
      </form>
    </div>
  );
}
