#!/usr/bin/env python3
"""Shared helpers for trigger-eval runners."""

from __future__ import annotations

import json
import re
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

DEFAULT_QUERY_MODE = "implicit"
SOURCE_FRONTMATTER = "frontmatter"
SOURCE_METADATA = "metadata"
SOURCE_COMBINED = "combined"
VALID_SOURCES = (
    SOURCE_FRONTMATTER,
    SOURCE_METADATA,
    SOURCE_COMBINED,
)

DISPLAY_NAME_RE = re.compile(r'^  display_name: "(?P<value>(?:[^"\\]|\\.)*)"$', re.MULTILINE)
SHORT_DESCRIPTION_RE = re.compile(
    r'^  short_description: "(?P<value>(?:[^"\\]|\\.)*)"$',
    re.MULTILINE,
)
DEFAULT_PROMPT_RE = re.compile(r'^  default_prompt: "(?P<value>(?:[^"\\]|\\.)*)"$', re.MULTILINE)
ALLOW_IMPLICIT_RE = re.compile(
    r"^  allow_implicit_invocation: (?P<value>true|false)$",
    re.MULTILINE,
)

SKILL_GLOB_PATTERNS = (
    "skills/*/SKILL.md",
)
TRIGGER_FIXTURES_ROOT = "evals/fixtures/trigger"
RESULTS_ROOT = "evals/results"
TRIGGER_KIND = "trigger"


@dataclass
class SkillEvalConfig:
    skill_name: str
    eval_file: str
    skill_file: str


@dataclass
class SkillMetadata:
    display_name: str
    short_description: str
    default_prompt: str
    allow_implicit_invocation: bool


PredictionRunner = Callable[[Path, str, int, str | None], list[bool]]


def iter_skill_files(repo_root: Path) -> list[Path]:
    skill_files: list[Path] = []
    for pattern in SKILL_GLOB_PATTERNS:
        skill_files.extend(sorted(repo_root.glob(pattern)))
    return skill_files


def decode_double_quoted_yaml(value: str) -> str:
    return bytes(value, "utf-8").decode("unicode_escape")


def extract_frontmatter(skill_path: Path) -> tuple[str, str]:
    text = skill_path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise ValueError(f"{skill_path}: missing frontmatter")

    end = text.find("\n---\n", 4)
    if end == -1:
        raise ValueError(f"{skill_path}: frontmatter not closed")

    frontmatter = text[4:end]
    lines = frontmatter.splitlines()

    name: str | None = None
    description: str | None = None

    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if stripped.startswith("name:"):
            name = stripped.split(":", 1)[1].strip()
            i += 1
            continue

        if stripped.startswith("description:"):
            raw_value = stripped.split(":", 1)[1].strip()
            if raw_value in {">", ">-", "|", "|-"}:
                i += 1
                chunks: list[str] = []
                while i < len(lines):
                    block_line = lines[i]
                    if block_line.startswith("  "):
                        chunks.append(block_line.strip())
                        i += 1
                        continue
                    break
                description = " ".join(chunk for chunk in chunks if chunk)
                continue

            description = raw_value
            i += 1
            continue

        i += 1

    if not name:
        raise ValueError(f"{skill_path}: missing name in frontmatter")
    if not description:
        raise ValueError(f"{skill_path}: missing description in frontmatter")

    return name, description


def extract_metadata(skill_path: Path) -> SkillMetadata:
    metadata_path = skill_path.parent / "agents" / "openai.yaml"
    if not metadata_path.exists():
        raise ValueError(f"{metadata_path}: missing metadata file")

    text = metadata_path.read_text(encoding="utf-8")
    display_name_match = DISPLAY_NAME_RE.search(text)
    short_description_match = SHORT_DESCRIPTION_RE.search(text)
    default_prompt_match = DEFAULT_PROMPT_RE.search(text)
    allow_implicit_match = ALLOW_IMPLICIT_RE.search(text)

    missing_fields: list[str] = []
    if display_name_match is None:
        missing_fields.append("interface.display_name")
    if short_description_match is None:
        missing_fields.append("interface.short_description")
    if default_prompt_match is None:
        missing_fields.append("interface.default_prompt")

    if missing_fields:
        missing_text = ", ".join(missing_fields)
        raise ValueError(f"{metadata_path}: missing metadata fields: {missing_text}")

    return SkillMetadata(
        display_name=decode_double_quoted_yaml(display_name_match.group("value")),
        short_description=decode_double_quoted_yaml(short_description_match.group("value")),
        default_prompt=decode_double_quoted_yaml(default_prompt_match.group("value")),
        allow_implicit_invocation=(
            allow_implicit_match.group("value") == "true"
            if allow_implicit_match is not None
            else False
        ),
    )


