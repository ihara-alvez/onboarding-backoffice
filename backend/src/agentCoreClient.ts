import crypto from "crypto";
import {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} from "@aws-sdk/client-bedrock-agentcore";
import { ProgressEvent } from "./types";

const AGENT_RUNTIME_ARN =
  process.env.AGENT_RUNTIME_ARN ??
  "arn:aws:bedrock-agentcore:us-east-1:419466290453:runtime/htmx_chatapp_iava-q2e5r0DYmQ";
const AWS_REGION = process.env.AWS_REGION ?? "us-east-1";
const RUNTIME_QUALIFIER = "DEFAULT";
const MODEL_ID = "anthropic.claude-haiku-4-5";
const USER_ID = "backoffice-manager";
const GUARDRAIL_ID = process.env.AGENTCORE_GUARDRAIL_ID ?? "wb4578p8755b";
const GUARDRAIL_VERSION = process.env.AGENTCORE_GUARDRAIL_VERSION ?? "1";
const AGENTCORE_TIMEOUT_MS = 120_000;

export interface NarrativeArgs {
  employeeName: string;
  employeeEmail: string;
  profileId: string;
  projectId: string;
}

export type NarrativeOutcome = { ok: true; narrative: string } | { ok: false; error: string };

interface AgentStreamEvent {
  error?: boolean;
  message?: string;
  type?: string;
  tool_name?: string;
  event?: AgentStreamEvent;
  usage?: unknown;
  metrics?: unknown;
  contentBlockStart?: {
    start?: { toolUse?: { name?: string } };
  };
  contentBlockDelta?: {
    delta?: {
      text?: string;
      reasoningContent?: { text?: string };
    };
  };
}

const client = new BedrockAgentCoreClient({ region: AWS_REGION });

function createPrompt(args: NarrativeArgs): string {
  return `Generate the onboarding plan for employee '${args.employeeName}' (email ${args.employeeEmail}) with profile '${args.profileId}' on project '${args.projectId}'. Use the load_profile and load_project tools to get the data and then generate_onboarding_plan to produce a detailed step by step plan in Markdown. Show me the checklist.`;
}

function emitEvent(onEvent: ((event: ProgressEvent) => void) | undefined, event: ProgressEvent): void {
  onEvent?.(event);
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function readAgentStream(
  response: unknown,
  onEvent: ((event: ProgressEvent) => void) | undefined,
  signal?: AbortSignal
): Promise<NarrativeOutcome> {
  const decoder = new TextDecoder();
  let buffer = "";
  let narrative = "";
  let toolCount = 0;

  const processLine = (line: string): NarrativeOutcome | undefined => {
    const trimmed = line.trim().replace(/^data:\s*/, "");
    if (!trimmed) return undefined;

    let event: AgentStreamEvent;
    try {
      event = JSON.parse(trimmed) as AgentStreamEvent;
    } catch {
      return undefined;
    }

    const payload = event.event ?? event;

    if (payload.error === true) {
      return { ok: false, error: payload.message ?? "Agent runtime reported an error" };
    }

    const text = payload.contentBlockDelta?.delta?.text;
    if (typeof text === "string") {
      narrative += text;
      emitEvent(onEvent, { type: "text", text, complete: false });
      return undefined;
    }

    const reasoning = payload.contentBlockDelta?.delta?.reasoningContent?.text;
    if (typeof reasoning === "string") {
      emitEvent(onEvent, { type: "reasoning", text: reasoning });
      return undefined;
    }

    const toolName =
      payload.type === "tool_use"
        ? payload.tool_name
        : payload.contentBlockStart?.start?.toolUse?.name;
    if (typeof toolName === "string") {
      toolCount += 1;
      emitEvent(onEvent, { type: "tool_call", tool: toolName, count: toolCount });
      return undefined;
    }

    if (payload.usage !== undefined || payload.metrics !== undefined) {
      console.log("AgentCore runtime usage/metrics", { usage: payload.usage, metrics: payload.metrics });
    }

    return undefined;
  };

  const chunks = isAsyncIterable(response)
    ? response
    : isBlobLike(response)
      ? [new Uint8Array(await response.arrayBuffer())]
      : undefined;
  if (!chunks) return { ok: false, error: "Agent runtime returned an unreadable response stream" };

  for await (const chunk of chunks) {
    if (signal?.aborted) return { ok: false, error: "AgentCore invocation aborted" };
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const result = processLine(line);
      if (result) return result;
    }
  }

  if (signal?.aborted) return { ok: false, error: "AgentCore invocation aborted" };

  buffer += decoder.decode();
  const finalResult = processLine(buffer);
  if (finalResult) return finalResult;
  if (!narrative) return { ok: false, error: "Agent stream ended without producing a response" };

  emitEvent(onEvent, { type: "text", text: "", complete: true });
  return { ok: true, narrative };
}

function isAsyncIterable(value: unknown): value is AsyncIterable<Uint8Array> {
  return (
    typeof value === "object" &&
    value !== null &&
    Symbol.asyncIterator in value &&
    typeof (value as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator] === "function"
  );
}

function isBlobLike(value: unknown): value is { arrayBuffer: () => Promise<ArrayBuffer> } {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function"
  );
}

export async function runNarrative(
  args: NarrativeArgs,
  onEvent?: (event: ProgressEvent) => void,
  signal?: AbortSignal
): Promise<NarrativeOutcome> {
  const sessionId = crypto.randomUUID();
  const payload = new TextEncoder().encode(
    JSON.stringify({
      prompt: createPrompt(args),
      userId: USER_ID,
      sessionId,
      modelId: MODEL_ID,
      modelApi: "messages",
      guardrailId: GUARDRAIL_ID,
      guardrailVersion: GUARDRAIL_VERSION,
      guardrailEnabled: true,
    })
  );

  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), AGENTCORE_TIMEOUT_MS);
  const abortFromCaller = () => timeoutController.abort(signal?.reason);
  signal?.addEventListener("abort", abortFromCaller, { once: true });
  if (signal?.aborted) timeoutController.abort(signal.reason);

  try {
    const response = await client.send(
      new InvokeAgentRuntimeCommand({
        agentRuntimeArn: AGENT_RUNTIME_ARN,
        qualifier: RUNTIME_QUALIFIER,
        runtimeSessionId: sessionId,
        payload,
      }),
      { abortSignal: timeoutController.signal }
    );

    if (!response.response) {
      return { ok: false, error: "Agent runtime returned no response stream" };
    }
    return await readAgentStream(response.response, onEvent, timeoutController.signal);
  } catch (error) {
    return { ok: false, error: `AgentCore invocation failed: ${describeError(error)}` };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}
