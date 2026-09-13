#!/usr/bin/env python3
"""Build or verify the complete, reproducible datocms skill archive."""

from __future__ import annotations

import argparse
import io
import stat
import subprocess
import sys
import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath

PACKAGE_PATH = Path("skills/datocms")
ARCHIVE_PATH = Path("zips/datocms.zip")
FIXED_TIME = (1980, 1, 1, 0, 0, 0)


@dataclass(frozen=True)
class PackageFile:
    content: bytes
    executable: bool = False


def git(repo_root: Path, *args: str, input: bytes | None = None) -> bytes:
    result = subprocess.run(
        ["git", "-C", str(repo_root), *args], input=input, capture_output=True, check=True
    )
    return result.stdout


def read_worktree(skill_root: Path) -> dict[str, PackageFile]:
    if not skill_root.is_dir() or skill_root.is_symlink():
        raise ValueError(f"Missing package directory, or package is a symlink: {skill_root}")
    files = {}
    for path in sorted(skill_root.rglob("*")):
        if path.is_symlink():
            raise ValueError(f"Package must contain real files, not symlinks: {path}")
        if path.is_file():
            relative = path.relative_to(skill_root).as_posix()
            files[relative] = PackageFile(path.read_bytes(), bool(path.stat().st_mode & 0o111))
    return files


def read_index(repo_root: Path) -> dict[str, PackageFile]:
    records = git(repo_root, "ls-files", "--stage", "-z", "--", PACKAGE_PATH.as_posix())
    entries = []
    prefix = PACKAGE_PATH.as_posix() + "/"
    for record in records.split(b"\0"):
        if not record:
            continue
        header, raw_path = record.split(b"\t", 1)
        mode, object_id, stage = header.decode().split()
        path = raw_path.decode("utf-8")
        if stage != "0":
            raise ValueError(f"Cannot package an unmerged index entry: {path}")
        if mode not in {"100644", "100755"}:
            raise ValueError(f"Package must contain regular files, not symlinks/submodules: {path}")
        if not path.startswith(prefix):
            raise ValueError(f"Unexpected package index path: {path}")
        entries.append((path[len(prefix):], object_id, mode == "100755"))
    if not entries:
        raise ValueError(f"No staged package files under {PACKAGE_PATH}")

    # Read the index's blobs in one process. Working-tree content is never consulted.
    response = io.BytesIO(git(
        repo_root, "cat-file", "--batch",
        input=("\n".join(oid for _, oid, _ in entries) + "\n").encode(),
    ))
    files = {}
    for path, object_id, executable in entries:
        header = response.readline().decode().strip().split()
        if len(header) != 3 or header[:2] != [object_id, "blob"]:
            raise ValueError(f"Cannot read staged blob for {path}")
        content = response.read(int(header[2]))
        if response.read(1) != b"\n":
            raise ValueError(f"Invalid staged blob for {path}")
        files[path] = PackageFile(content, executable)
    return files


def has_staged_package_changes(repo_root: Path) -> bool:
    # Include deletions, renames and metadata changes, plus changes to the packager.
    return bool(git(
        repo_root, "diff", "--cached", "--name-only", "-z", "--",
        "skills/", "scripts/package_skill.py", ARCHIVE_PATH.as_posix(),
    ))