def fixture_path_for_skill(repo_root: Path, skill_name: str) -> Path:
    return repo_root / TRIGGER_FIXTURES_ROOT / f"{skill_name}.json"


def discover_eval_configs(repo_root: Path) -> list[SkillEvalConfig]:
    configs: list[SkillEvalConfig] = []
    missing_fixtures: list[str] = []

    for skill_path in iter_skill_files(repo_root):
        skill_name, _description = extract_frontmatter(skill_path)
        eval_path = fixture_path_for_skill(repo_root, skill_name)

        if not eval_path.exists():
            missing_fixtures.append(
                f"{skill_name}: expected {TRIGGER_FIXTURES_ROOT}/{skill_name}.json"
            )
            continue

        configs.append(
            SkillEvalConfig(
                skill_name=skill_name,
                eval_file=eval_path.relative_to(repo_root).as_posix(),
                skill_file=skill_path.relative_to(repo_root).as_posix(),
            )
        )

    if missing_fixtures:
        lines = "\n".join(f"- {item}" for item in missing_fixtures)
        raise ValueError(f"missing canonical trigger-eval fixtures:\n{lines}")

    return sorted(configs, key=lambda config: config.skill_name)


def filter_eval_configs(configs: list[SkillEvalConfig], skill_name: str | None) -> list[SkillEvalConfig]:
    if skill_name is None:
        return configs

    filtered = [config for config in configs if config.skill_name == skill_name]
    if not filtered:
        raise ValueError(f"unknown skill for eval filter: {skill_name}")
    return filtered


def case_line(index: int, row: dict[str, Any]) -> str:
    query_mode = str(row.get("query_mode", DEFAULT_QUERY_MODE))
    boundary_with = row.get("boundary_with", [])
    boundary_text = ""
    if isinstance(boundary_with, list) and boundary_with:
        boundary_text = f" boundary_with={','.join(str(item) for item in boundary_with)}"
    return f"{index}. [mode={query_mode}{boundary_text}] {str(row['query'])}"


def build_frontmatter_prompt(
    skill_name: str,
    description: str,
    eval_rows: list[dict[str, Any]],
) -> str:
    query_lines = "\n".join(case_line(idx + 1, row) for idx, row in enumerate(eval_rows))

    return f"""You are a strict skill-trigger classifier.

Evaluation source: frontmatter description only.

Target skill name: {skill_name}
Target skill description:
{description}

Task:
For each user query below, decide if this TARGET skill should trigger.

Rules:
- Return true only when the query directly falls within this target skill scope.
- Return false when the query is better handled by a different DatoCMS skill domain.
- If uncertain, prefer false.
- Treat `mode=explicit` as an explicit named-skill invocation test.
- Treat `mode=implicit` as a natural-language routing test.
- Treat `mode=overlap` as a boundary case where the query may plausibly fit multiple skills.

Output:
Return exactly one JSON object with this shape:
{{"predictions":[boolean,...]}}
The predictions array must contain exactly {len(eval_rows)} booleans, in the same order as the queries.
No explanation.

Queries:
{query_lines}
"""


def build_metadata_prompt(
    skill_name: str,
    metadata: SkillMetadata,
    eval_rows: list[dict[str, Any]],
) -> str:
    query_lines = "\n".join(case_line(idx + 1, row) for idx, row in enumerate(eval_rows))
    implicit_policy = "true" if metadata.allow_implicit_invocation else "false"

    return f"""You are a strict skill-trigger classifier.

Evaluation source: agent metadata only.

Target skill name: {skill_name}
Display name: {metadata.display_name}
Short description: {metadata.short_description}
Default prompt: {metadata.default_prompt}
Allow implicit invocation: {implicit_policy}

Task:
For each user query below, decide if this TARGET skill should trigger.

Rules:
- Use only the metadata above to decide the skill boundary.
- Return true only when the query clearly fits this target better than other DatoCMS skills.
- If `mode=implicit` and allow implicit invocation is false, return false.
- If `mode=explicit`, treat the case as an explicit named-skill invocation; this can return true even when allow implicit invocation is false.
- If `mode=overlap`, treat the case as a natural-language boundary test unless the query itself explicitly invokes the skill.
- If uncertain, prefer false.

Output:
Return exactly one JSON object with this shape:
{{"predictions":[boolean,...]}}
The predictions array must contain exactly {len(eval_rows)} booleans, in the same order as the queries.
No explanation.

Queries:
{query_lines}
"""


