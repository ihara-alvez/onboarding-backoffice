import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  approveOnboarding,
  deleteOnboarding,
  getOnboarding,
  markCompleted,
  retryGeneration,
  sendChatMessage,
  sendForApproval,
} from "../api/client";
import type { OnboardingRecord, OnboardingStatus, ProgressEvent } from "../api/types";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Chip } from "../components/Chip";
import { Collapsible } from "../components/Collapsible";
import { IconButton } from "../components/IconButton";
import { Markdown } from "../components/Markdown";
import { ProgressLog } from "../components/ProgressLog";
import { Spinner } from "../components/Spinner";
import { TextField } from "../components/TextField";
import { TrashIcon } from "../components/TrashIcon";
import { isApprovedStatus, statusTone } from "../statusDisplay";

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-body-medium text-on-surface-variant">None.</p>;
  }
  return (
    <ul className="list-disc space-y-1 pl-5 text-body-medium text-on-surface">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-title-medium font-medium text-on-surface">{children}</h2>;
}

interface ProgressEntry {
  status: OnboardingStatus;
  timestamp: string;
}

/** Derives the Progress timeline from actionLog, plus (if applicable) the
 * synthetic read-time ready_for_day_1 -> in_progress flip, which is never
 * itself written to actionLog (see Story 1.4). */
function buildProgressEntries(record: OnboardingRecord): ProgressEntry[] {
  const entries: ProgressEntry[] = record.actionLog
    .filter((entry) => entry.toStatus !== undefined)
    .map((entry) => ({ status: entry.toStatus as OnboardingStatus, timestamp: entry.timestamp }));

  const hasLoggedInProgress = entries.some((entry) => entry.status === "in_progress");
  const hasReadyForDayOne = entries.some((entry) => entry.status === "ready_for_day_1");
  if (
    (record.status === "in_progress" || record.status === "completed") &&
    !hasLoggedInProgress &&
    hasReadyForDayOne &&
    record.startDate
  ) {
    const syntheticEntry = { status: "in_progress" as const, timestamp: record.startDate };
    const completedIndex = entries.findIndex((entry) => entry.status === "completed");
    if (completedIndex === -1) {
      entries.push(syntheticEntry);
    } else {
      entries.splice(completedIndex, 0, syntheticEntry);
    }
  }

  return entries;
}

function formatProgressTimestamp(timestamp: string): string {
  const value = /^\d{4}-\d{2}-\d{2}$/.test(timestamp) ? `${timestamp}T00:00:00` : timestamp;
  return new Date(value).toLocaleString();
}

