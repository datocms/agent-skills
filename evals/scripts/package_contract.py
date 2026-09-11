"""File and reference checks for a standalone skill directory. No network access."""

from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import unquote, urlsplit

TOPIC_GUIDES = ("cda", "cli", "cma", "modeling", "frontend", "plugin", "setup", "feedback")
REQUIRED_FILES = (
    "SKILL.md", "agents/openai.yaml",
    *(f"references/{topic}.md" for topic in TOPIC_GUIDES),
    "references/setup/recipe-manifest.json", "references/setup/router.md",
    "references/setup/repo-conventions.md", "references/setup/mandatory-rules.md",
    "references/setup/output-status.md",
)
LINK_RE = re.compile(r"\[[^\]\n]*\]\(\s*(<[^>\n]+>|[^\s)]+)(?:\s+[^)]+)?\)")
LINK_DEFINITION_RE = re.compile(r"^\s{0,3}\[[^\]\n]+\]:\s*(<[^>\n]+>|\S+)", re.MULTILINE)
INLINE_CODE_RE = re.compile(r"(?<!`)`([^`\n]+)`(?!`)")
RESOURCE_PREFIXES = ("references/", "recipes/", "assets/", "scripts/", "agents/")
PROJECT_FILENAMES = {"AGENTS.md", "CLAUDE.md", "README.md"}
OLD_SKILL_PATH_RE = re.compile(r"(?:skills/|\.\./)(datocms-(?:cda|cli|cma|content-modeling|frontend-integrations|plugin|setup|feedback))(?:/|\b)")


def prose_only(text: str) -> str:
    """Remove fenced examples while retaining line numbers for useful errors."""
    output = []
    fence = None
    for line in text.splitlines(keepends=True):
        match = re.match(r"^\s{0,3}(`{3,}|~{3,})(.*)$", line)
        if fence is None and match:
            fence = match.group(1)
            output.append("\n")
        elif fence is not None:
            if match and match.group(1)[0] == fence[0] and len(match.group(1)) >= len(fence) and not match.group(2).strip():
                fence = None
            output.append("\n")
        else:
            output.append(line)
    return "".join(output)


def local_target(raw: str) -> str | None:
    value = raw.strip().strip("<>")
    if not value or value.startswith("#"):
        return None
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc:
        return None
    return unquote(parsed.path)


def contained_path(root: Path, relative: str, source: Path, errors: list[str]) -> Path | None:
    """Resolve a manifest path and reject even existing files outside the package."""
    if not relative or Path(relative).is_absolute() or "\\" in relative:
        errors.append(f"{source}: invalid local package path `{relative}`")
        return None
    resolved = (root / relative).resolve()
    if not resolved.is_relative_to(root.resolve()):
        errors.append(f"{source}: reference escapes the skill package: `{relative}`")
        return None
    if not resolved.exists():
        errors.append(f"{source}: missing referenced file `{relative}`")
        return None
    return resolved


def validate_references(path: Path, skill_root: Path, errors: list[str]) -> None:
    text = prose_only(path.read_text(encoding="utf-8"))
    # Markdown syntax shown as inline code is an example, not an actual link.
    link_text = INLINE_CODE_RE.sub(lambda match: " " * len(match.group(0)), text)
    references = [(match.group(1), match.start(), False) for regex in (LINK_RE, LINK_DEFINITION_RE) for match in regex.finditer(link_text)]
    for match in INLINE_CODE_RE.finditer(text):
        value = match.group(1)
        # Code examples describe files to create in the user's project. Only
        # resource paths or standalone Markdown filenames identify shipped docs.
        if any(char in value for char in (" ", "\t", "*", "{", "}", "<", ">", "|")):
            continue
        if value in PROJECT_FILENAMES or value.startswith(("./src/", "./lib/")):
            continue
        # scripts/ is also the documented output directory in the user's repo.
        # Shipped recipe scripts/assets are exhaustively checked in the manifest.
        is_resource = value.startswith(("references/", "recipes/", "assets/", "agents/"))
        is_relative_file = value.startswith(("../", "./")) and re.search(r"\.(?:md|json|ya?ml|py|[cm]?js|tsx?|sh|svg|png)(?:#.*)?$", value)
        is_markdown_file = re.fullmatch(r"[\w.-]+\.md(?:#.*)?", value)
        if is_resource or is_relative_file or is_markdown_file:
            references.append((value, match.start(), True))
    seen = set()
    root = skill_root.resolve()
    for raw, position, inline in references:
        target = local_target(raw)
        if target is None or target in seen:
            continue
        seen.add(target)
        source = f"{path}:{text.count(chr(10), 0, position) + 1}"
        if Path(target).is_absolute() or "\\" in target:
            errors.append(f"{source}: invalid local package reference `{target}`")
            continue
        resolved = (path.parent / target).resolve()
        if not resolved.is_relative_to(root):
            errors.append(f"{source}: reference escapes the skill package: `{target}`")
            continue
        if not resolved.exists():
            errors.append(f"{source}: missing referenced file `{target}`")
    for match in OLD_SKILL_PATH_RE.finditer(text):
        errors.append(f"{path}: reference to removed skill path `{match.group(0)}`")


def validate_layout(skill_root: Path, errors: list[str]) -> list[Path]:
    if not skill_root.is_dir() or skill_root.is_symlink():
        errors.append(f"{skill_root}: missing standalone skill directory, or directory is a symlink")
        return []
    for relative in REQUIRED_FILES:
        if not (skill_root / relative).is_file():
            errors.append(f"{skill_root}: missing required package file `{relative}`")
    all_paths = sorted(skill_root.rglob("*"))
    for path in all_paths:
        if path.is_symlink():
            errors.append(f"{path}: package must not depend on symlinks")
        if path.name == "SKILL.md" and path != skill_root / "SKILL.md":
            errors.append(f"{path}: only the package root may contain SKILL.md")
        if path.name == "openai.yaml" and path != skill_root / "agents" / "openai.yaml":
            errors.append(f"{path}: only one agents/openai.yaml may ship")
    return [path for path in all_paths if path.is_file() and not path.is_symlink() and path.suffix == ".md"]
