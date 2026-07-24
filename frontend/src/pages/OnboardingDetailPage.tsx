import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowDownTrayIcon,
  ClockIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
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
import { ChatPanel } from "../components/ChatPanel";
import { Chip } from "../components/Chip";
import { IconButton } from "../components/IconButton";
import { Spinner } from "../components/Spinner";
import { isApprovedStatus, statusTone } from "../statusDisplay";

const progressStages: Array<{ status: OnboardingStatus; label: string }> = [
  { status: "draft", label: "Draft" },
  { status: "pending_approval", label: "Review" },
  { status: "ready_for_day_1", label: "Ready for day 1" },
  { status: "in_progress", label: "In progress" },
  { status: "completed", label: "Completed" },
];

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-body-medium text-on-surface-variant">None.</p>;
  }
  return (
    <ul className="space-y-2 text-body-medium text-on-surface">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-title-medium font-semibold text-on-surface">{children}</h2>;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function buildProgressEntries(record: OnboardingRecord): Array<{ status: OnboardingStatus; timestamp: string }> {
  const entries = record.actionLog
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

function ProgressCard({ record }: { record: OnboardingRecord }) {
  const currentIndex = progressStages.findIndex((stage) => stage.status === record.status);
  const progressEntries = buildProgressEntries(record);
  const latestProgress = progressEntries[progressEntries.length - 1];

  return (
    <Card className="mb-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <SectionTitle>Onboarding progress</SectionTitle>
          <p className="mt-1 text-body-medium text-on-surface-variant">
            {latestProgress ? `Last updated ${formatDateTime(latestProgress.timestamp)}` : "Plan created and ready for review."}
          </p>
        </div>
        <Chip tone={statusTone(record.status)}>{record.status.replaceAll("_", " ")}</Chip>
      </div>
      {record.status === "blocked" ? (
        <div className="rounded-md border border-error bg-error-container p-4 text-body-medium text-on-error-container">
          Generation is blocked. Retry generation to create a plan before continuing.
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {progressStages.map((stage, index) => {
            const complete = currentIndex >= index;
            const active = currentIndex === index;
            return (
              <div key={stage.status} className="relative flex min-w-0 flex-col items-center gap-2">
                {/* items-center keeps the dot centered in its column so the line below, positioned at left:-50%/right:50%, actually meets the dot centers */}
                {index > 0 && (
                  <span className={`absolute left-[-50%] right-[50%] top-3 h-px ${currentIndex >= index ? "bg-primary" : "bg-outline-variant"}`} />
                )}
                <span className={`relative z-[1] h-6 w-6 rounded-full border-2 ${complete ? "border-primary bg-primary" : "border-outline bg-surface-container"}`}>
                  {complete && <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-on-primary" />}
                </span>
                <span className={`text-center text-label-large ${active ? "font-semibold text-on-surface" : "text-on-surface-variant"}`}>{stage.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function RepositoriesCard({ record }: { record: OnboardingRecord }) {
  return (
    <Card className="mb-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <SectionTitle>Repositories</SectionTitle>
          <p className="mt-1 text-body-medium text-on-surface-variant">Codebases and setup commands for the first week.</p>
        </div>
        <span className="text-label-large text-on-surface-variant">{record.project.repositories.length} connected</span>
      </div>
      <div role="region" aria-label="Repositories table" tabIndex={0} className="overflow-x-auto rounded-md border border-outline-variant">
        <table className="min-w-[640px] w-full border-collapse text-left">
          <caption className="sr-only">Repositories and setup commands</caption>
          <thead className="bg-surface-variant text-label-large font-medium text-on-surface-variant">
            <tr>
              <th scope="col" className="px-4 py-3">Repository</th>
              <th scope="col" className="px-4 py-3">Access</th>
              <th scope="col" className="px-4 py-3">Setup</th>
            </tr>
          </thead>
          <tbody className="text-body-medium text-on-surface">
            {record.project.repositories.length > 0 ? record.project.repositories.map((repo) => (
              <tr key={repo.name} className="border-t border-outline-variant align-top">
                <td className="px-4 py-4">
                  <p className="font-semibold">{repo.name}</p>
                  <p className="mt-1 text-label-large text-on-surface-variant">{repo.description}</p>
                </td>
                <td className="whitespace-nowrap px-4 py-4">{record.profile.permissions.repositories.access}</td>
                <td className="px-4 py-4">
                  <code className="block whitespace-normal rounded-md bg-surface-variant px-3 py-2 text-label-large text-on-surface-variant">
                    {repo.bootstrap} · {repo.test}
                  </code>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={3} className="px-4 py-4 text-on-surface-variant">No repositories connected.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function PermissionsCard({ record }: { record: OnboardingRecord }) {
  const { permissions } = record.profile;
  const permissionRows = [
    ...permissions.aws.map((permission, index) => ({ permission, system: "AWS", key: `aws-${permission}-${index}` })),
    { permission: permissions.repositories.access, system: "Repositories", key: `repositories-${permissions.repositories.access}` },
    ...permissions.ci_cd.map((permission, index) => ({ permission, system: "CI/CD", key: `ci-cd-${permission}-${index}` })),
  ];

  return (
    <Card className="mb-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <SectionTitle>{isApprovedStatus(record.status) ? "Approved permissions" : "Requested permissions"}</SectionTitle>
          <p className="mt-1 text-body-medium text-on-surface-variant">Access needed to contribute safely from day one.</p>
        </div>
        <Chip tone={isApprovedStatus(record.status) ? "primary" : "secondary"}>{isApprovedStatus(record.status) ? "Approved" : "Pending"}</Chip>
      </div>
      <div role="region" aria-label="Permissions table" tabIndex={0} className="overflow-x-auto rounded-md border border-outline-variant">
        <table className="min-w-[560px] w-full border-collapse text-left">
          <caption className="sr-only">Requested or approved permissions by system</caption>
          <thead className="bg-surface-variant text-label-large font-medium text-on-surface-variant">
            <tr>
              <th scope="col" className="px-4 py-3">Permission</th>
              <th scope="col" className="px-4 py-3">System</th>
              <th scope="col" className="px-4 py-3">Included</th>
            </tr>
          </thead>
          <tbody className="text-body-medium text-on-surface">
            {permissionRows.length > 0 ? permissionRows.map((row) => (
              <tr key={row.key} className="border-t border-outline-variant">
                <td className="break-words px-4 py-3">{row.permission}</td>
                <td className="whitespace-nowrap px-4 py-3 text-on-surface-variant">{row.system}</td>
                <td className="px-4 py-3">
                  <span className="sr-only">Included</span>
                  <span aria-hidden="true" className="font-semibold text-primary">✓</span>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={3} className="px-4 py-3 text-on-surface-variant">No permissions listed.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ChecklistCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <SectionTitle>{title}</SectionTitle>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-body-medium text-on-surface">
            <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-outline" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "onboarding";
}

function HistoryModal({ record, onClose }: { record: OnboardingRecord; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    closeButtonRef.current?.focus();
    document.body.style.overflow = "hidden";
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-on-surface/40 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <Card
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Onboarding history"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <SectionTitle>History</SectionTitle>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close history"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        {record.actionLog.length > 0 ? (
          <div className="space-y-4 border-l border-outline-variant pl-5">
            {record.actionLog.map((entry) => (
              <div key={entry.id} className="relative">
                <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border-2 border-surface-container bg-primary" />
                <p className="text-label-large text-on-surface-variant">{formatDateTime(entry.timestamp)} · {entry.actor === "manager" ? "Manager" : "System"}</p>
                <p className="mt-1 text-body-medium text-on-surface">{entry.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-body-medium text-on-surface-variant">No activity has been recorded yet.</p>
        )}
      </Card>
    </div>
  );
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
  const [lastSentMessage, setLastSentMessage] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const currentIdRef = useRef(id);
  const historyTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    currentIdRef.current = id;
    setChatMessage("");
    setChatEvents([]);
    setChatError(null);
    setSendingChat(false);
    setLastSentMessage(null);
    if (!id) return;
    getOnboarding(id).then(setRecord).catch((err) => setError(err.message));
  }, [id]);

  async function handleApprove() {
    if (!id) return;
    setApproving(true);
    try {
      const updated = await approveOnboarding(id);
      navigate("/", { state: { toastMessage: `Approved and sent to ${updated.employeeEmail}.` } });
    } catch (err) {
      setError((err as Error).message);
      setApproving(false);
    }
  }

  async function handleSendForApproval() {
    if (!id) return;
    setSendingForApproval(true);
    try {
      setRecord(await sendForApproval(id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSendingForApproval(false);
    }
  }

  async function handleDelete() {
    if (!id || !record || !window.confirm(`Delete the onboarding for ${record.employeeName}? This can't be undone.`)) return;
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
      setRecord(await retryGeneration(id, () => undefined));
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
      setRecord(await markCompleted(id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCompleting(false);
    }
  }

  function handleDownloadPlan() {
    if (!record) return;
    const plan = record.narrative ?? record.plan;
    const slug = slugify(record.employeeName);
    const blob = new Blob([plan], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-onboarding-plan.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function handleCloseHistory() {
    setHistoryOpen(false);
    historyTriggerRef.current?.focus();
  }

  async function handleSendChat() {
    const trimmed = chatMessage.trim();
    if (!id || !trimmed) return;
    const chatId = id;
    setLastSentMessage(trimmed);
    setSendingChat(true);
    setChatError(null);
    setChatEvents([]);
    try {
      const updated = await sendChatMessage(chatId, trimmed, (event) => {
        if (currentIdRef.current === chatId) setChatEvents((prev) => [...prev, event]);
      });
      if (currentIdRef.current !== chatId) return;
      setRecord(updated);
      setChatMessage("");
    } catch (err) {
      if (currentIdRef.current !== chatId) return;
      setChatError((err as Error).message);
      try {
        const refreshed = await getOnboarding(chatId);
        if (currentIdRef.current === chatId) setRecord(refreshed);
      } catch {
        // The original chat error remains visible when the best-effort refresh fails.
      }
    } finally {
      if (currentIdRef.current === chatId) setSendingChat(false);
    }
  }

  if (error) return <div className="mx-auto max-w-7xl p-8"><Card tint="error">{error}</Card></div>;
  if (!record) return <Spinner label="Loading onboarding..." />;

  const otherActionInFlight = sendingForApproval || approving || retrying || completing || deleting;
  const anyActionInFlight = otherActionInFlight || sendingChat;

  const canSendForApproval = record.status === "draft";
  const canApprove = record.status === "pending_approval";
  const approveSlotEnabled = canSendForApproval || canApprove;
  const approveLabel = canSendForApproval
    ? "Send for approval"
    : canApprove
      ? "Approve & send to employee"
      : isApprovedStatus(record.status)
        ? "Approved"
        : "Approval unavailable";
  const approveDisabledReason = approveSlotEnabled
    ? undefined
    : isApprovedStatus(record.status)
      ? "This onboarding has already been approved."
      : "Retry generation before this onboarding can be approved.";
  const approveHandler = canSendForApproval ? handleSendForApproval : handleApprove;
  const approveInFlight = canSendForApproval ? sendingForApproval : approving;
  const approveLoadingLabel = canSendForApproval ? "Sending..." : "Approving...";
  const canComplete = record.status === "in_progress";
  const completeDisabledReason = canComplete
    ? undefined
    : record.status === "completed"
      ? "This onboarding is already complete."
      : record.status === "blocked"
        ? "Retry generation before this onboarding can be completed."
        : record.status === "ready_for_day_1"
          ? "This onboarding becomes completable once it's in progress."
          : "Approve this onboarding before marking it complete.";
  const canRetry = record.status === "blocked";

  return (
    <div className="mx-auto max-w-[1680px] p-6 lg:p-8">
      <div className="flex items-start gap-6">
        <main className="min-w-0 max-w-[1100px] flex-1">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-label-large font-medium text-primary">People / Onboarding workspace</p>
              <h1 className="text-headline-small font-semibold text-on-surface">{record.employeeName}</h1>
              <p className="mt-1 text-body-medium text-on-surface-variant">{record.employeeEmail} · {record.profile.name}</p>
              <p className="mt-2 inline-flex items-center gap-2 text-label-large text-on-surface-variant">
                <span className="rounded-xs bg-primary-container px-2 py-0.5 text-label-large font-medium text-on-primary-container">Project</span>
                {record.project.name}
              </p>
              <p className="mt-1 text-label-large text-on-surface-variant">Created {formatDate(record.createdAt)}</p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-label-large">
                <button
                  ref={historyTriggerRef}
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="-mx-1 inline-flex items-center gap-1 rounded-md px-1 font-medium text-primary hover:bg-primary-container/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <ClockIcon className="h-4 w-4" aria-hidden="true" />
                  View history
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPlan}
                  className="-mx-1 inline-flex items-center gap-1 rounded-md px-1 font-medium text-primary hover:bg-primary-container/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
                  Download plan (.md)
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Chip tone={statusTone(record.status)}>{record.status.replaceAll("_", " ")}</Chip>
              <Button
                variant={approveSlotEnabled ? "filled" : "outlined"}
                onClick={approveHandler}
                disabled={anyActionInFlight || !approveSlotEnabled}
                title={approveDisabledReason}
              >
                {approveInFlight ? approveLoadingLabel : approveLabel}
              </Button>
              <Button
                variant={canComplete ? "filled" : "outlined"}
                onClick={handleComplete}
                disabled={anyActionInFlight || !canComplete}
                title={completeDisabledReason}
              >
                {completing ? "Completing..." : "Mark complete"}
              </Button>
              {canRetry && (
                <Button variant="filled" onClick={handleRetry} disabled={anyActionInFlight}>
                  {retrying ? "Retrying..." : "Retry generation"}
                </Button>
              )}
              <IconButton tone="error" aria-label="Delete onboarding" title="Delete onboarding" onClick={handleDelete} disabled={anyActionInFlight}>
                <TrashIcon className={`h-5 w-5 ${deleting ? "animate-pulse" : ""}`} />
              </IconButton>
            </div>
          </div>

          {record.notification && <div className="mb-5 rounded-md border border-primary/20 bg-primary-container px-4 py-3 text-body-medium text-on-primary-container">Sent to <strong>{record.notification.sentTo}</strong> at {new Date(record.notification.sentAt).toLocaleTimeString()}.</div>}

          <ProgressCard record={record} />
          <RepositoriesCard record={record} />
          <PermissionsCard record={record} />
          <div className="mb-5 grid gap-5 md:grid-cols-2">
            <ChecklistCard title="Day 1 checklist" items={record.profile.base_checklist.day_1} />
            <ChecklistCard title="Week 1 checklist" items={record.profile.base_checklist.week_1} />
          </div>
          <Card className="mb-5">
            <div className="grid gap-6 md:grid-cols-2">
              <div><SectionTitle>Suggested first tasks</SectionTitle><div className="mt-4"><BulletList items={record.project.first_tasks} /></div></div>
              <div><SectionTitle>Suggested documentation</SectionTitle><div className="mt-4"><BulletList items={record.project.key_docs} /></div></div>
            </div>
          </Card>
          <Card className="mb-5 border-amber-200 bg-amber-50">
            <SectionTitle>Approvals and risks</SectionTitle>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <div><p className="mb-2 text-label-large font-medium text-amber-900">Approvals required</p><BulletList items={record.profile.approvals_required} /></div>
              <div><p className="mb-2 text-label-large font-medium text-amber-900">Project risk notes</p><BulletList items={record.project.risk_notes} /></div>
            </div>
          </Card>
        </main>
        <aside className="sticky top-16 h-[calc(100vh-4rem)] w-[440px] shrink-0 overflow-hidden">
          <ChatPanel
            status={record.status}
            actionLog={record.actionLog}
            chatMessage={chatMessage}
            onChatMessageChange={setChatMessage}
            onSend={handleSendChat}
            sendingChat={sendingChat}
            chatEvents={chatEvents}
            chatError={chatError}
            lastSentMessage={lastSentMessage}
            otherActionInFlight={otherActionInFlight}
          />
        </aside>
      </div>
      {historyOpen && <HistoryModal record={record} onClose={handleCloseHistory} />}
    </div>
  );
}
