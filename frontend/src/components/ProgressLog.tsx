import { useEffect, useRef } from "react";
import type { ProgressEvent } from "../api/types";

interface ProgressLogProps {
  events: ProgressEvent[];
  /** Show the blinking cursor and "connecting..." placeholder — only makes
   * sense while a stream is actually in progress, not for a saved, past log. */
  live?: boolean;
}

interface ConsoleLine {
  kind: "status" | "tool" | "text";
  text: string;
}

/** Flattens the raw event stream into console lines: status/tool_call events
 * each start a new line, consecutive "text" chunks get appended onto the same
 * growing line (so streamed tokens read as one line being typed out). */
function toConsoleLines(events: ProgressEvent[]): ConsoleLine[] {
  const lines: ConsoleLine[] = [];
  for (const event of events) {
    if (event.type === "status") {
      lines.push({ kind: "status", text: event.message });
    } else if (event.type === "tool_call") {
      lines.push({ kind: "tool", text: `calling tool: ${event.tool}()` });
    } else if (event.type === "text" || event.type === "reasoning") {
      const last = lines[lines.length - 1];
      if (last && last.kind === "text") {
        last.text += event.text;
      } else {
        lines.push({ kind: "text", text: event.text });
      }
    }
  }
  return lines;
}

const prefixes: Record<ConsoleLine["kind"], string> = {
  status: "$",
  tool: "→",
  text: " ",
};

const colors: Record<ConsoleLine["kind"], string> = {
  status: "text-emerald-400",
  tool: "text-cyan-400",
  text: "text-neutral-200",
};

export function ProgressLog({ events, live = true }: ProgressLogProps) {
  const lines = toConsoleLines(events);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!live) return;
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [events.length, live]);

  return (
    <div className="rounded-md bg-neutral-950 p-4 shadow-elevation-2">
      <div className="mb-2 flex items-center gap-2 border-b border-neutral-800 pb-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
        <span className="ml-2 text-label-large text-neutral-500">agent-console</span>
      </div>
      <div className="max-h-96 overflow-y-auto font-mono text-body-medium leading-relaxed">
        {lines.length === 0 && live && <p className="text-neutral-500">connecting...</p>}
        {lines.map((line, i) => (
          <p key={i} className={colors[line.kind]}>
            <span className="mr-2 text-neutral-500">{prefixes[line.kind]}</span>
            {line.text}
          </p>
        ))}
        {live && <span className="inline-block h-4 w-2 animate-pulse bg-neutral-300 align-middle" />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