def build_combined_prompt(
    skill_name: str,
    description: str,
    metadata: SkillMetadata,
    eval_rows: list[dict[str, Any]],
) -> str:
    query_lines = "\n".join(case_line(idx + 1, row) for idx, row in enumerate(eval_rows))
    implicit_policy = "true" if metadata.allow_implicit_invocation else "false"

    return f"""You are a strict skill-trigger classifier.

Evaluation source: frontmatter plus agent metadata.

Target skill name: {skill_name}

Frontmatter description:
{description}

Agent metadata:
- display_name: {metadata.display_name}
- short_description: {metadata.short_description}
- default_prompt: {metadata.default_prompt}
- allow_implicit_invocation: {implicit_policy}

Task:
For each user query below, decide if this TARGET skill should trigger.

Rules:
- Use the frontmatter description for the full scope boundary.
- Use the agent metadata as the routing surface and policy signal.
- Return true only when the query clearly fits this target better than other DatoCMS skills.
- If `mode=implicit` and allow implicit invocation is false, return false.
- If `mode=explicit`, treat the case as an explicit named-skill invocation; this can return true even when allow implicit invocation is false.
- If `mode=overlap`, treat the case as a boundary test where another listed skill may also be reasonable.
- If uncertain, prefer false.

Output:
Return exactly one JSON object with this shape:
{{"predictions":[boolean,...]}}
The predictions array must contain exactly {len(eval_rows)} booleans, in the same order as the queries.
No explanation.

Queries:
{query_lines}
"""


def build_prompt(
    source: str,
    skill_name: str,
    description: str,
    metadata: SkillMetadata,
    eval_rows: list[dict[str, Any]],
) -> str:
    if source == SOURCE_FRONTMATTER:
        return build_frontmatter_prompt(skill_name, description, eval_rows)
    if source == SOURCE_METADATA:
        return build_metadata_prompt(skill_name, metadata, eval_rows)
    if source == SOURCE_COMBINED:
        return build_combined_prompt(skill_name, description, metadata, eval_rows)
    raise ValueError(f"unsupported source: {source}")


def result_path_for(
    results_root: Path,
    skill_name: str,
    track: str,
    source: str,
) -> Path:
    return results_root / TRIGGER_KIND / skill_name / track / source / "results.json"


def evaluate_skill(
    repo_root: Path,
    config: SkillEvalConfig,
    results_root: Path,
    track: str,
    model: str | None,
    source: str,
    prediction_runner: PredictionRunner,
) -> dict[str, Any]:
    eval_path = repo_root / config.eval_file
    skill_path = repo_root / config.skill_file

    skill_name, description = extract_frontmatter(skill_path)
    if skill_name != config.skill_name:
        raise ValueError(
            f"{skill_path}: discovered skill name `{config.skill_name}` does not match frontmatter `{skill_name}`"
        )
    metadata = extract_metadata(skill_path)
    eval_queries = json.loads(eval_path.read_text(encoding="utf-8"))

    if not isinstance(eval_queries, list):
        raise ValueError(f"{eval_path}: expected array of eval cases")

    prompt = build_prompt(source, skill_name, description, metadata, eval_queries)
    predictions = prediction_runner(repo_root, prompt, len(eval_queries), model)

    results: list[dict[str, Any]] = []
    passed = 0

    for row, prediction in zip(eval_queries, predictions, strict=True):
        should_trigger = bool(row["should_trigger"])
        triggers = 1 if prediction else 0
        trigger_rate = float(triggers)
        case_pass = prediction == should_trigger
        if case_pass:
            passed += 1

        results.append(
            {
                "query": str(row["query"]),
                "should_trigger": should_trigger,
                "query_mode": str(row.get("query_mode", DEFAULT_QUERY_MODE)),
                "boundary_with": row.get("boundary_with", []),
                "trigger_rate": trigger_rate,
                "triggers": triggers,
                "runs": 1,
                "pass": case_pass,
            }
        )

    payload = {
        "skill_name": skill_name,
        "description": description if source != SOURCE_METADATA else metadata.short_description,
        "evaluation_source": source,
        "results": results,
        "summary": {
            "total": len(results),
            "passed": passed,
            "failed": len(results) - passed,
        },
    }

    output_path = result_path_for(results_root, skill_name, track, source)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    return {
        "skill_name": skill_name,
        "output_path": str(output_path),
        "passed": passed,
        "total": len(results),
    }
