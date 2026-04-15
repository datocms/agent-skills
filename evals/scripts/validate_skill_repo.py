#!/usr/bin/env python3
"""Validate repo invariants for DatoCMS skill documentation."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

BANNED_SKILL_BODY_PATTERNS = (
    "AskUserQuestion",
    "Read tool",
    "Claude Code alias",
    "slash alias",
)

REFERENCE_PATH_RE = re.compile(r"`(((?:\.\./)+|references/)[^`]+\.md)`")
ROUTED_SKILL_RE = re.compile(r"\*\*(datocms-[a-z0-9-]+)\*\*")

SYNC_NAME_RE = re.compile(r"^# synced_from_name: (?P<value>.+)$", re.MULTILINE)
SYNC_DESC_HASH_RE = re.compile(
    r"^# synced_from_description_sha256: (?P<value>[0-9a-f]{64})$",
    re.MULTILINE,
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
RECIPE_GLOB_PATTERN = "skills/datocms-setup/recipes/*/*/recipe.md"
EVAL_FIXTURE_SUFFIX = "-skill-eval.json"
EVAL_RESULT_SUFFIX = "-eval-results.json"
SETUP_ROUTER_EVAL_FILENAME = "datocms-setup-router-eval.json"
RESULTS_MANIFEST_NAME = "manifest.json"
DEFAULT_QUERY_MODE = "implicit"
ALLOWED_QUERY_MODES = {
    "implicit",
    "explicit",
    "overlap",
}
ALLOWED_SETUP_ROUTER_STAGE_B = {
    "none",
    "visual-editing",
    "vercel-overlay-conflict",
    "site-search",
    "graphql-types",
    "migrations",
}

SCAFFOLD_CAPABLE_SKILLS = {
    "datocms-frontend-integrations",
    "datocms-setup",
}

STALE_SCAFFOLD_MARKETING_PATTERNS = (
    "or uses TODO placeholders",
    "or TODO placeholders",
    "placeholder noted for user to fill in",
)

IGNORED_GIT_STATUS_PREFIXES = (
    "?? local/",
    "?? local",
)


@dataclass(frozen=True)
class SkillFrontmatter:
    name: str
    description: str
    disable_model_invocation: bool


@dataclass(frozen=True)
class SkillMetadata:
    synced_name: str
    synced_description_hash: str
    display_name: str
    short_description: str
    default_prompt: str
    allow_implicit_invocation: bool | None


def _decode_double_quoted_yaml(value: str) -> str:
    return bytes(value, "utf-8").decode("unicode_escape")


def _extract_frontmatter(path: Path) -> SkillFrontmatter:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise ValueError(f"{path}: missing frontmatter")

    end = text.find("\n---\n", 4)
    if end == -1:
        raise ValueError(f"{path}: frontmatter not closed")

    lines = text[4:end].splitlines()

    name: str | None = None
    description: str | None = None
    disable_model_invocation = False

    i = 0
    while i < len(lines):
        stripped = lines[i].strip()

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
                    if not block_line.strip():
                        i += 1
                        continue
                    break
                description = " ".join(chunk for chunk in chunks if chunk)
                continue

            description = raw_value
            i += 1
            continue

        if stripped.startswith("disable-model-invocation:"):
            disable_model_invocation = stripped.split(":", 1)[1].strip().lower() == "true"

        i += 1

    if not name:
        raise ValueError(f"{path}: missing name in frontmatter")
    if not description:
        raise ValueError(f"{path}: missing description in frontmatter")

    return SkillFrontmatter(
        name=name,
        description=description,
        disable_model_invocation=disable_model_invocation,
    )


def _parse_metadata_file(path: Path) -> SkillMetadata:
    text = path.read_text(encoding="utf-8")

    synced_name_match = SYNC_NAME_RE.search(text)
    synced_hash_match = SYNC_DESC_HASH_RE.search(text)
    display_name_match = DISPLAY_NAME_RE.search(text)
    short_description_match = SHORT_DESCRIPTION_RE.search(text)
    default_prompt_match = DEFAULT_PROMPT_RE.search(text)
    allow_implicit_match = ALLOW_IMPLICIT_RE.search(text)

    missing_fields = []
    if synced_name_match is None:
        missing_fields.append("synced_from_name")
    if synced_hash_match is None:
        missing_fields.append("synced_from_description_sha256")
    if display_name_match is None:
        missing_fields.append("interface.display_name")
    if short_description_match is None:
        missing_fields.append("interface.short_description")
    if default_prompt_match is None:
        missing_fields.append("interface.default_prompt")

    if missing_fields:
        missing = ", ".join(missing_fields)
        raise ValueError(f"{path}: missing metadata fields: {missing}")

    return SkillMetadata(
        synced_name=synced_name_match.group("value"),
        synced_description_hash=synced_hash_match.group("value"),
        display_name=_decode_double_quoted_yaml(display_name_match.group("value")),
        short_description=_decode_double_quoted_yaml(short_description_match.group("value")),
        default_prompt=_decode_double_quoted_yaml(default_prompt_match.group("value")),
        allow_implicit_invocation=(
            allow_implicit_match.group("value") == "true"
            if allow_implicit_match is not None
            else None
        ),
    )


def _iter_skill_files(repo_root: Path) -> list[Path]:
    skill_files: list[Path] = []
    for pattern in SKILL_GLOB_PATTERNS:
        skill_files.extend(sorted(repo_root.glob(pattern)))
    return skill_files


def _iter_recipe_files(repo_root: Path) -> list[Path]:
    return sorted(repo_root.glob(RECIPE_GLOB_PATTERN))


def _extract_json_payload(raw: str, source: Path) -> dict[str, object]:
    first_brace = raw.find("{")
    if first_brace < 0:
        raise ValueError(f"{source}: no JSON object found")

    decoder = json.JSONDecoder()
    last_error: ValueError | None = None
    cursor = first_brace

    while cursor >= 0:
        try:
            parsed, _end = decoder.raw_decode(raw[cursor:])
            if isinstance(parsed, dict):
                return parsed
            raise ValueError(f"{source}: JSON root is not an object")
        except ValueError as exc:
            last_error = exc
            cursor = raw.find("{", cursor + 1)

    if last_error is not None:
        raise ValueError(f"{source}: could not parse JSON payload") from last_error
    raise ValueError(f"{source}: could not parse JSON payload")


def _normalize_query_mode(value: object) -> str:
    if not isinstance(value, str):
        return DEFAULT_QUERY_MODE
    normalized = value.strip().lower()
    if not normalized:
        return DEFAULT_QUERY_MODE
    return normalized


def _normalize_boundary_with(value: object) -> list[str]:
    if not isinstance(value, list):
        return []

    normalized: list[str] = []
    seen: set[str] = set()
    for item in value:
        if not isinstance(item, str):
            continue
        skill_name = item.strip()
        if not skill_name or skill_name in seen:
            continue
        seen.add(skill_name)
        normalized.append(skill_name)
    return normalized


def _validate_reference_paths(skill_file: Path, errors: list[str]) -> None:
    text = skill_file.read_text(encoding="utf-8")
    for rel_path, _prefix in REFERENCE_PATH_RE.findall(text):
        resolved = (skill_file.parent / rel_path).resolve()
        if not resolved.exists():
            errors.append(f"{skill_file}: missing referenced file {rel_path}")


def _validate_banned_skill_body_patterns(skill_file: Path, errors: list[str]) -> None:
    text = skill_file.read_text(encoding="utf-8")
    for pattern in BANNED_SKILL_BODY_PATTERNS:
        if pattern in text:
            errors.append(f"{skill_file}: banned host-specific wording `{pattern}`")


def _validate_routed_skill_names(
    skill_file: Path,
    canonical_skill_names: set[str],
    errors: list[str],
) -> None:
    text = skill_file.read_text(encoding="utf-8")
    for routed_name in ROUTED_SKILL_RE.findall(text):
        if routed_name not in canonical_skill_names:
            errors.append(
                f"{skill_file}: routed skill name `{routed_name}` does not match any frontmatter name"
            )


def _validate_metadata(skill_file: Path, frontmatter: SkillFrontmatter, errors: list[str]) -> None:
    metadata_path = skill_file.parent / "agents" / "openai.yaml"
    if not metadata_path.exists():
        errors.append(f"{skill_file}: missing agents/openai.yaml metadata")
        return

    try:
        metadata = _parse_metadata_file(metadata_path)
    except ValueError as exc:
        errors.append(str(exc))
        return

    expected_hash = hashlib.sha256(frontmatter.description.encode("utf-8")).hexdigest()
    expected_allow_implicit = not frontmatter.disable_model_invocation

    if metadata.synced_name != frontmatter.name:
        errors.append(
            f"{metadata_path}: synced skill name `{metadata.synced_name}` does not match `{frontmatter.name}`"
        )

    if metadata.synced_description_hash != expected_hash:
        errors.append(f"{metadata_path}: synced description hash is stale relative to SKILL.md")

    if not metadata.display_name.strip():
        errors.append(f"{metadata_path}: interface.display_name must not be empty")

    short_len = len(metadata.short_description)
    if not (25 <= short_len <= 64):
        errors.append(
            f"{metadata_path}: interface.short_description must be 25-64 characters (got {short_len})"
        )

    if f"${frontmatter.name}" not in metadata.default_prompt:
        errors.append(f"{metadata_path}: interface.default_prompt must reference ${frontmatter.name}")

    if expected_allow_implicit:
        if metadata.allow_implicit_invocation is not True:
            errors.append(
                f"{metadata_path}: policy.allow_implicit_invocation must be true"
            )
    else:
        if metadata.allow_implicit_invocation is not None:
            errors.append(
                f"{metadata_path}: omit policy.allow_implicit_invocation for explicit-only skills"
            )


def _validate_scaffold_contract(skill_file: Path, frontmatter: SkillFrontmatter, errors: list[str]) -> None:
    if frontmatter.name not in SCAFFOLD_CAPABLE_SKILLS:
        return

    text = skill_file.read_text(encoding="utf-8")
    if "scaffolded" not in text or "production-ready" not in text:
        errors.append(
            f"{skill_file}: scaffold-capable skill must declare both `scaffolded` and `production-ready` states"
        )


def _validate_scaffold_marketing(repo_root: Path, errors: list[str]) -> None:
    readme = (repo_root / "README.md").read_text(encoding="utf-8")

    if "scaffolded" not in readme or "production-ready" not in readme:
        errors.append("README.md: missing scaffolded vs production-ready wording")

    for pattern in STALE_SCAFFOLD_MARKETING_PATTERNS:
        if pattern in readme:
            errors.append(f"README.md: stale scaffold wording `{pattern}`")


def _validate_eval_fixture_payload(
    path: Path,
    skill_name: str,
    canonical_skill_names: set[str],
    errors: list[str],
) -> None:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"{path}: invalid JSON ({exc})")
        return

    if not isinstance(payload, list) or not payload:
        errors.append(f"{path}: eval fixture must be a non-empty JSON array")
        return

    true_count = 0
    false_count = 0

    for index, row in enumerate(payload):
        if not isinstance(row, dict):
            errors.append(f"{path}: eval row {index} must be an object")
            continue

        query = row.get("query")
        should_trigger = row.get("should_trigger")
        query_mode = row.get("query_mode", DEFAULT_QUERY_MODE)
        boundary_with = row.get("boundary_with", [])

        if not isinstance(query, str) or not query.strip():
            errors.append(f"{path}: eval row {index} must include a non-empty string `query`")

        if not isinstance(should_trigger, bool):
            errors.append(f"{path}: eval row {index} must include boolean `should_trigger`")
            continue

        if not isinstance(query_mode, str) or query_mode not in ALLOWED_QUERY_MODES:
            allowed_modes = ", ".join(sorted(ALLOWED_QUERY_MODES))
            errors.append(
                f"{path}: eval row {index} has invalid `query_mode`; expected one of {allowed_modes}"
            )
            query_mode = DEFAULT_QUERY_MODE

        if not isinstance(boundary_with, list) or any(
            not isinstance(item, str) or not item.strip() for item in boundary_with
        ):
            errors.append(f"{path}: eval row {index} must use string array `boundary_with`")
            boundary_with = []

        normalized_boundary_with = []
        seen_boundary_names: set[str] = set()
        for boundary_name in boundary_with:
            if not isinstance(boundary_name, str):
                continue
            normalized_name = boundary_name.strip()
            if not normalized_name or normalized_name in seen_boundary_names:
                continue
            seen_boundary_names.add(normalized_name)
            normalized_boundary_with.append(normalized_name)

            if normalized_name == skill_name:
                errors.append(
                    f"{path}: eval row {index} `boundary_with` must not reference the owning skill"
                )
            elif normalized_name not in canonical_skill_names:
                errors.append(
                    f"{path}: eval row {index} references unknown boundary skill `{normalized_name}`"
                )

        if query_mode == "overlap" and not normalized_boundary_with:
            errors.append(
                f"{path}: eval row {index} uses `query_mode: overlap` but has no `boundary_with` skills"
            )
        if query_mode != "overlap" and normalized_boundary_with:
            errors.append(
                f"{path}: eval row {index} may use `boundary_with` only with `query_mode: overlap`"
            )

        if should_trigger:
            true_count += 1
        else:
            false_count += 1

    if true_count == 0 or false_count == 0:
        errors.append(f"{path}: eval fixture must include both positive and negative cases")


def _validate_eval_fixture_coverage(
    repo_root: Path,
    canonical_skill_names: set[str],
    errors: list[str],
) -> None:
    eval_dir = repo_root / "evals"
    actual_paths = sorted(eval_dir.glob(f"*{EVAL_FIXTURE_SUFFIX}"))
    actual_names = set()

    for path in actual_paths:
        skill_name = path.name[: -len(EVAL_FIXTURE_SUFFIX)]
        actual_names.add(skill_name)

        if skill_name not in canonical_skill_names:
            errors.append(
                f"{path}: eval fixture filename does not match any canonical skill name"
            )

        _validate_eval_fixture_payload(path, skill_name, canonical_skill_names, errors)

    missing_names = sorted(canonical_skill_names - actual_names)
    for skill_name in missing_names:
        errors.append(
            f"evals/{skill_name}{EVAL_FIXTURE_SUFFIX}: missing canonical eval fixture"
        )


def _load_results_manifest(
    results_dir: Path,
    canonical_skill_names: set[str],
    errors: list[str],
) -> tuple[set[str], dict[str, str]] | None:
    manifest_path = results_dir / RESULTS_MANIFEST_NAME
    if not manifest_path.exists():
        return None

    try:
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"{manifest_path}: invalid JSON ({exc})")
        return None

    if not isinstance(payload, dict):
        errors.append(f"{manifest_path}: manifest root must be an object")
        return None

    included_skills = payload.get("included_skills")
    excluded_skills = payload.get("excluded_skills")

    if not isinstance(included_skills, list) or any(
        not isinstance(item, str) or not item.strip() for item in included_skills
    ):
        errors.append(f"{manifest_path}: `included_skills` must be a string array")
        return None

    if not isinstance(excluded_skills, dict) or any(
        not isinstance(key, str)
        or not key.strip()
        or not isinstance(value, str)
        or not value.strip()
        for key, value in excluded_skills.items()
    ):
        errors.append(f"{manifest_path}: `excluded_skills` must map skill names to reasons")
        return None

    included_set: set[str] = set()
    for skill_name in included_skills:
        normalized = skill_name.strip()
        if normalized in included_set:
            errors.append(f"{manifest_path}: duplicate included skill `{normalized}`")
            continue
        included_set.add(normalized)
        if normalized not in canonical_skill_names:
            errors.append(f"{manifest_path}: unknown included skill `{normalized}`")

    excluded_map: dict[str, str] = {}
    for skill_name, reason in excluded_skills.items():
        normalized = skill_name.strip()
        if normalized in excluded_map:
            errors.append(f"{manifest_path}: duplicate excluded skill `{normalized}`")
            continue
        excluded_map[normalized] = reason.strip()
        if normalized not in canonical_skill_names:
            errors.append(f"{manifest_path}: unknown excluded skill `{normalized}`")

    overlap = sorted(included_set & set(excluded_map))
    for skill_name in overlap:
        errors.append(f"{manifest_path}: skill `{skill_name}` cannot be both included and excluded")

    manifest_skill_names = included_set | set(excluded_map)
    missing_skills = sorted(canonical_skill_names - manifest_skill_names)
    for skill_name in missing_skills:
        errors.append(
            f"{manifest_path}: missing coverage decision for canonical skill `{skill_name}`"
        )

    extra_skills = sorted(manifest_skill_names - canonical_skill_names)
    for skill_name in extra_skills:
        errors.append(f"{manifest_path}: unknown skill `{skill_name}` listed in coverage manifest")

    return included_set, excluded_map


def _validate_eval_result_names(
    repo_root: Path,
    canonical_skill_names: set[str],
    errors: list[str],
) -> None:
    results_dir = repo_root / "evals" / "results"
    manifest = _load_results_manifest(results_dir, canonical_skill_names, errors)

    if manifest is None:
        expected_included_skills = canonical_skill_names
        expected_excluded_skills: dict[str, str] = {}
    else:
        expected_included_skills, expected_excluded_skills = manifest

    actual_result_skills: set[str] = set()
    for path in sorted(results_dir.glob(f"*{EVAL_RESULT_SUFFIX}")):
        try:
            payload = _extract_json_payload(path.read_text(encoding="utf-8"), path)
        except ValueError as exc:
            errors.append(str(exc))
            continue

        skill_name = payload.get("skill_name")
        if not isinstance(skill_name, str) or not skill_name.strip():
            errors.append(f"{path}: result file must include string `skill_name`")
            continue

        normalized_skill_name = skill_name.strip()
        actual_result_skills.add(normalized_skill_name)

        expected_name = f"{normalized_skill_name}{EVAL_RESULT_SUFFIX}"
        if path.name != expected_name:
            errors.append(
                f"{path}: result filename should be `{expected_name}` to match canonical skill name"
            )

        if normalized_skill_name in expected_excluded_skills:
            errors.append(
                f"{path}: result file exists for explicitly excluded skill `{normalized_skill_name}`"
            )
        elif normalized_skill_name not in expected_included_skills:
            errors.append(
                f"{path}: result file is not covered by the published results manifest"
            )

    missing_results = sorted(expected_included_skills - actual_result_skills)
    for skill_name in missing_results:
        errors.append(
            f"evals/results/{skill_name}{EVAL_RESULT_SUFFIX}: missing checked-in result for included skill"
        )


def _load_setup_recipe_ids(repo_root: Path, errors: list[str]) -> set[str]:
    manifest_path = (
        repo_root / "skills" / "datocms-setup" / "references" / "recipe-manifest.json"
    )
    if not manifest_path.exists():
        return set()

    try:
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"{manifest_path}: invalid JSON ({exc})")
        return set()

    recipes = payload.get("recipes", [])
    if not isinstance(recipes, list):
        errors.append(f"{manifest_path}: manifest must include a non-empty `recipes` array")
        return set()

    recipe_ids: set[str] = set()
    for index, recipe in enumerate(recipes):
        if not isinstance(recipe, dict):
            errors.append(f"{manifest_path}: recipe {index} must be an object")
            continue
        recipe_id = recipe.get("id")
        if isinstance(recipe_id, str) and recipe_id.strip():
            recipe_ids.add(recipe_id.strip())
    return recipe_ids


def _expand_setup_recipe_closure(
    recipe_id: str,
    recipe_map: dict[str, dict[str, object]],
    errors: list[str],
    source: Path,
    index: int,
    _seen: set[str] | None = None,
) -> set[str]:
    seen = set() if _seen is None else set(_seen)
    if recipe_id in seen:
        return set()
    seen.add(recipe_id)

    recipe = recipe_map.get(recipe_id)
    if recipe is None:
        errors.append(f"{source}: router eval row {index} references unknown recipe `{recipe_id}`")
        return set()

    closure = {recipe_id}
    prerequisites = recipe.get("prerequisites", [])
    if not isinstance(prerequisites, list):
        errors.append(f"{source}: manifest recipe `{recipe_id}` must include string array `prerequisites`")
        return closure

    for prerequisite in prerequisites:
        if not isinstance(prerequisite, str) or not prerequisite.strip():
            continue
        closure.update(
            _expand_setup_recipe_closure(
                prerequisite.strip(),
                recipe_map,
                errors,
                source,
                index,
                seen,
            )
        )
    return closure


def _extract_manual_matrix_negative_controls(path: Path, errors: list[str]) -> list[str]:
    if not path.exists():
        errors.append(f"{path}: missing datocms-setup manual matrix")
        return []

    text = path.read_text(encoding="utf-8")
    marker = "## Negative controls"
    start = text.find(marker)
    if start == -1:
        errors.append(f"{path}: missing `## Negative controls` section")
        return []

    section = text[start:].splitlines()
    queries: list[str] = []
    for line in section:
        stripped = line.strip()
        if not stripped.startswith("| `"):
            continue
        parts = stripped.split("`")
        if len(parts) >= 3 and parts[1].strip():
            queries.append(parts[1].strip())
    return queries


def _validate_setup_router_eval(repo_root: Path, errors: list[str]) -> None:
    fixture_path = repo_root / "evals" / SETUP_ROUTER_EVAL_FILENAME
    if not fixture_path.exists():
        errors.append(f"{fixture_path}: missing datocms-setup router eval fixture")
        return

    try:
        payload = json.loads(fixture_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"{fixture_path}: invalid JSON ({exc})")
        return

    if not isinstance(payload, list) or not payload:
        errors.append(f"{fixture_path}: router eval fixture must be a non-empty JSON array")
        return

    manifest_path = (
        repo_root / "skills" / "datocms-setup" / "references" / "recipe-manifest.json"
    )
    try:
        recipe_payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"{manifest_path}: invalid JSON ({exc})")
        return
    recipe_rows = recipe_payload.get("recipes", []) if isinstance(recipe_payload, dict) else []
    recipe_map: dict[str, dict[str, object]] = {}
    for recipe in recipe_rows:
        if not isinstance(recipe, dict):
            continue
        recipe_id = recipe.get("id")
        if isinstance(recipe_id, str) and recipe_id.strip():
            recipe_map[recipe_id.strip()] = recipe

    if not recipe_map:
        errors.append(f"{manifest_path}: unable to load recipe ids for router eval validation")
        return

    manual_matrix_path = repo_root / "evals" / "datocms-setup-manual-matrix.md"
    expected_negative_controls = set(_extract_manual_matrix_negative_controls(manual_matrix_path, errors))

    covered_recipe_ids: set[str] = set()
    covered_stage_b: set[str] = set()
    seen_negative_queries: set[str] = set()

    for index, row in enumerate(payload):
        if not isinstance(row, dict):
            errors.append(f"{fixture_path}: router eval row {index} must be an object")
            continue

        query = row.get("query")
        should_route = row.get("should_route")
        expected_recipes = row.get("expected_recipes")
        expected_stage_a = row.get("expected_stage_a")
        expected_stage_b = row.get("expected_stage_b")
        notes = row.get("notes", "")

        if not isinstance(query, str) or not query.strip():
            errors.append(f"{fixture_path}: router eval row {index} must include a non-empty string `query`")
            query = ""
        if not isinstance(should_route, bool):
            errors.append(f"{fixture_path}: router eval row {index} must include boolean `should_route`")
            continue
        if not isinstance(expected_recipes, list) or any(
            not isinstance(item, str) or not item.strip() for item in expected_recipes
        ):
            errors.append(
                f"{fixture_path}: router eval row {index} must include string array `expected_recipes`"
            )
            expected_recipes = []
        if not isinstance(expected_stage_a, bool):
            errors.append(
                f"{fixture_path}: router eval row {index} must include boolean `expected_stage_a`"
            )
            expected_stage_a = False
        if not isinstance(expected_stage_b, str) or expected_stage_b not in ALLOWED_SETUP_ROUTER_STAGE_B:
            allowed = ", ".join(sorted(ALLOWED_SETUP_ROUTER_STAGE_B))
            errors.append(
                f"{fixture_path}: router eval row {index} has invalid `expected_stage_b`; expected one of {allowed}"
            )
            expected_stage_b = "none"
        if not isinstance(notes, str):
            errors.append(f"{fixture_path}: router eval row {index} `notes` must be a string when present")

        normalized_recipes: list[str] = []
        seen_recipes: set[str] = set()
        for recipe_id in expected_recipes:
            normalized_recipe = recipe_id.strip()
            if normalized_recipe in seen_recipes:
                errors.append(
                    f"{fixture_path}: router eval row {index} duplicates recipe `{normalized_recipe}`"
                )
                continue
            seen_recipes.add(normalized_recipe)
            normalized_recipes.append(normalized_recipe)

            if normalized_recipe == "visual-editing":
                errors.append(
                    f"{fixture_path}: router eval row {index} must use expanded recipes, not the `visual-editing` bundle alias"
                )
            elif normalized_recipe not in recipe_map:
                errors.append(
                    f"{fixture_path}: router eval row {index} references unknown recipe `{normalized_recipe}`"
                )

        if should_route:
            if not normalized_recipes:
                errors.append(
                    f"{fixture_path}: router eval row {index} routes to datocms-setup but has no expected recipes"
                )
            for recipe_id in normalized_recipes:
                covered_recipe_ids.add(recipe_id)

            implied_closure: set[str] = set()
            for recipe_id in normalized_recipes:
                implied_closure.update(
                    _expand_setup_recipe_closure(
                        recipe_id,
                        recipe_map,
                        errors,
                        fixture_path,
                        index,
                    )
                )

            missing_prerequisites = sorted(
                recipe_id for recipe_id in implied_closure if recipe_id not in normalized_recipes
            )
            if missing_prerequisites:
                missing_text = ", ".join(missing_prerequisites)
                errors.append(
                    f"{fixture_path}: router eval row {index} omits expanded prerequisites: {missing_text}"
                )

            covered_stage_b.add(expected_stage_b)
            query_lower = query.lower()
            if (
                "visual editing" in query_lower
                or "preview and editor workflows" in query_lower
                or "preview/editor workflows" in query_lower
                or "side-by-side editing" in query_lower
                or expected_stage_b == "visual-editing"
            ):
                covered_recipe_ids.add("visual-editing")
        else:
            if normalized_recipes:
                errors.append(
                    f"{fixture_path}: router eval row {index} must keep `expected_recipes` empty when should_route is false"
                )
            if expected_stage_a:
                errors.append(
                    f"{fixture_path}: router eval row {index} must keep `expected_stage_a` false when should_route is false"
                )
            if expected_stage_b != "none":
                errors.append(
                    f"{fixture_path}: router eval row {index} must keep `expected_stage_b` as `none` when should_route is false"
                )
            if query:
                seen_negative_queries.add(query)

    missing_recipe_ids = sorted(set(recipe_map) - covered_recipe_ids)
    for recipe_id in missing_recipe_ids:
        errors.append(f"{fixture_path}: router eval coverage is missing recipe `{recipe_id}`")

    missing_stage_b = sorted(ALLOWED_SETUP_ROUTER_STAGE_B - {"none"} - covered_stage_b)
    for stage_b in missing_stage_b:
        errors.append(f"{fixture_path}: router eval coverage is missing Stage B branch `{stage_b}`")

    missing_negative_controls = sorted(expected_negative_controls - seen_negative_queries)
    for query in missing_negative_controls:
        errors.append(
            f"{fixture_path}: router eval is missing manual-matrix negative control `{query}`"
        )


def _validate_result_fixture_sync(
    repo_root: Path,
    errors: list[str],
) -> None:
    results_dir = repo_root / "evals" / "results"

    for path in sorted(results_dir.glob(f"*{EVAL_RESULT_SUFFIX}")):
        try:
            payload = _extract_json_payload(path.read_text(encoding="utf-8"), path)
        except ValueError as exc:
            errors.append(str(exc))
            continue

        skill_name = payload.get("skill_name")
        result_rows = payload.get("results")
        if not isinstance(skill_name, str) or not skill_name.strip():
            errors.append(f"{path}: result file must include string `skill_name`")
            continue
        if not isinstance(result_rows, list):
            errors.append(f"{path}: result file must include list `results`")
            continue

        fixture_path = repo_root / "evals" / f"{skill_name.strip()}{EVAL_FIXTURE_SUFFIX}"
        if not fixture_path.exists():
            errors.append(f"{path}: missing canonical fixture `{fixture_path.name}` for freshness check")
            continue

        try:
            fixture_rows = json.loads(fixture_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            errors.append(f"{fixture_path}: invalid JSON ({exc})")
            continue

        if not isinstance(fixture_rows, list):
            errors.append(f"{fixture_path}: eval fixture must be a JSON array")
            continue

        if len(result_rows) != len(fixture_rows):
            errors.append(
                f"{path}: result row count {len(result_rows)} does not match fixture count {len(fixture_rows)}"
            )

        for index, (fixture_row, result_row) in enumerate(zip(fixture_rows, result_rows)):
            if not isinstance(fixture_row, dict):
                errors.append(f"{fixture_path}: eval row {index} must be an object")
                continue
            if not isinstance(result_row, dict):
                errors.append(f"{path}: result row {index} must be an object")
                continue

            fixture_query = fixture_row.get("query")
            result_query = result_row.get("query")
            if fixture_query != result_query:
                errors.append(
                    f"{path}: result row {index} query does not match fixture order/content"
                )

            fixture_should_trigger = fixture_row.get("should_trigger")
            result_should_trigger = result_row.get("should_trigger")
            if fixture_should_trigger != result_should_trigger:
                errors.append(
                    f"{path}: result row {index} should_trigger does not match fixture"
                )

            fixture_mode = _normalize_query_mode(fixture_row.get("query_mode", DEFAULT_QUERY_MODE))
            result_mode = _normalize_query_mode(result_row.get("query_mode", DEFAULT_QUERY_MODE))
            if fixture_mode != result_mode:
                errors.append(f"{path}: result row {index} query_mode does not match fixture")

            fixture_boundary = _normalize_boundary_with(fixture_row.get("boundary_with", []))
            result_boundary = _normalize_boundary_with(result_row.get("boundary_with", []))
            if fixture_boundary != result_boundary:
                errors.append(f"{path}: result row {index} boundary_with does not match fixture")


def _validate_astro_imports(repo_root: Path, errors: list[str]) -> None:
    astro_refs = sorted(
        (repo_root / "skills" / "datocms-frontend-integrations" / "references").glob("astro*.md")
    )
    for astro_ref in astro_refs:
        text = astro_ref.read_text(encoding="utf-8")
        if "from '@datocms/astro'" in text:
            errors.append(
                f"{astro_ref}: Astro references must use subpath imports, not `from '@datocms/astro'`"
            )


def _validate_setup_manifest(repo_root: Path, errors: list[str]) -> None:
    skill_root = repo_root / "skills" / "datocms-setup"
    if not skill_root.exists():
        return

    manifest_path = skill_root / "references" / "recipe-manifest.json"
    if not manifest_path.exists():
        errors.append(f"{manifest_path}: missing setup recipe manifest")
        return

    try:
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"{manifest_path}: invalid JSON ({exc})")
        return

    if not isinstance(payload, dict):
        errors.append(f"{manifest_path}: manifest root must be an object")
        return

    recipes = payload.get("recipes")
    if not isinstance(recipes, list) or not recipes:
        errors.append(f"{manifest_path}: manifest must include a non-empty `recipes` array")
        return

    recipe_ids: set[str] = set()
    manifest_recipe_paths: set[str] = set()

    for index, recipe in enumerate(recipes):
        if not isinstance(recipe, dict):
            errors.append(f"{manifest_path}: recipe {index} must be an object")
            continue

        recipe_id = recipe.get("id")
        recipe_path = recipe.get("path")
        prerequisites = recipe.get("prerequisites")
        assets = recipe.get("assets")
        scripts = recipe.get("scripts")
        shared_references = recipe.get("shared_references")

        if not isinstance(recipe_id, str) or not recipe_id.strip():
            errors.append(f"{manifest_path}: recipe {index} must include non-empty string `id`")
            continue

        if recipe_id in recipe_ids:
            errors.append(f"{manifest_path}: duplicate recipe id `{recipe_id}`")
        recipe_ids.add(recipe_id)

        if not isinstance(recipe_path, str) or not recipe_path.strip():
            errors.append(f"{manifest_path}: recipe `{recipe_id}` must include non-empty string `path`")
        else:
            manifest_recipe_paths.add(recipe_path)
            resolved_recipe = skill_root / recipe_path
            if not resolved_recipe.exists():
                errors.append(f"{manifest_path}: recipe `{recipe_id}` points to missing path `{recipe_path}`")

        if not isinstance(prerequisites, list) or any(not isinstance(item, str) for item in prerequisites):
            errors.append(f"{manifest_path}: recipe `{recipe_id}` must include string array `prerequisites`")

        if not isinstance(shared_references, list) or any(
            not isinstance(item, str) for item in shared_references
        ):
            errors.append(
                f"{manifest_path}: recipe `{recipe_id}` must include string array `shared_references`"
            )
        else:
            for rel_path in shared_references:
                if not (skill_root / rel_path).exists():
                    errors.append(
                        f"{manifest_path}: recipe `{recipe_id}` references missing shared reference `{rel_path}`"
                    )

        for field_name, entries in (("assets", assets), ("scripts", scripts)):
            if not isinstance(entries, list) or any(not isinstance(item, str) for item in entries):
                errors.append(f"{manifest_path}: recipe `{recipe_id}` must include string array `{field_name}`")
                continue
            for rel_path in entries:
                if not (skill_root / rel_path).exists():
                    errors.append(
                        f"{manifest_path}: recipe `{recipe_id}` references missing {field_name[:-1]} `{rel_path}`"
                    )

    for recipe in recipes:
        if not isinstance(recipe, dict):
            continue
        recipe_id = recipe.get("id")
        prerequisites = recipe.get("prerequisites")
        if not isinstance(recipe_id, str) or not isinstance(prerequisites, list):
            continue
        for prerequisite in prerequisites:
            if prerequisite not in recipe_ids:
                errors.append(
                    f"{manifest_path}: recipe `{recipe_id}` references unknown prerequisite `{prerequisite}`"
                )

    actual_recipe_paths = {
        path.relative_to(skill_root).as_posix() for path in _iter_recipe_files(repo_root)
    }
    missing_recipe_paths = sorted(actual_recipe_paths - manifest_recipe_paths)
    for recipe_path in missing_recipe_paths:
        errors.append(f"{manifest_path}: missing manifest entry for `{recipe_path}`")

    extra_recipe_paths = sorted(manifest_recipe_paths - actual_recipe_paths)
    for recipe_path in extra_recipe_paths:
        errors.append(f"{manifest_path}: manifest lists unknown recipe path `{recipe_path}`")

    forbidden_skill_files = sorted((skill_root / "recipes").glob("**/SKILL.md"))
    for forbidden_path in forbidden_skill_files:
        errors.append(f"{forbidden_path}: internal recipe folders must not ship `SKILL.md`")

    forbidden_metadata = sorted((skill_root / "recipes").glob("**/agents/openai.yaml"))
    for forbidden_path in forbidden_metadata:
        errors.append(f"{forbidden_path}: internal recipe folders must not ship `agents/openai.yaml`")


def _validate_codex_plugin_manifest(repo_root: Path, errors: list[str]) -> None:
    codex_manifest = repo_root / ".codex-plugin" / "plugin.json"
    claude_manifest = repo_root / ".claude-plugin" / "plugin.json"

    if not codex_manifest.exists():
        errors.append(f"{codex_manifest}: missing Codex plugin manifest")
        return

    try:
        codex_payload = json.loads(codex_manifest.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"{codex_manifest}: invalid JSON ({exc})")
        return

    if not isinstance(codex_payload, dict):
        errors.append(f"{codex_manifest}: manifest root must be an object")
        return

    for field in ("name", "version", "description", "skills"):
        value = codex_payload.get(field)
        if not isinstance(value, str) or not value.strip():
            errors.append(f"{codex_manifest}: missing or empty required field `{field}`")

    if claude_manifest.exists():
        try:
            claude_payload = json.loads(claude_manifest.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            claude_payload = {}

        if isinstance(claude_payload, dict):
            for field in ("name", "version", "description", "skills"):
                claude_value = claude_payload.get(field)
                codex_value = codex_payload.get(field)
                if claude_value != codex_value:
                    errors.append(
                        f"{codex_manifest}: `{field}` does not match .claude-plugin/plugin.json"
                    )


def _validate_clean_git(repo_root: Path, errors: list[str]) -> None:
    completed = subprocess.run(
        ["git", "-C", str(repo_root), "status", "--short"],
        capture_output=True,
        text=True,
        check=False,
    )

    if completed.returncode != 0:
        errors.append("git status --short failed during clean-tree validation")
        return

    remaining = []
    for line in completed.stdout.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if any(stripped.startswith(prefix) for prefix in IGNORED_GIT_STATUS_PREFIXES):
            continue
        remaining.append(stripped)

    if remaining:
        preview = ", ".join(remaining[:8])
        if len(remaining) > 8:
            preview += ", ..."
        errors.append(f"git status is not clean: {preview}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate DatoCMS skill repo invariants")
    parser.add_argument(
        "--repo-root",
        default=".",
        help="Repository root containing the skill folders (default: .)",
    )
    parser.add_argument(
        "--require-clean-git",
        action="store_true",
        help="Fail if `git status --short` is not clean, ignoring known local-only paths.",
    )
    parser.add_argument(
        "--require-fresh-results-sync",
        action="store_true",
        help=(
            "Fail if checked-in root eval result rows drift from their canonical eval fixtures "
            "(query order, should_trigger, query_mode, or boundary_with)."
        ),
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_root).resolve()

    skill_files = _iter_skill_files(repo_root)
    if not skill_files:
        raise ValueError(f"{repo_root}: no SKILL.md files found in expected repo layout")

    frontmatter_by_path = {path: _extract_frontmatter(path) for path in skill_files}
    canonical_skill_names = {frontmatter.name for frontmatter in frontmatter_by_path.values()}
    recipe_files = _iter_recipe_files(repo_root)

    errors: list[str] = []

    for skill_file, frontmatter in frontmatter_by_path.items():
        _validate_reference_paths(skill_file, errors)
        _validate_banned_skill_body_patterns(skill_file, errors)
        _validate_routed_skill_names(skill_file, canonical_skill_names, errors)
        _validate_metadata(skill_file, frontmatter, errors)
        _validate_scaffold_contract(skill_file, frontmatter, errors)

    for recipe_file in recipe_files:
        _validate_reference_paths(recipe_file, errors)
        _validate_banned_skill_body_patterns(recipe_file, errors)

    _validate_scaffold_marketing(repo_root, errors)
    _validate_eval_fixture_coverage(repo_root, canonical_skill_names, errors)
    _validate_eval_result_names(repo_root, canonical_skill_names, errors)
    _validate_astro_imports(repo_root, errors)
    _validate_setup_manifest(repo_root, errors)
    _validate_codex_plugin_manifest(repo_root, errors)
    _validate_setup_router_eval(repo_root, errors)

    if args.require_fresh_results_sync:
        _validate_result_fixture_sync(repo_root, errors)

    if args.require_clean_git:
        _validate_clean_git(repo_root, errors)

    if errors:
        print("[fail] skill repo validation failed")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"[ok] validated {len(skill_files)} skills")
    print(f"[ok] validated {len(recipe_files)} internal setup recipes")
    print("[ok] reference paths resolve")
    print("[ok] metadata files are present and synced")
    print("[ok] routed skill names match frontmatter names")
    print("[ok] scaffold-capable skills declare scaffolded vs production-ready states")
    print("[ok] canonical eval fixtures cover every skill and contain positive/negative cases")
    print("[ok] checked-in eval results match canonical names and declared coverage")
    print("[ok] datocms-setup router eval fixture is present and covers recipes and Stage B branches")
    if args.require_fresh_results_sync:
        print("[ok] checked-in root eval result rows match canonical fixtures")
    print("[ok] banned host-specific labels are absent from skill bodies")
    print("[ok] Astro references use subpath imports")
    print("[ok] datocms-setup manifest paths, prerequisites, references, scripts, and assets are valid")
    print("[ok] Codex plugin manifest is present and synced with Claude Code manifest")
    if args.require_clean_git:
        print("[ok] git status is clean (ignoring local-only excluded paths)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
