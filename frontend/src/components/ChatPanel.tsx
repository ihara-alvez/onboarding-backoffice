import type { ActionLogEntry, OnboardingStatus, ProgressEvent } from "../api/types";
import { Button } from "./Button";
import { Card } from "./Card";

interface ChatPanelProps {
  status: OnboardingStatus;
  actionLog: ActionLogEntry[];
  chatMessage: string;
  onChatMessageChange: (value: string) => void;
  onSend: () => void;
  sendingChat: boolean;
  chatEvents: ProgressEvent[];
  chatError: string | null;
  lastSentMessage: string | null;
  otherActionInFlight: boolean;
}

type ParsedChatLogEntry =
  | { kind: "revised"; message: string }
  | { kind: "failed"; message: string }
  | { kind: "discarded"; message: string };

const revisionMessage = /^Plan revised per chat request: "([\s\S]*)"$/;
const discardedMessage = "Revision discarded: onboarding was approved before the response arrived";

function parseChatLogEntry(entry: ActionLogEntry): ParsedChatLogEntry {
  const match = entry.message.match(revisionMessage);
  if (match) return { kind: "revised", message: match[1] };
  if (entry.message === discardedMessage) return { kind: "discarded", message: entry.message };
  return { kind: "failed", message: entry.message };
}

function HistoryRow({ entry }: { entry: ActionLogEntry }) {
  const parsed = parseChatLogEntry(entry);

  if (parsed.kind === "revised") {
    return (
      <div className="flex flex-col gap-2">
        <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-primary-container px-4 py-3 text-body-medium text-on-primary-container">
          <p className="mb-1 text-label-large font-semibold">You asked</p>
          <p>{parsed.message}</p>
        </div>
        <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-secondary-container px-4 py-3 text-body-medium text-on-secondary-container">
          <p className="font-medium">✓ Plan updated</p>
          <p className="mt-1 text-label-large opacity-80">The onboarding plan was revised successfully.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-md border p-3 text-body-medium ${
        parsed.kind === "failed"
          ? "border-error text-on-error-container"
          : "border-outline-variant text-on-surface-variant"
      }`}
    >
      <p className="mb-1 text-label-large font-semibold">
        {parsed.kind === "failed" ? "Plan revision failed" : "Revision discarded"}
      </p>
      <p>{parsed.message}</p>
    </div>
  );
}

function AgentAvatar() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-primary" aria-hidden="true">
      <span className="text-title-medium">✦</span>
    </span>
  );
}

function agentText(events: ProgressEvent[]): string {
  return events
    .filter((event): event is Extract<ProgressEvent, { type: "text" | "reasoning" }> => event.type === "text" || event.type === "reasoning")
    .map((event) => event.text)
    .join("");
}

function LiveExchange({ message, events, live }: { message: string | null; events: ProgressEvent[]; live: boolean }) {
  const response = agentText(events);

  return (
    <div className="flex flex-col gap-3">
      {message && (
        <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-primary-container px-4 py-3 text-body-medium text-on-primary-container">
          <p className="mb-1 text-label-large font-semibold">You</p>
          <p>{message}</p>
        </div>
      )}
      <div className="flex items-start gap-2">
        <AgentAvatar />
        <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-secondary-container px-4 py-3 text-body-medium text-on-secondary-container">
          <p className="mb-1 text-label-large font-semibold">Onboarding agent</p>
          <p className="whitespace-pre-wrap">
            {response || (live ? "Working on your plan…" : "Plan update completed.")}
            {live && <span className="ml-1 inline-block animate-pulse">▋</span>}
          </p>
        </div>
      </div>
    </div>
  );
}

function ChatHistory({ actionLog }: { actionLog: ActionLogEntry[] }) {
  const entries = actionLog.filter((entry) => entry.type === "chat_message");
  if (entries.length === 0) {
    return <p className="text-body-medium text-on-surface-variant">No plan revisions yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry) => (
        <div key={entry.id}>
          <p className="mb-1 text-label-large text-on-surface-variant">
            {new Date(entry.timestamp).toLocaleString()}
          </p>
          <HistoryRow entry={entry} />
        </div>
      ))}
    </div>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="m4 4 16 8-16 8 3-8-3-8Z" />
      <path d="M7 12h13" />
    </svg>
  );
}

export function ChatPanel({
  status,
  actionLog,
  chatMessage,
  onChatMessageChange,
  onSend,
  sendingChat,
  chatEvents,
  chatError,
  lastSentMessage,
  otherActionInFlight,
}: ChatPanelProps) {
  const disabled = otherActionInFlight || sendingChat;
  const canEdit = status === "draft" || status === "pending_approval";

  return (
    <Card className="flex h-full min-h-0 flex-col gap-5 overflow-hidden p-5">
      <div className="border-b border-outline-variant pb-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-title-large font-semibold text-on-surface">Plan chat</h2>
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" title="Agent available" />
        </div>
        <p className="mt-1 text-body-medium text-on-surface-variant">
          Ask the agent to adjust the plan or resolve issues.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="flex flex-col gap-4">
        <ChatHistory actionLog={actionLog} />
        {chatEvents.length > 0 && (
          <>
            <div className="flex items-center gap-3 py-1 text-label-large text-on-surface-variant">
              <span className="h-px flex-1 bg-outline-variant" />
              <span>Today</span>
              <span className="h-px flex-1 bg-outline-variant" />
            </div>
            <LiveExchange message={lastSentMessage} events={chatEvents} live={sendingChat} />
          </>
        )}
        {chatError && <Card tint="error">{chatError}</Card>}
        </div>
      </div>

      {status === "blocked" ? (
        <div className="mt-auto rounded-xl border border-outline-variant bg-surface-variant p-4 text-body-medium text-on-surface-variant">
          No plan to discuss yet — retry generation first.
        </div>
      ) : canEdit ? (
        <div className="flex shrink-0 gap-3 border-t border-outline-variant pt-4">
          <label htmlFor="chat-message" className="sr-only">Message</label>
          <input
            id="chat-message"
            value={chatMessage}
            onChange={(event) => onChatMessageChange(event.target.value)}
            disabled={disabled}
            placeholder="Ask to revise the plan..."
            className="min-w-0 flex-1 rounded-lg border border-outline bg-surface-container px-4 py-3 text-body-medium text-on-surface outline-none placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          />
          <Button
            aria-label={sendingChat ? "Sending message" : "Send message"}
            onClick={onSend}
            disabled={disabled || !chatMessage.trim()}
            className="h-12 w-12 shrink-0 rounded-lg px-0"
          >
            <SendIcon />
          </Button>
        </div>
      ) : (
        <div className="mt-auto rounded-xl border border-outline-variant bg-surface-variant px-4 py-3 text-body-medium text-on-surface-variant">
          Chat is read-only
        </div>
      )}
    </Card>
  );
}