def archive_bytes(files: dict[str, PackageFile]) -> bytes:
    if "SKILL.md" not in files or "agents/openai.yaml" not in files:
        raise ValueError("Package requires SKILL.md and agents/openai.yaml")
    if any(path != "SKILL.md" and PurePosixPath(path).name == "SKILL.md" for path in files):
        raise ValueError("Package must contain exactly one SKILL.md")
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path, entry in sorted(files.items()):
            relative = PurePosixPath(path)
            if relative.is_absolute() or ".." in relative.parts or "\\" in path:
                raise ValueError(f"Invalid package path: {path}")
            info = zipfile.ZipInfo("datocms/" + path, FIXED_TIME)
            info.create_system = 3
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (stat.S_IFREG | (0o755 if entry.executable else 0o644)) << 16
            archive.writestr(info, entry.content, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    return stream.getvalue()


def check_archive_path(path: Path, repo_root: Path) -> None:
    """Reject links/special files beneath the output root before reads or writes."""
    relative = path.relative_to(repo_root)
    message = f"Archive path must stay inside its root without symlinks: {relative}"
    if ".." in relative.parts:
        raise ValueError(message)
    current = repo_root
    for index, part in enumerate(relative.parts):
        current = current / part
        if current.is_symlink():
            raise ValueError(message)
        try:
            mode = current.lstat().st_mode
        except FileNotFoundError:
            continue
        if index == len(relative.parts) - 1:
            if not stat.S_ISREG(mode):
                raise ValueError(message)
        elif not stat.S_ISDIR(mode):
            raise ValueError(message)
    if not path.resolve().is_relative_to(repo_root.resolve()):
        raise ValueError(message)


def check_archive(path: Path, files: dict[str, PackageFile], repo_root: Path) -> list[str]:
    try:
        check_archive_path(path, repo_root)
    except (ValueError, OSError) as exc:
        return [str(exc)]
    if not path.is_file():
        return [f"Missing archive: {path}; run npm run package:build"]
    try:
        return check_archive_content(path.read_bytes(), files, str(path))
    except OSError as exc:
        return [f"{path}: invalid archive ({exc})"]


def check_index_archive(repo_root: Path, files: dict[str, PackageFile]) -> list[str]:
    records = git(repo_root, "ls-files", "--stage", "-z", "--", ARCHIVE_PATH.as_posix())
    entries = [record for record in records.split(b"\0") if record]
    label = f"staged {ARCHIVE_PATH}"
    if len(entries) != 1:
        return [f"Missing or unmerged {label}"]
    header, raw_path = entries[0].split(b"\t", 1)
    mode, object_id, stage = header.decode().split()
    if raw_path.decode() != ARCHIVE_PATH.as_posix() or stage != "0" or mode != "100644":
        return [f"{label}: archive must be a regular, nonexecutable file at index stage 0"]
    return check_archive_content(git(repo_root, "cat-file", "blob", object_id), files, label)


def check_archive_content(content: bytes, files: dict[str, PackageFile], label: str) -> list[str]:
    try:
        expected = archive_bytes(files)
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            names = archive.namelist()
            expected_names = {"datocms/" + name for name in files}
            if len(names) != len(set(names)) or set(names) != expected_names:
                return [f"{label}: archive entries do not match the complete package"]
            for name, entry in files.items():
                info = archive.getinfo("datocms/" + name)
                mode = info.external_attr >> 16
                if not stat.S_ISREG(mode) or bool(mode & 0o111) != entry.executable:
                    return [f"{label}: archive mode differs for {name}"]
                if archive.read(info) != entry.content:
                    return [f"{label}: archive content differs for {name}"]
        if content != expected:
            return [f"{label}: archive is not reproducible; run npm run package:build"]
    except (ValueError, OSError, zipfile.BadZipFile, RuntimeError) as exc:
        return [f"{label}: invalid archive ({exc})"]
    return []


def check_isolation(files: dict[str, PackageFile]) -> list[str]:
    # Validation executes outside the source tree, so no sibling or repo file can
    # accidentally satisfy a reference. The validator itself is development tooling.
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "evals" / "scripts"))
    from validate_skill_repo import validate_skill_package

    with tempfile.TemporaryDirectory(prefix="datocms-package-") as temp:
        package = Path(temp) / "datocms"
        for name, entry in files.items():
            path = package / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(entry.content)
            path.chmod(0o755 if entry.executable else 0o644)
        return validate_skill_package(package)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=Path("."))
    parser.add_argument("--check", action="store_true", help="Verify archive bytes and package isolation")
    parser.add_argument("--from-index", action="store_true", help="Use staged files instead of working-tree files")
    parser.add_argument("--if-staged", action="store_true", help="Skip when there are no staged packaging changes")
    parser.add_argument("--stage", action="store_true", help="Stage the rebuilt archive, for the pre-commit hook")
    args = parser.parse_args()
    repo_root = args.repo_root.resolve()
    if (args.if_staged or args.stage) and not args.from_index:
        parser.error("--if-staged and --stage require --from-index")
    if args.stage and args.check:
        parser.error("--stage cannot be combined with --check")
    try:
        if args.if_staged and not has_staged_package_changes(repo_root):
            print("[ok] no staged package changes")
            return 0
        if not (args.from_index and args.check):
            check_archive_path(repo_root / ARCHIVE_PATH, repo_root)
        files = read_index(repo_root) if args.from_index else read_worktree(repo_root / PACKAGE_PATH)
        contents = archive_bytes(files)
        errors = check_isolation(files)
        if args.check:
            if args.from_index:
                errors.extend(check_index_archive(repo_root, files))
                legacy_archives = [path.decode() for path in git(
                    repo_root, "ls-files", "-z", "--", "zips/datocms-*.zip",
                ).split(b"\0") if path]
            else:
                errors.extend(check_archive(repo_root / ARCHIVE_PATH, files, repo_root))
                legacy_archives = (repo_root / "zips").glob("datocms-*.zip")
            for legacy in legacy_archives:
                errors.append(f"Legacy archive must be removed: {legacy}")
        if errors:
            for error in errors:
                print(f"[fail] {error}", file=sys.stderr)
            return 1
        if not args.check:
            output = repo_root / ARCHIVE_PATH
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_bytes(contents)
            if args.stage:
                git(repo_root, "add", "--", ARCHIVE_PATH.as_posix())
        print(f"[ok] {'verified' if args.check else 'built'} {ARCHIVE_PATH}: {len(files)} files; isolated package valid")
        return 0
    except (ValueError, OSError, subprocess.CalledProcessError) as exc:
        print(f"[fail] {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
