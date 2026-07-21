import assert from "node:assert/strict";
import { test } from "node:test";
import { readAgentStream } from "./agentCoreClient";

const encoder = new TextEncoder();

async function* chunks(...values: (string | Uint8Array)[]): AsyncGenerator<Uint8Array> {
  for (const value of values) yield typeof value === "string" ? encoder.encode(value) : value;
}

test("parses split SSE events and accumulates nested AgentCore text", async () => {
  const events: unknown[] = [];
  const response = chunks(
    `data: ${JSON.stringify({ event: { contentBlockStart: { start: { toolUse: { name: "load_profile" } } } } })}\n\n`,
    `data: ${JSON.stringify({ event: { contentBlockDelta: { delta: { reasoningContent: { text: "thinking" } } } } })}\n\n`,
    `data: ${JSON.stringify({ event: { contentBlockDelta: { delta: { text: "Hello " } } } })}\n`,
    `\n${JSON.stringify({ event: { contentBlockDelta: { delta: { text: "world" } } } })}\n\n`
  );

  const result = await readAgentStream(response, (event) => events.push(event));

  assert.deepEqual(result, { ok: true, narrative: "Hello world" });
  assert.deepEqual(events, [
    { type: "tool_call", tool: "load_profile", count: 1 },
    { type: "reasoning", text: "thinking" },
    { type: "text", text: "Hello ", complete: false },
    { type: "text", text: "world", complete: false },
    { type: "text", text: "", complete: true },
  ]);
});

test("handles multibyte UTF-8 split across chunks", async () => {
  const encoded = encoder.encode(`data: ${JSON.stringify({ contentBlockDelta: { delta: { text: "café" } } })}\n\n`);
  const split = encoded.indexOf(new Uint8Array([0xc3, 0xa9])[0]);
  const response = chunks(encoded.slice(0, split + 1), encoded.slice(split + 1));

  const result = await readAgentStream(response, undefined);

  assert.deepEqual(result, { ok: true, narrative: "café" });
});

test("returns runtime errors and rejects streams without text", async () => {
  const error = await readAgentStream(
    chunks(`data: ${JSON.stringify({ error: true, message: "runtime failed" })}\n\n`),
    undefined
  );
  const empty = await readAgentStream(chunks(`data: ${JSON.stringify({ start: true })}\n\n`), undefined);

  assert.deepEqual(error, { ok: false, error: "runtime failed" });
  assert.deepEqual(empty, { ok: false, error: "Agent stream ended without producing a response" });
});

test("logs usage and metrics without emitting a ProgressEvent", async () => {
  const originalLog = console.log;
  const calls: unknown[][] = [];
  console.log = (...args: unknown[]) => calls.push(args);
  try {
    const events: unknown[] = [];
    const result = await readAgentStream(
      chunks(
        `data: ${JSON.stringify({ contentBlockDelta: { delta: { text: "ok" } } })}\n\n`,
        `data: ${JSON.stringify({ usage: { inputTokens: 1 }, metrics: { latencyMs: 2 } })}\n\n`
      ),
      (event) => events.push(event)
    );

    assert.deepEqual(result, { ok: true, narrative: "ok" });
    assert.equal(events.length, 2);
    assert.equal(calls.length, 1);
  } finally {
    console.log = originalLog;
  }
});
