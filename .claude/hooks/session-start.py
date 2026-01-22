#!/usr/bin/env python3
"""
Session start hook that loads chainlink context and reminds about session workflow.
Outputs JSON with additionalContext for Claude Code to inject into the conversation.
"""

# Immediate log before any other imports
import sys as _sys
with open("/tmp/session-start-hook.log", "a") as _f:
    _f.write(f"IMMEDIATE: Script invoked with args: {_sys.argv}\n")

import json
import subprocess
import sys
import os
from datetime import datetime

LOG_FILE = "/tmp/session-start-hook.log"


def log(message):
    """Write timestamped message to log file for debugging."""
    with open(LOG_FILE, "a") as f:
        f.write(f"{datetime.now().isoformat()} - {message}\n")


def run_chainlink(args):
    """Run a chainlink command and return output."""
    try:
        result = subprocess.run(
            ["chainlink"] + args,
            capture_output=True,
            text=True,
            timeout=5
        )
        return result.stdout.strip() if result.returncode == 0 else None
    except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
        return None


def check_chainlink_initialized():
    """Check if .chainlink directory exists."""
    cwd = os.getcwd()
    current = cwd

    while True:
        candidate = os.path.join(current, ".chainlink")
        if os.path.isdir(candidate):
            return True
        parent = os.path.dirname(current)
        if parent == current:
            break
        current = parent

    return False


def get_hook_input():
    """Read and parse hook input from stdin."""
    try:
        raw = sys.stdin.read()
        log(f"Raw stdin: {raw}")
        hook_input = json.loads(raw) if raw else {}
        log(f"Parsed hook input: {hook_input}")
        return hook_input
    except Exception as e:
        log(f"Error parsing hook input: {e}")
        return {}


def main():
    log("=== Hook invoked ===")
    hook_input = get_hook_input()
    source = hook_input.get("source", "unknown")
    log(f"Source: {source}")

    context_parts = []

    # CRITICAL: Always remind to re-read CLAUDE.md, especially on resume
    context_parts.append("""<claude-md-reminder>
CRITICAL: Re-read /workspace/CLAUDE.md before taking any action.
Pay special attention to the "After Context Compaction" section.
Do NOT automatically continue with "next steps" from summaries without user approval.
</claude-md-reminder>""")

    if check_chainlink_initialized():
        context_parts.append("<chainlink-session-context>")

        # Try to get session status
        session_status = run_chainlink(["session", "status"])
        if session_status:
            context_parts.append(f"## Current Session\n{session_status}")

        # Get ready issues (unblocked work)
        ready_issues = run_chainlink(["ready"])
        if ready_issues:
            context_parts.append(f"## Ready Issues (unblocked)\n{ready_issues}")

        # Get open issues summary
        open_issues = run_chainlink(["list", "-s", "open"])
        if open_issues:
            context_parts.append(f"## Open Issues\n{open_issues}")

        context_parts.append("""
## Chainlink Workflow Reminder
- Use `chainlink session start` at the beginning of work
- Use `chainlink session work <id>` to mark current focus
- Add comments as you discover things: `chainlink comment <id> "..."`
- End with handoff notes: `chainlink session end --notes "..."`
</chainlink-session-context>""")

    additional_context = "\n\n".join(context_parts)

    # Output JSON format for Claude Code to parse
    output = {
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": additional_context
        }
    }

    output_json = json.dumps(output)
    log(f"Output JSON length: {len(output_json)}")
    log(f"Output first 500 chars: {output_json[:500]}")
    print(output_json)
    log("=== Hook completed ===")
    sys.exit(0)


if __name__ == "__main__":
    main()