export function OnboardingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<OnboardingRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [sendingForApproval, setSendingForApproval] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [chatEvents, setChatEvents] = useState<ProgressEvent[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getOnboarding(id)
      .then(setRecord)
      .catch((err) => setError(err.message));
  }, [id]);

  async function handleApprove() {
    if (!id) return;
    setApproving(true);
    try {
      const updated = await approveOnboarding(id);
      navigate("/", {
        state: {
          toastMessage: `Approved and sent to ${updated.employeeEmail}.`,
        },
      });
    } catch (err) {
      setError((err as Error).message);
      setApproving(false);
    }
  }

  async function handleSendForApproval() {
    if (!id) return;
    setSendingForApproval(true);
    try {
      const updated = await sendForApproval(id);
      setRecord(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSendingForApproval(false);
    }
  }

  async function handleDelete() {
    if (!id || !record) return;
    if (!window.confirm(`Delete the onboarding for ${record.employeeName}? This can't be undone.`)) {
      return;
    }
    setDeleting(true);
    try {
      await deleteOnboarding(id);
      navigate("/");
    } catch (err) {
      setError((err as Error).message);
      setDeleting(false);
    }
  }

  async function handleRetry() {
    if (!id) return;
    setRetrying(true);
    try {
      const updated = await retryGeneration(id, () => undefined);
      setRecord(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRetrying(false);
    }
  }

  async function handleComplete() {
    if (!id) return;
    setCompleting(true);
    try {
      const updated = await markCompleted(id);
      setRecord(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCompleting(false);
    }
  }

  async function handleSendChat() {
    if (!id || !chatMessage.trim()) return;
    setSendingChat(true);
    setChatError(null);
    setChatEvents([]);
    try {
      const updated = await sendChatMessage(id, chatMessage, (event) =>
        setChatEvents((prev) => [...prev, event])
      );
      setRecord(updated);
      setChatMessage("");
    } catch (err) {
      setChatError((err as Error).message);
    } finally {
      setSendingChat(false);
    }
  }

  if (error) {
    return (
      <div className="p-8">
        <Card tint="error">{error}</Card>
      </div>
    );
  }

  if (!record) {
    return <Spinner label="Loading onboarding..." />;
  }

  const { profile, project } = record;
  const progressEntries = buildProgressEntries(record);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-headline-small font-medium text-on-surface">{record.employeeName}</h1>
          <p className="text-body-medium text-on-surface-variant">
            {record.employeeEmail} &middot; {profile.name} &middot; {project.name}
          </p>
          <p className="text-body-medium text-on-surface-variant">
            Created {new Date(record.createdAt).toLocaleString()}
          </p>
        </div>
        <Chip tone={statusTone(record.status)}>{record.status}</Chip>
      </div>

      {(record.startDate || record.buddyEmail || record.seniority || record.location || record.notes) && (
        <Card className="mb-6">
          <SectionTitle>Additional details</SectionTitle>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-body-medium">
            {record.startDate && (
              <>
                <dt className="text-on-surface-variant">Start date</dt>
                <dd className="text-on-surface">{record.startDate}</dd>
              </>
            )}
            {record.buddyEmail && (
              <>
                <dt className="text-on-surface-variant">Buddy</dt>
                <dd className="text-on-surface">{record.buddyEmail}</dd>
              </>
            )}
            {record.seniority && (
              <>
                <dt className="text-on-surface-variant">Seniority</dt>
                <dd className="text-on-surface">{record.seniority}</dd>
              </>
            )}
            {record.location && (
              <>
                <dt className="text-on-surface-variant">Location</dt>
                <dd className="text-on-surface">{record.location}</dd>
              </>
            )}
            {record.notes && (
              <>
                <dt className="text-on-surface-variant">Notes</dt>
                <dd className="col-span-2 text-on-surface">{record.notes}</dd>
              </>
            )}
          </dl>
        </Card>
      )}

      {record.notification && (
        <Card tint="primary" className="mb-6">
          Sent to <strong>{record.notification.sentTo}</strong> at{" "}
          {new Date(record.notification.sentAt).toLocaleTimeString()}.
        </Card>
      )}

      <Card className="mb-6">
        <SectionTitle>Progress</SectionTitle>
        <div className="flex flex-col gap-2">
          {progressEntries.map((entry, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-body-medium text-on-surface-variant">
                {formatProgressTimestamp(entry.timestamp)}
              </span>
              <Chip tone={statusTone(entry.status)}>{entry.status}</Chip>
            </div>
          ))}
        </div>
      </Card>

      <Card tint="primary" className="mb-6">
        <p className="mb-2 text-label-large font-medium text-on-primary-container/80">
          Generated by Strands Agent (Amazon Bedrock)
        </p>
        {record.narrative ? (
          <Markdown>{record.narrative}</Markdown>
        ) : (
          <p className="text-body-medium italic">
            Agent narrative unavailable: {record.narrativeError}
          </p>
        )}
      </Card>

      {record.events && record.events.length > 0 && (
        <Card className="mb-6">
          <Collapsible label={`Agent console (${record.events.length} messages)`}>
            <ProgressLog events={record.events} live={false} />
          </Collapsible>
        </Card>
      )}

      <Card className="mb-6">
        <Collapsible label={`Action log (${record.actionLog.length} entries)`}>
          <div className="flex flex-col gap-2">
            {record.actionLog.map((entry) => (
              <div key={entry.id} className="text-body-medium">
                <span className="text-on-surface-variant">
                  {new Date(entry.timestamp).toLocaleString()} &middot;{" "}
                  {entry.actor === "manager" ? "Manager" : "System"} &middot;{" "}
                </span>
                <span className="text-on-surface">{entry.message}</span>
              </div>
            ))}
          </div>
        </Collapsible>
      </Card>

      {record.status !== "blocked" && (
        <Card className="mb-6">
          <Collapsible label="Revise plan via chat">
            {record.status === "draft" || record.status === "pending_approval" ? (
              <div className="flex flex-col gap-3">
                <TextField
                  label="Message"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  disabled={sendingChat}
                  placeholder="e.g. drop the internal-tools repo, they won't touch it in month one"
                />
                <Button
                  onClick={handleSendChat}
                  disabled={sendingChat || !chatMessage.trim()}
                  className="self-start"
                >
                  {sendingChat ? "Sending..." : "Send"}
                </Button>
                {chatError && <Card tint="error">{chatError}</Card>}
                {chatEvents.length > 0 && <ProgressLog events={chatEvents} live={sendingChat} />}
              </div>
            ) : (
              <p className="text-body-medium text-on-surface-variant">
                Chat is read-only for this onboarding.
              </p>
            )}
          </Collapsible>
        </Card>
      )}

      <Card className="mb-6">
        <SectionTitle>Repositories</SectionTitle>
        <div className="flex flex-col gap-4">
          {project.repositories.map((repo) => (
            <div key={repo.name}>
              <p className="font-medium text-on-surface">{repo.name}</p>
              <p className="mb-2 text-body-medium text-on-surface-variant">{repo.description}</p>
              <pre className="overflow-x-auto rounded-xs bg-surface-variant p-3 text-body-medium text-on-surface-variant">
{`git clone ${repo.clone_url}
cd ${repo.name}
${repo.bootstrap}
${repo.test}`}
              </pre>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-6">
        <SectionTitle>{isApprovedStatus(record.status) ? "Approved Permissions" : "Requested Permissions"}</SectionTitle>
        <p className="mb-1 text-label-large text-on-surface-variant">AWS</p>
        <BulletList items={profile.permissions.aws} />
        <p className="mb-1 mt-4 text-label-large text-on-surface-variant">Repository access</p>
        <p className="text-body-medium text-on-surface">{profile.permissions.repositories.access}</p>
        <p className="mb-1 mt-4 text-label-large text-on-surface-variant">CI/CD</p>
        <BulletList items={profile.permissions.ci_cd} />
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <Card>
          <SectionTitle>Day 1 checklist</SectionTitle>
          <BulletList items={profile.base_checklist.day_1} />
        </Card>
        <Card>
          <SectionTitle>Week 1 checklist</SectionTitle>
          <BulletList items={profile.base_checklist.week_1} />
        </Card>
      </div>

      <Card className="mb-6">
        <SectionTitle>Suggested first tasks</SectionTitle>
        <BulletList items={project.first_tasks} />
        <p className="mb-1 mt-4 text-label-large text-on-surface-variant">Suggested documentation</p>
        <BulletList items={project.key_docs} />
      </Card>

      <Card tint="error" className="mb-6">
        <SectionTitle>Approvals required &amp; risk notes</SectionTitle>
        <p className="mb-1 text-label-large opacity-80">Approvals required by profile</p>
        <BulletList items={profile.approvals_required} />
        <p className="mb-1 mt-4 text-label-large opacity-80">Project risk notes</p>
        <BulletList items={project.risk_notes} />
      </Card>

      <div className="flex items-center gap-3">
        {record.status === "draft" && (
          <Button onClick={handleSendForApproval} disabled={sendingForApproval || approving || retrying || completing || deleting}>
            {sendingForApproval ? "Sending..." : "Send for approval"}
          </Button>
        )}
        {record.status === "pending_approval" && (
          <Button onClick={handleApprove} disabled={approving || retrying || completing || deleting}>
            {approving ? "Approving..." : "Approve & send to employee"}
          </Button>
        )}
        {record.status === "blocked" && (
          <Button onClick={handleRetry} disabled={retrying || completing || deleting}>
            {retrying ? "Retrying..." : "Retry generation"}
          </Button>
        )}
        {record.status === "in_progress" && (
          <Button onClick={handleComplete} disabled={completing || retrying || deleting}>
            {completing ? "Completing..." : "Mark complete"}
          </Button>
        )}
        <IconButton
          tone="error"
          aria-label="Delete onboarding"
          title="Delete onboarding"
          onClick={handleDelete}
          disabled={sendingForApproval || approving || retrying || completing || deleting}
        >
          <TrashIcon className={`h-5 w-5 ${deleting ? "animate-pulse" : ""}`} />
        </IconButton>
      </div>
    </div>
  );
}
