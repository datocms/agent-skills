#!/usr/bin/env python3
"""Validate repo invariants for DatoCMS skill documentation."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import unquote

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
SETUP_SKILL_DIR = "skills/datocms-setup"
FRAMEWORK_REFERENCE_PATHS = tuple(
    f"skills/datocms-frontend-integrations/references/{framework}.md"
    for framework in ("nextjs", "nuxt", "sveltekit", "astro")
)
MARKDOWN_LINK_RE = re.compile(r"\[(?:[^\]\\\n]|\\.)*\]\(\s*<?([^)\s>]+)>?(?:\s+\"[^\"]*\")?\s*\)")
INLINE_CODE_RE = re.compile(r"`+[^`\n]*`+")
FW_HEADING_RE = re.compile(r"FW › `([^`\n]+)`")
FENCE_RE = re.compile(r"^ {0,3}(`{3,}|~{3,})")
ATX_HEADING_RE = re.compile(r"^ {0,3}#{1,6}[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$")
EXTERNAL_LINK_PREFIXES = ("http://", "https://", "mailto:")
CODEX_DESCRIPTION_MAX_CHARS = 1024
TRIGGER_FIXTURES_DIR = "evals/fixtures/trigger"
TRIGGER_RESULTS_DIR = "evals/results/trigger"
DEFAULT_QUERY_MODE = "implicit"
ALLOWED_QUERY_MODES = {
    "implicit",
    "explicit",
    "overlap",
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


def _validate_description_length(skill_file: Path, frontmatter: SkillFrontmatter, errors: list[str]) -> None:
    length = len(frontmatter.description)
    if length > CODEX_DESCRIPTION_MAX_CHARS:
        overflow = length - CODEX_DESCRIPTION_MAX_CHARS
        errors.append(
            f"{skill_file}: description is {length} chars — exceeds Codex {CODEX_DESCRIPTION_MAX_CHARS}-char limit by {overflow}"
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


def _iter_eval_fixture_paths(repo_root: Path) -> list[Path]:
    fixtures_dir = repo_root / TRIGGER_FIXTURES_DIR
    return sorted(fixtures_dir.glob("*.json"))


def _validate_eval_fixture_coverage(
    repo_root: Path,
    canonical_skill_names: set[str],
    errors: list[str],
) -> None:
    actual_paths = _iter_eval_fixture_paths(repo_root)
    actual_names = set()

    for path in actual_paths:
        skill_name = path.stem
        actual_names.add(skill_name)

        if skill_name not in canonical_skill_names:
            errors.append(
                f"{path}: eval fixture filename does not match any canonical skill name"
            )

        _validate_eval_fixture_payload(path, skill_name, canonical_skill_names, errors)

    missing_names = sorted(canonical_skill_names - actual_names)
    for skill_name in missing_names:
        errors.append(
            f"{TRIGGER_FIXTURES_DIR}/{skill_name}.json: missing canonical eval fixture"
        )


def _validate_eval_result_names(
    repo_root: Path,
    canonical_skill_names: set[str],
    errors: list[str],
) -> None:
    results_dir = repo_root / TRIGGER_RESULTS_DIR
    if not results_dir.exists():
        return

    actual_skill_dirs = {
        path.name
        for path in results_dir.iterdir()
        if path.is_dir() and not path.name.startswith("_")
    }

    extra_skills = sorted(actual_skill_dirs - canonical_skill_names)
    for skill_name in extra_skills:
        errors.append(
            f"{results_dir / skill_name}: result directory does not match any canonical skill name"
        )

    for results_path in sorted(results_dir.glob("*/*/*/results.json")):
        rel_parts = results_path.relative_to(results_dir).parts
        if rel_parts[0].startswith("_"):
            continue

        skill_name = rel_parts[0]

        try:
            payload = _extract_json_payload(results_path.read_text(encoding="utf-8"), results_path)
        except ValueError as exc:
            errors.append(str(exc))
            continue

        embedded_name = payload.get("skill_name")
        if not isinstance(embedded_name, str) or not embedded_name.strip():
            errors.append(f"{results_path}: result file must include string `skill_name`")
            continue
        if embedded_name.strip() != skill_name:
            errors.append(
                f"{results_path}: embedded skill_name `{embedded_name.strip()}` does not match directory `{skill_name}`"
            )


def _fence_toggle(line: str, fence: str | None) -> tuple[bool, str | None]:
    """CommonMark fences: a fence opens with 3+ backticks or tildes and closes only on a line
    of the same character, at least as long, with nothing after it."""
    match = FENCE_RE.match(line)
    if not match:
        return False, fence
    run = match.group(1)
    if fence is None:
        return True, run
    if run[0] == fence[0] and len(run) >= len(fence) and not line.strip()[len(run):].strip():
        return True, None
    return False, fence


def _markdown_headings(path: Path) -> list[str]:
    headings: list[str] = []
    fence: str | None = None
    for line in path.read_text(encoding="utf-8").splitlines():
        is_fence, fence = _fence_toggle(line, fence)
        if is_fence or fence is not None:
            continue
        match = ATX_HEADING_RE.match(line)
        if match:
            headings.append(match.group(1).strip())
    return headings


def _github_heading_slugs(headings: list[str]) -> set[str]:
    # github-slugger over the rendered heading text: code spans keep their content, links keep
    # their text, tags and emphasis markers drop, entities decode; then lowercase, strip
    # punctuation, spaces to hyphens, repeats suffixed -1, -2, ...
    occurrences: dict[str, int] = {}
    slugs: set[str] = set()
    for heading in headings:
        parts = re.split(r"(`+)(.+?)\1", heading)
        rendered = []
        for index in range(0, len(parts), 3):
            text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", parts[index])
            text = re.sub(r"<[^>]+>", "", text)
            text = re.sub(r"\*+|(?<![\w])_+|_+(?![\w])", "", text)
            rendered.append(html.unescape(text))
            if index + 2 < len(parts):
                rendered.append(parts[index + 2])
        base = re.sub(r"[^\w\- ]", "", "".join(rendered).lower()).replace(" ", "-")
        slug = base
        while slug in occurrences:
            occurrences[base] += 1
            slug = f"{base}-{occurrences[base]}"
        occurrences[slug] = 0
        slugs.add(slug)
    return slugs


def _validate_setup_pointers(repo_root: Path, canonical_skill_names: set[str], errors: list[str]) -> None:
    setup_dir = repo_root / SETUP_SKILL_DIR
    if not setup_dir.exists():
        return

    framework_headings = {
        rel_path: set(_markdown_headings(repo_root / rel_path))
        for rel_path in FRAMEWORK_REFERENCE_PATHS
        if (repo_root / rel_path).exists()
    }
    for rel_path in FRAMEWORK_REFERENCE_PATHS:
        if rel_path not in framework_headings:
            errors.append(f"{repo_root / rel_path}: missing framework reference that setup `FW ›` pointers target")

    slug_cache: dict[Path, set[str]] = {}

    for md_file in sorted(setup_dir.rglob("*.md")):
        text = md_file.read_text(encoding="utf-8")

        if md_file.name != "SKILL.md":
            _validate_reference_paths(md_file, errors)
            _validate_banned_skill_body_patterns(md_file, errors)
            _validate_routed_skill_names(md_file, canonical_skill_names, errors)

        fence: str | None = None
        prose_lines: list[str] = []
        for line_number, line in enumerate(text.splitlines(), start=1):
            is_fence, next_fence = _fence_toggle(line, fence)
            if is_fence and fence is None:
                errors.append(
                    f"{md_file}:{line_number}: fenced code block; setup ships no implementation, link the owning skill instead"
                )
            fence = next_fence
            if not is_fence and fence is None:
                prose_lines.append(line)

        prose = INLINE_CODE_RE.sub("``", "\n".join(prose_lines))
        for target in MARKDOWN_LINK_RE.findall(prose):
            if target.lower().startswith(EXTERNAL_LINK_PREFIXES):
                continue
            path_part, _, fragment = target.partition("#")
            resolved = (md_file.parent / unquote(path_part)).resolve() if path_part else md_file
            if not resolved.is_file():
                errors.append(f"{md_file}: link target `{target}` does not resolve to a file")
                continue
            if not resolved.is_relative_to((repo_root / "skills").resolve()):
                errors.append(f"{md_file}: link target `{target}` is outside skills/ and won't ship with the skills")
                continue
            if not fragment:
                continue
            if resolved not in slug_cache:
                slug_cache[resolved] = _github_heading_slugs(_markdown_headings(resolved))
            if unquote(fragment) not in slug_cache[resolved]:
                errors.append(f"{md_file}: link target `{target}` names no heading in {resolved.name}")

        for heading in sorted(set(FW_HEADING_RE.findall(text))):
            for rel_path, headings in framework_headings.items():
                if heading not in headings:
                    errors.append(f"{md_file}: `FW › {heading}` has no matching heading in {rel_path}")


def _validate_result_fixture_sync(
    repo_root: Path,
    errors: list[str],
) -> None:
    results_dir = repo_root / TRIGGER_RESULTS_DIR
    fixtures_dir = repo_root / TRIGGER_FIXTURES_DIR

    for path in sorted(results_dir.glob("*/*/*/results.json")):
        rel_parts = path.relative_to(results_dir).parts
        if rel_parts[0].startswith("_"):
            continue

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

        fixture_path = fixtures_dir / f"{skill_name.strip()}.json"
        if not fixture_path.exists():
            rel = fixture_path.relative_to(repo_root).as_posix()
            errors.append(f"{path}: missing canonical fixture `{rel}` for freshness check")
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


PLUGIN_ROOT_LOCKFILES = ("bun.lock", "bun.lockb", "npm-shrinkwrap.json", "package-lock.json")


def _validate_plugin_root_has_no_dependency_install(repo_root: Path, errors: list[str]) -> None:
    # Plugin installs copy the repo root and run the package manager there when it holds
    # package.json plus a supported lockfile, so dev dependencies must stay under dev/.
    lockfiles = [name for name in PLUGIN_ROOT_LOCKFILES if (repo_root / name).exists()]
    if (repo_root / "package.json").exists() and lockfiles:
        errors.append(
            f"{repo_root}: package.json with {', '.join(lockfiles)} at the plugin root makes every "
            "Claude Code plugin install run a dependency install; keep dev tooling under dev/"
        )


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

    errors: list[str] = []

    for skill_file, frontmatter in frontmatter_by_path.items():
        _validate_reference_paths(skill_file, errors)
        _validate_banned_skill_body_patterns(skill_file, errors)
        _validate_routed_skill_names(skill_file, canonical_skill_names, errors)
        _validate_metadata(skill_file, frontmatter, errors)
        _validate_description_length(skill_file, frontmatter, errors)
        _validate_scaffold_contract(skill_file, frontmatter, errors)

    _validate_scaffold_marketing(repo_root, errors)
    _validate_eval_fixture_coverage(repo_root, canonical_skill_names, errors)
    _validate_eval_result_names(repo_root, canonical_skill_names, errors)
    _validate_astro_imports(repo_root, errors)
    _validate_setup_pointers(repo_root, canonical_skill_names, errors)
    _validate_codex_plugin_manifest(repo_root, errors)
    _validate_plugin_root_has_no_dependency_install(repo_root, errors)

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
    print("[ok] reference paths resolve")
    print("[ok] metadata files are present and synced")
    print(f"[ok] skill descriptions fit within Codex {CODEX_DESCRIPTION_MAX_CHARS}-char limit")
    print("[ok] routed skill names match frontmatter names")
    print("[ok] scaffold-capable skills declare scaffolded vs production-ready states")
    print("[ok] canonical eval fixtures cover every skill and contain positive/negative cases")
    print(
        f"[ok] result directories under {TRIGGER_RESULTS_DIR} match canonical skill names and embedded skill_name"
    )
    if args.require_fresh_results_sync:
        print("[ok] checked-in root eval result rows match canonical fixtures")
    print("[ok] banned host-specific labels are absent from skill bodies")
    print("[ok] Astro references use subpath imports")
    print(
        "[ok] datocms-setup markdown links resolve to existing files and headings, "
        "`FW ›` headings exist in all four framework references, and setup ships no code blocks"
    )
    print("[ok] Codex plugin manifest is present and synced with Claude Code manifest")
    print("[ok] plugin root has no package.json + lockfile pair that plugin installs would run")
    if args.require_clean_git:
        print("[ok] git status is clean (ignoring local-only excluded paths)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
