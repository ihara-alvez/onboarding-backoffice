#!/usr/bin/env python3
"""Bridge script: invoke dayone's Strands Agent and stream progress + a final result.

Lives inside onboarding-backoffice (NOT inside dayone). Must be invoked with
dayone's OWN venv interpreter: <DAYONE_REPO_PATH>/.venv/bin/python3

Output contract (kept deliberately simple so Node can consume it reliably):
- stderr: one JSON object per line ("NDJSON"), emitted AS EACH AGENT EVENT HAPPENS
  (tool calls, streamed text chunks) — this is the observability feed.
- stdout: exactly ONE JSON object, printed once at the very end —
  {"narrative": "..."} on success or {"error": "..."} on failure. Unchanged
  from before; Node still parses this the same way it always did.
"""
import argparse
import json
import os
import sys
from pathlib import Path


def emit_event(event: dict) -> None:
    """Write one NDJSON progress event to stderr, flushed immediately."""
    print(json.dumps(event), file=sys.stderr, flush=True)


def make_streaming_callback_handler():
    """Build a Strands callback_handler that emits progress events instead of printing.

    Mirrors strands.handlers.callback_handler.PrintingCallbackHandler's own logic
    (same kwargs: reasoningText, data, complete, event.contentBlockStart.start.toolUse)
    but turns each observation into a structured event on stderr instead of stdout,
    so stdout stays reserved for the single final JSON result.
    """
    state = {"tool_count": 0}

    def handler(**kwargs) -> None:
        reasoning_text = kwargs.get("reasoningText", False)
        data = kwargs.get("data", "")
        complete = kwargs.get("complete", False)
        tool_use = (
            kwargs.get("event", {}).get("contentBlockStart", {}).get("start", {}).get("toolUse")
        )

        if tool_use:
            state["tool_count"] += 1
            emit_event({"type": "tool_call", "tool": tool_use["name"], "count": state["tool_count"]})

        if reasoning_text:
            emit_event({"type": "reasoning", "text": reasoning_text})

        if data:
            emit_event({"type": "text", "text": data, "complete": bool(complete)})

    return handler


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--employee", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--profile", required=True)
    parser.add_argument("--project", required=True)
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent  # .../onboarding-backoffice/backend/python-bridge
    default_dayone = (script_dir / ".." / ".." / ".." / "dayone").resolve()
    dayone_repo_path = os.environ.get("DAYONE_REPO_PATH", str(default_dayone))
    sys.path.insert(0, dayone_repo_path)

    try:
        from agent.strands_agent import build_agent
    except ImportError as exc:
        print(json.dumps({"error": f"Failed to import dayone agent from {dayone_repo_path}: {exc}"}))
        sys.exit(1)

    try:
        emit_event({"type": "status", "message": "Building Strands agent (Bedrock model + tools)..."})
        agent = build_agent()
        # Swap the default PrintingCallbackHandler for our own streaming one — this is
        # the ONLY thing that differs from dayone's own CLI usage of build_agent();
        # dayone/agent/strands_agent.py itself is never modified.
        agent.callback_handler = make_streaming_callback_handler()

        prompt = (
            f"Generate the onboarding plan for employee '{args.employee}' "
            f"(email {args.email}) with profile '{args.profile}' on project "
            f"'{args.project}'. Use the load_profile and load_project tools to get "
            f"the data and then generate_onboarding_plan to produce a detailed step "
            f"by step plan in Markdown. Show me the checklist."
        )
        emit_event({"type": "status", "message": "Sending prompt to the agent..."})
        result = agent(prompt)
        narrative = str(result)
    except Exception as exc:  # convert any failure into JSON so Node can still parse it
        print(json.dumps({"error": f"Agent invocation failed: {exc}"}))
        sys.exit(1)

    emit_event({"type": "status", "message": "Done."})
    print(json.dumps({"narrative": narrative}))


if __name__ == "__main__":
    main()
