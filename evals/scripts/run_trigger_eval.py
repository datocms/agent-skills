#!/usr/bin/env python3
"""Run trigger evals using Claude Code or Codex as a classifier."""

from __future__ import annotations

import argparse
import functools
import json
import os
import shutil
import signal
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Callable

from trigger_eval_common import (
    RESULTS_ROOT,
    VALID_SOURCES,
    SOURCE_FRONTMATTER,
    PredictionRunner,
    discover_eval_configs,
    evaluate_skill,
    filter_eval_configs,
    find_predictions_object,
    predictions_from_payload,
)

# A stalled classifier fails the run instead of hanging it.
TIMEOUT_SECONDS = 600
PREDICTIONS_SCHEMA = {
    "type": "object",
    "properties": {
        "predictions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"id": {"type": "integer"}, "trigger": {"type": "boolean"}},
                "required": ["id", "trigger"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["predictions"],
    "additionalProperties": False,
}


def _ensure_claude_cli_available() -> None:
    if shutil.which("claude") is None:
        raise RuntimeError(
            "claude CLI not found on PATH. Install it, authenticate it, and verify "
            "`claude --help` works before running the Claude Code eval track."
        )


def _ensure_codex_cli_available() -> None:
    if shutil.which("codex") is None:
        raise RuntimeError(
            "codex CLI not found on PATH. Install it, authenticate it, and verify "
            "`codex exec --help` works before running the Codex eval track."
        )


def _tail(output: Any) -> str:
    if isinstance(output, bytes):
        output = output.decode("utf-8", "replace")
    return (output or "")[-1000:]


def _run(label: str, cmd: list[str], cwd: str, env: dict[str, str]) -> str:
    # Own process group: CLI launchers such as the npm `codex` wrapper leave their child
    # running when only the launcher is killed.
    with subprocess.Popen(
        cmd,
        cwd=cwd,
        env=env,
        # `codex exec` appends piped stdin to the prompt.
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        start_new_session=True,
    ) as process:
        try:
            stdout, stderr = process.communicate(timeout=TIMEOUT_SECONDS)
        except subprocess.TimeoutExpired:
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            stdout, stderr = process.communicate()
            raise RuntimeError(
                f"{label} timed out\n"
                f"timeout_seconds={TIMEOUT_SECONDS}\n"
                f"stdout_tail={_tail(stdout)}\n"
                f"stderr_tail={_tail(stderr)}"
            ) from None

    if process.returncode != 0:
        raise RuntimeError(
            f"{label} failed\n"
            f"returncode={process.returncode}\n"
            f"stdout_tail={_tail(stdout)}\n"
            f"stderr_tail={_tail(stderr)}"
        )
    return stdout


def _answered_by(model: str | None, effort: str | None) -> str | None:
    # Effort moves answers as much as the model does, so results record the two together.
    return f"{model} ({effort} effort)" if model and effort else model


def _run_claude_predictions(
    prompt: str, expected_len: int, model: str | None, effort: str | None = None
) -> tuple[list[bool], str | None]:
    # Isolated like dev/e2e/routing/claude.mjs: an empty directory, no user or project settings,
    # no MCP servers (claude.ai connectors included) and no tools.
    cmd = [
        "claude",
        "-p",
        prompt,
        "--no-session-persistence",
        "--setting-sources",
        "project",
        "--strict-mcp-config",
        "--mcp-config",
        '{"mcpServers":{}}',
        "--disallowedTools",
        "mcp__*",
        "--tools",
        "",
        "--output-format",
        "stream-json",
        "--verbose",
        "--system-prompt",
        "You are a JSON-only classifier. Never use tools. Reply with only the requested JSON object.",
    ]
    if model:
        cmd.extend(["--model", model])
    if effort:
        cmd.extend(["--effort", effort])

    with tempfile.TemporaryDirectory() as temp_dir:
        stdout = _run(
            "claude command",
            cmd,
            temp_dir,
            {**os.environ, "ENABLE_CLAUDEAI_MCP_SERVERS": "false"},
        )

    events: list[dict[str, Any]] = []
    for line in stdout.splitlines():
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(event, dict):
            events.append(event)

    init = next((e for e in events if e.get("type") == "system" and e.get("subtype") == "init"), {})
    if init.get("tools"):
        raise RuntimeError(f"claude classifier was given tools: {init['tools']}")
    result = next((e for e in reversed(events) if e.get("type") == "result"), {})
    if result.get("is_error") or not isinstance(result.get("result"), str):
        raise ValueError(f"claude returned no classification: {_tail(stdout)}")

    return predictions_from_payload(find_predictions_object(result["result"]), expected_len), _answered_by(
        init.get("model"), effort
    )


def _run_codex_predictions(
    prompt: str, expected_len: int, model: str | None, effort: str | None = None
) -> tuple[list[bool], str | None]:
    with tempfile.TemporaryDirectory() as temp_dir:
        temp = Path(temp_dir)
        # Outside the repo, whose AGENTS.md and fixtures would reach the classifier, with an empty
        # HOME (no ~/.agents/skills) and a fresh CODEX_HOME holding only the login: no user config,
        # skills, plugins or MCP servers.
        workspace = temp / "workspace"
        workspace.mkdir()
        home = temp / "home"
        home.mkdir()
        codex_home = temp / "codex-home"
        codex_home.mkdir()
        auth = Path(os.environ.get("CODEX_HOME") or Path.home() / ".codex").expanduser().resolve() / "auth.json"
        if auth.exists():
            (codex_home / "auth.json").symlink_to(auth)
        schema_path = temp / "schema.json"
        schema_path.write_text(json.dumps(PREDICTIONS_SCHEMA), encoding="utf-8")
        output_path = temp / "last-message.json"

        cmd = [
            "codex",
            "exec",
            "--ephemeral",
            "--sandbox",
            "read-only",
            "--skip-git-repo-check",
            "--cd",
            str(workspace),
            "--output-schema",
            str(schema_path),
            "--output-last-message",
            str(output_path),
        ]
        if model:
            cmd.extend(["--model", model])
        if effort:
            # Without it, the fresh CODEX_HOME runs the model at its own default effort.
            cmd.extend(["-c", f'model_reasoning_effort="{effort}"'])
        cmd.append(prompt)

        _run("codex exec", cmd, str(workspace), {**os.environ, "HOME": str(home), "CODEX_HOME": str(codex_home)})
        raw = output_path.read_text(encoding="utf-8") if output_path.exists() else ""

    # Codex does not report its default model, so only a pinned --model is recorded.
    return predictions_from_payload(find_predictions_object(raw), expected_len), _answered_by(model, effort)


TRACKS: dict[str, tuple[Callable[[], None], PredictionRunner]] = {
    "claude": (_ensure_claude_cli_available, _run_claude_predictions),
    "codex": (_ensure_codex_cli_available, _run_codex_predictions),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run trigger eval for skill routing (Claude Code or Codex track)")
    parser.add_argument(
        "--track",
        required=True,
        choices=sorted(TRACKS.keys()),
        help="Eval track to run: claude or codex",
    )
    parser.add_argument(
        "--repo-root",
        default=".",
        help="Repository root containing skills and evals (default: .)",
    )
    parser.add_argument(
        "--results-root",
        default=RESULTS_ROOT,
        help=(
            "Root directory for result files. Each result is written to "
            "<results-root>/trigger/<skill>/<track>/<source>/results.json "
            f"(default: {RESULTS_ROOT})"
        ),
    )
    parser.add_argument(
        "--model",
        help="Model for the selected track; pin it so runs stay comparable (Codex records no model otherwise)",
    )
    parser.add_argument(
        "--effort",
        help="Reasoning effort for the selected track, recorded with the model (e.g. medium)",
    )
    parser.add_argument(
        "--source",
        default=SOURCE_FRONTMATTER,
        choices=VALID_SOURCES,
        help="Routing source to evaluate: frontmatter, metadata, or combined (default: frontmatter)",
    )
    parser.add_argument(
        "--skill",
        help="Optional single skill name to evaluate",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    ensure_cli, run_predictions = TRACKS[args.track]
    ensure_cli()

    repo_root = Path(args.repo_root).resolve()
    results_root = Path(args.results_root)
    if not results_root.is_absolute():
        results_root = (repo_root / results_root).resolve()
    configs = filter_eval_configs(discover_eval_configs(repo_root), args.skill)

    if args.track == "codex" and not args.model:
        print("[note] no --model given: Codex uses its default model and the results record none")

    summaries: list[dict[str, object]] = []
    for config in configs:
        summary = evaluate_skill(
            repo_root,
            config,
            results_root,
            args.track,
            args.model,
            args.source,
            functools.partial(run_predictions, effort=args.effort),
        )
        summaries.append(summary)
        print(
            f"[done] {summary['skill_name']}: {summary['passed']}/{summary['total']} "
            f"(model: {summary['model'] or 'not recorded'}) -> {summary['output_path']}"
        )

    total = sum(int(item["total"]) for item in summaries)
    passed = sum(int(item["passed"]) for item in summaries)
    print(f"[summary] overall {passed}/{total} ({(passed / total):.1%})")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
