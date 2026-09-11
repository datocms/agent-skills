#!/usr/bin/env python3
"""Check staged Markdown, package the index, then validate its complete snapshot."""

from __future__ import annotations

import subprocess
import stat
import sys
import tempfile
from pathlib import Path

from package_skill import ARCHIVE_PATH, archive_bytes, check_archive_path, git, has_staged_package_changes, read_index


def check_markdown_path(path: Path, snapshot: Path) -> None:
    """Reject links and special files before any Markdown content is read."""
    relative = path.relative_to(snapshot)
    message = f"Staged Markdown must be a regular file inside the snapshot, without symlinks: {relative}"
    if ".." in relative.parts:
        raise ValueError(message)
    current = snapshot
    for part in relative.parts:
        current = current / part
        if current.is_symlink():
            raise ValueError(message)
    if not stat.S_ISREG(path.lstat().st_mode) or not path.resolve().is_relative_to(snapshot.resolve()):
        raise ValueError(message)


def main() -> int:
    repo_root = Path(git(Path.cwd(), "rev-parse", "--show-toplevel").decode().strip())
    try:
        check_archive_path(repo_root / ARCHIVE_PATH, repo_root)
        with tempfile.TemporaryDirectory(prefix="datocms-staged-") as temp:
            snapshot = Path(temp)
            git(repo_root, "checkout-index", "--all", f"--prefix={snapshot}/")
            check_archive_path(snapshot / ARCHIVE_PATH, snapshot)
            staged = git(repo_root, "diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z")
            markdown = [snapshot / path.decode() for path in staged.split(b"\0") if path.endswith(b".md")]
            for path in markdown:
                check_markdown_path(path, snapshot)
            original = {path: path.read_bytes() for path in markdown}
            if markdown:
                remark = repo_root / "node_modules/.bin/remark"
                if not remark.is_file():
                    raise ValueError("Install development dependencies with npm ci before committing Markdown")
                # Resolve the staged formatter config against installed tooling,
                # without reading an unstaged config from the working tree.
                dependencies = snapshot / "node_modules"
                if not dependencies.exists():
                    dependencies.symlink_to(repo_root / "node_modules", target_is_directory=True)
                subprocess.run(
                    [str(remark), "--output", "--quiet", "--silently-ignore", "--rc-path", str(snapshot / ".remarkrc.mjs"),
                     "--ignore-path", str(snapshot / ".remarkignore"), *map(str, markdown)],
                    cwd=snapshot, check=True,
                )
                changed = [path.relative_to(snapshot).as_posix() for path, content in original.items() if path.read_bytes() != content]
                if changed:
                    raise ValueError("Staged Markdown needs formatting; format and stage these files: " + ", ".join(changed))

            rebuilt = has_staged_package_changes(repo_root)
            if rebuilt:
                output = snapshot / ARCHIVE_PATH
                output.parent.mkdir(parents=True, exist_ok=True)
                output.write_bytes(archive_bytes(read_index(repo_root)))

            # Use the staged validator, fixtures, manifests and source files. A
            # partially staged document cannot leak through working-tree reads.
            subprocess.run(
                [sys.executable, str(snapshot / "evals/scripts/validate_skill_repo.py"), "--repo-root", str(snapshot)],
                cwd=snapshot, check=True,
            )
            if rebuilt:
                output = repo_root / ARCHIVE_PATH
                check_archive_path(output, repo_root)
                output.parent.mkdir(parents=True, exist_ok=True)
                output.write_bytes((snapshot / ARCHIVE_PATH).read_bytes())
                git(repo_root, "add", "--", ARCHIVE_PATH.as_posix())
                print(f"[ok] staged {ARCHIVE_PATH} from the validated index")
        return 0
    except (ValueError, OSError, subprocess.CalledProcessError) as exc:
        print(f"[fail] {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
