from __future__ import annotations

import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "evals/scripts"))
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from package_contract import REQUIRED_FILES, validate_references
from package_skill import (
    PackageFile, archive_bytes, check_archive, check_archive_path, check_isolation,
    has_staged_package_changes, read_index, read_worktree,
)
from validate_skill_repo import validate_skill_package
from prepare_commit import check_markdown_path


def write(root: Path, relative: str, content: str) -> Path:
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)
    return path


def make_package(root: Path) -> Path:
    for relative in REQUIRED_FILES:
        write(root, relative, "# Reference\n")
    for relative in ("references/setup.md", "references/setup/output-status.md", "references/frontend.md"):
        write(root, relative, "# Completion\nReport scaffolded or production-ready.\n")
    description = "Use DatoCMS for content, schemas, frontend integration and setup."
    write(root, "SKILL.md", f"---\nname: datocms\ndescription: {description}\n---\n# DatoCMS\n\nRead [CMA](references/cma.md). Report scaffolded or production-ready.\n")
    digest = hashlib.sha256(description.encode()).hexdigest()
    write(root, "agents/openai.yaml", f'''# synced_from_name: datocms
# synced_from_description_sha256: {digest}
interface:
  display_name: "DatoCMS"
  short_description: "Work with DatoCMS content and code"
  default_prompt: "Use $datocms for this project."
policy:
  allow_implicit_invocation: true
''')
    write(root, "references/frontend/astro.md", "# Astro\nUse subpath imports.\n")
    write(root, "recipes/platform/example/recipe.md", "# Example\nRead [CMA](../../../references/cma.md).\n")
    write(root, "recipes/platform/example/scripts/run.py", "print('example')\n").chmod(0o755)
    manifest = {"skill": "datocms", "path_base": "skill-root", "recipes": [{
        "id": "example", "path": "recipes/platform/example/recipe.md", "prerequisites": [],
        "shared_references": ["references/cma.md"], "assets": [],
        "scripts": ["recipes/platform/example/scripts/run.py"],
    }]}
    write(root, "references/setup/recipe-manifest.json", json.dumps(manifest))
    return root


class PackageValidationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = make_package(Path(self.temp.name) / "datocms")

    def test_valid_standalone_package(self):
        self.assertEqual(validate_skill_package(self.root), [])

    def test_missing_reference_in_deep_document(self):
        write(self.root, "references/cma/deep.md", "# Deep\nRead [missing](absent.md).\n")
        self.assertTrue(any("absent.md" in error for error in validate_skill_package(self.root)))

    def test_bare_inline_markdown_reference(self):
        write(self.root, "references/cma.md", "# CMA\nRead `missing.md`.\n")
        self.assertTrue(any("missing.md" in error for error in validate_skill_package(self.root)))

    def test_existing_file_outside_package_cannot_satisfy_reference(self):
        write(self.root.parent, "outside.md", "Exists, but not in the installed package.\n")
        write(self.root, "references/cma.md", "# CMA\n[Outside](../../outside.md)\n")
        self.assertTrue(any("escapes" in error for error in validate_skill_package(self.root)))

    def test_encoded_escape_is_rejected(self):
        write(self.root, "references/cma.md", "# CMA\n[Outside](%2e%2e/%2e%2e/outside.md)\n")
        self.assertTrue(any("escapes" in error for error in validate_skill_package(self.root)))

    def test_markdown_reference_definitions_are_checked(self):
        write(self.root, "references/cma.md", "# CMA\n[Read][doc]\n\n[doc]: nonexistent.md\n")
        self.assertTrue(any("nonexistent.md" in error for error in validate_skill_package(self.root)))

    def test_examples_and_external_links_are_not_local_dependencies(self):
        path = write(self.root, "references/cma.md", "# CMA\n[Web](https://example.com/guide.md) [Here](#cma)\n```md\n[example](file-to-create.md)\n```\nGenerate `src/app.ts` in the target project.\n")
        errors = []
        validate_references(path, self.root, errors)
        self.assertEqual(errors, [])

    def test_symlink_is_rejected_even_when_target_exists(self):
        target = write(self.root.parent, "outside.md", "outside")
        (self.root / "references/link.md").symlink_to(target)
        self.assertTrue(any("symlinks" in error for error in validate_skill_package(self.root)))
        with self.assertRaises(ValueError):
            read_worktree(self.root)

    def test_nested_skill_is_rejected(self):
        write(self.root, "references/other/SKILL.md", "# Extra public skill\n")
        self.assertTrue(any("only the package root" in error for error in validate_skill_package(self.root)))

    def test_missing_setup_and_astro_checks_fail_instead_of_skipping(self):
        (self.root / "references/setup/recipe-manifest.json").unlink()
        (self.root / "references/frontend/astro.md").unlink()
        errors = validate_skill_package(self.root)
        self.assertTrue(any("missing setup recipe manifest" in error for error in errors))
        self.assertTrue(any("missing Astro" in error for error in errors))

    def test_metadata_hash_is_checked(self):
        path = self.root / "agents/openai.yaml"
        path.write_text(path.read_text().replace("synced_from_description_sha256: ", "synced_from_description_sha256: " + "0" * 64 + " # "))
        self.assertTrue(any("metadata" in error or "hash" in error for error in validate_skill_package(self.root)))

    def test_manifest_missing_asset_and_escape_are_checked(self):
        path = self.root / "references/setup/recipe-manifest.json"
        data = json.loads(path.read_text())
        data["recipes"][0]["assets"] = ["missing.json", "../outside.json"]
        write(self.root.parent, "outside.json", "{}")
        path.write_text(json.dumps(data))
        errors = validate_skill_package(self.root)
        self.assertTrue(any("missing.json" in error for error in errors))
        self.assertTrue(any("escapes" in error for error in errors))

    def test_manifest_prerequisite_cycle_is_rejected(self):
        path = self.root / "references/setup/recipe-manifest.json"
        data = json.loads(path.read_text())
        data["recipes"][0]["prerequisites"] = ["example"]
        path.write_text(json.dumps(data))
        self.assertTrue(any("cyclic prerequisite" in error for error in validate_skill_package(self.root)))


class ArchiveTests(unittest.TestCase):
    setUp = PackageValidationTests.setUp
    def test_archive_is_complete_reproducible_and_preserves_executability(self):
        files = read_worktree(self.root)
        expected = archive_bytes(files)
        os.utime(self.root / "SKILL.md", (1234567890, 1234567890))
        self.assertEqual(expected, archive_bytes(read_worktree(self.root)))
        archive_path = self.root.parent / "datocms.zip"
        archive_path.write_bytes(expected)
        self.assertEqual(check_archive(archive_path, files, self.root.parent), [])
        with zipfile.ZipFile(io.BytesIO(expected)) as archive:
            self.assertIn("datocms/agents/openai.yaml", archive.namelist())
            self.assertEqual(set(archive.namelist()), {"datocms/" + name for name in files})
            self.assertTrue(archive.getinfo("datocms/recipes/platform/example/scripts/run.py").external_attr >> 16 & 0o111)

    def test_isolation_copies_only_package_files(self):
        files = read_worktree(self.root)
        self.assertEqual(check_isolation(files), [])
        files["references/cma.md"] = PackageFile("[Repo-only](../../outside.md)\n".encode())
        self.assertTrue(any("escapes" in error for error in check_isolation(files)))

    def test_archive_must_include_metadata(self):
        files = read_worktree(self.root)
        del files["agents/openai.yaml"]
        with self.assertRaises(ValueError):
            archive_bytes(files)

    def test_archive_with_missing_file_fails(self):
        files = read_worktree(self.root)
        archive_path = self.root.parent / "datocms.zip"
        incomplete = dict(files)
        del incomplete["references/cma.md"]
        archive_path.write_bytes(archive_bytes(incomplete))
        self.assertTrue(check_archive(archive_path, files, self.root.parent))

    def test_archive_check_rejects_a_symlink_to_an_otherwise_valid_archive(self):
        files = read_worktree(self.root)
        target = self.root.parent / "external.zip"
        target.write_bytes(archive_bytes(files))
        archive_path = self.root.parent / "zips/datocms.zip"
        archive_path.parent.mkdir()
        archive_path.symlink_to(target)
        self.assertTrue(any("symlinks" in error for error in check_archive(archive_path, files, self.root.parent)))

    def test_archive_check_rejects_a_symlinked_output_directory(self):
        files = read_worktree(self.root)
        target = self.root.parent / "external"
        target.mkdir()
        (target / "datocms.zip").write_bytes(archive_bytes(files))
        (self.root.parent / "zips").symlink_to(target, target_is_directory=True)
        self.assertTrue(any("symlinks" in error for error in check_archive(self.root.parent / "zips/datocms.zip", files, self.root.parent)))


class IndexPackagingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        self.package = make_package(self.repo / "skills/datocms")
        self.git("init", "-q")
        self.git("config", "user.name", "Package test")
        self.git("config", "user.email", "test@example.invalid")
        self.git("add", ".")
        self.git("-c", "core.hooksPath=/dev/null", "commit", "-qm", "Fixture")

    def git(self, *args):
        return subprocess.run(["git", "-C", str(self.repo), *args], check=True, capture_output=True).stdout

    def test_index_content_does_not_include_unstaged_changes(self):
        path = self.package / "references/cma.md"
        path.write_text("staged version\n")
        self.git("add", str(path))
        path.write_text("unstaged version\n")
        write(self.package, "untracked.md", "untracked\n")
        files = read_index(self.repo)
        self.assertEqual(files["references/cma.md"].content, b"staged version\n")
        self.assertNotIn("untracked.md", files)
        self.assertTrue(has_staged_package_changes(self.repo))

    def test_deletion_only_rebuild_uses_current_index(self):
        self.assertFalse(has_staged_package_changes(self.repo))
        path = self.package / "recipes/platform/example/scripts/run.py"
        path.unlink()
        self.git("add", "-u")
        self.assertTrue(has_staged_package_changes(self.repo))
        self.assertNotIn("recipes/platform/example/scripts/run.py", read_index(self.repo))
        path.write_text("restored but not staged\n")
        self.assertNotIn("recipes/platform/example/scripts/run.py", read_index(self.repo))

    def test_metadata_only_changes_rebuild_archive(self):
        path = self.package / "agents/openai.yaml"
        path.write_text(path.read_text() + "# Updated metadata\n")
        self.git("add", str(path))
        self.assertTrue(has_staged_package_changes(self.repo))
        self.assertTrue(read_index(self.repo)["agents/openai.yaml"].content.endswith(b"# Updated metadata\n"))

    def test_staged_symlink_is_rejected(self):
        (self.package / "linked.md").symlink_to("SKILL.md")
        self.git("add", ".")
        with self.assertRaises(ValueError):
            read_index(self.repo)

    def check_staged_archive(self):
        return subprocess.run(
            [sys.executable, str(REPO_ROOT / "scripts/package_skill.py"),
             "--repo-root", str(self.repo), "--from-index", "--check"],
            capture_output=True, text=True,
        )

    def test_index_check_rejects_corrupt_staged_archive_hidden_by_valid_worktree(self):
        archive_path = write(self.repo, "zips/datocms.zip", "corrupt staged archive")
        self.git("add", "zips/datocms.zip")
        valid = archive_bytes(read_index(self.repo))
        archive_path.write_bytes(valid)
        index_before = self.git("write-tree")
        result = self.check_staged_archive()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("staged zips/datocms.zip: invalid archive", result.stderr)
        self.assertEqual(self.git("write-tree"), index_before)
        self.assertEqual(archive_path.read_bytes(), valid)

    def test_index_check_uses_valid_staged_archive_despite_corrupt_worktree(self):
        archive_path = write(self.repo, "zips/datocms.zip", "")
        archive_path.write_bytes(archive_bytes(read_index(self.repo)))
        self.git("add", "zips/datocms.zip")
        archive_path.write_bytes(b"corrupt unstaged archive")
        result = self.check_staged_archive()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(archive_path.read_bytes(), b"corrupt unstaged archive")

    def test_index_check_rejects_staged_archive_symlink_hidden_by_regular_worktree(self):
        archive_path = self.repo / "zips/datocms.zip"
        archive_path.parent.mkdir()
        archive_path.symlink_to("../skills/datocms/SKILL.md")
        self.git("add", "zips/datocms.zip")
        archive_path.unlink()
        archive_path.write_bytes(archive_bytes(read_index(self.repo)))
        index_before = self.git("write-tree")
        result = self.check_staged_archive()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("archive must be a regular, nonexecutable file", result.stderr)
        self.assertEqual(self.git("write-tree"), index_before)

    def install_hook_fixture(self):
        # Run the real hook and packager. Substitute only the formatter and repo
        # validator so this integration test needs no npm install or full corpus.
        for relative in ("scripts/prepare_commit.py", "scripts/package_skill.py", ".husky/pre-commit"):
            destination = self.repo / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(REPO_ROOT / relative, destination)
        write(self.repo, ".remarkignore", "node_modules/\n")
        write(self.repo, ".remarkrc.mjs", "export default {};\n")
        formatter = write(self.repo, "node_modules/.bin/remark", f'''#!{sys.executable}
import pathlib, sys
ignore_path = pathlib.Path(sys.argv[sys.argv.index('--ignore-path') + 1])
ignored = ignore_path.read_text().splitlines()
for argument in sys.argv[1:]:
    if argument.endswith('.md'):
        path = pathlib.Path(argument)
        relative = path.resolve().relative_to(pathlib.Path.cwd().resolve()).as_posix()
        if any(relative == rule or (rule.endswith('/') and relative.startswith(rule)) for rule in ignored):
            assert '--silently-ignore' in sys.argv, 'Cannot process given file: it is ignored'
            continue
        assert 'unstaged' not in path.read_text(), 'formatter saw working-tree data'
        path.write_text(path.read_text().replace('needs\\tformat', 'needs format'))
''')
        formatter.chmod(0o755)
        write(self.repo, "evals/scripts/validate_skill_repo.py", '''import pathlib, sys, zipfile
root = pathlib.Path(sys.argv[-1])
assert root.resolve() == pathlib.Path.cwd().resolve()
assert 'unstaged' not in (root / 'skills/datocms/references/cma.md').read_text()
with zipfile.ZipFile(root / 'zips/datocms.zip') as archive:
    expected = {'datocms/' + path.relative_to(root / 'skills/datocms').as_posix(): path.read_bytes() for path in (root / 'skills/datocms').rglob('*') if path.is_file()}
    assert set(archive.namelist()) == set(expected)
    assert all(archive.read(name) == content for name, content in expected.items())
''')
        self.git("add", "scripts", ".husky", ".remarkignore", ".remarkrc.mjs", "evals")
        self.git("-c", "core.hooksPath=/dev/null", "commit", "-qm", "Hook fixture")

    def run_hook(self):
        return subprocess.run(["bash", ".husky/pre-commit"], cwd=self.repo, capture_output=True, text=True)

    def test_hook_formats_and_validates_index_without_restaging_partial_markdown(self):
        self.install_hook_fixture()
        path = self.package / "references/cma.md"
        path.write_text("# Staged content\n")
        self.git("add", str(path))
        path.write_text("# Unrelated unstaged content\n")
        result = self.run_hook()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(self.git("show", ":skills/datocms/references/cma.md"), b"# Staged content\n")
        self.assertEqual(path.read_text(), "# Unrelated unstaged content\n")
        with zipfile.ZipFile(io.BytesIO(self.git("show", ":zips/datocms.zip"))) as archive:
            self.assertEqual(archive.read("datocms/references/cma.md"), b"# Staged content\n")

    def test_hook_format_failure_changes_neither_index_nor_worktree(self):
        self.install_hook_fixture()
        path = self.package / "references/cma.md"
        path.write_text("needs\tformat\n")
        self.git("add", str(path))
        path.write_text("unstaged text\n")
        before = self.git("write-tree")
        result = self.run_hook()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Staged Markdown needs formatting", result.stderr)
        self.assertEqual(self.git("write-tree"), before)
        self.assertEqual(path.read_text(), "unstaged text\n")

    def test_hook_skips_staged_ignored_markdown_without_modifying_its_contents(self):
        self.install_hook_fixture()
        write(self.repo, ".remarkignore", "node_modules/\nevals/results/\n")
        ignored = write(self.repo, "evals/results/README.md", "needs\tformat\n")
        archive_path = write(self.repo, "zips/datocms.zip", "")
        archive_path.write_bytes(archive_bytes(read_index(self.repo)))
        self.git("add", ".remarkignore", "evals/results/README.md", "zips/datocms.zip")
        before = self.git("write-tree")
        ignored.write_text("ignored unstaged content\n")

        result = self.run_hook()

        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(self.git("write-tree"), before)
        self.assertEqual(self.git("show", ":evals/results/README.md"), b"needs\tformat\n")
        self.assertEqual(ignored.read_text(), "ignored unstaged content\n")

    def test_hook_rejects_external_markdown_symlink_before_reading_or_formatting(self):
        self.install_hook_fixture()
        # Ignoring a Markdown file must not bypass the pre-formatter path guard.
        write(self.repo, ".remarkignore", "node_modules/\ndocs/\n")
        external_temp = tempfile.TemporaryDirectory()
        self.addCleanup(external_temp.cleanup)
        target = write(Path(external_temp.name), "external.md", "needs\tformat\n")
        link = self.repo / "docs/link.md"
        link.parent.mkdir()
        link.symlink_to(target)
        self.git("add", ".remarkignore", "docs/link.md")
        before_tree = self.git("write-tree")
        before_status = self.git("status", "--porcelain")
        before_target = target.read_bytes()
        before_link = os.readlink(link)

        result = self.run_hook()

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("without symlinks: docs/link.md", result.stderr)
        self.assertEqual(target.read_bytes(), before_target)
        self.assertTrue(link.is_symlink())
        self.assertEqual(os.readlink(link), before_link)
        self.assertEqual(self.git("write-tree"), before_tree)
        self.assertEqual(self.git("status", "--porcelain"), before_status)

    def test_markdown_guard_rejects_symlinked_parent_and_special_file(self):
        target = write(self.repo, "safe/file.md", "safe\n")
        (self.repo / "linked").symlink_to(target.parent, target_is_directory=True)
        with self.assertRaises(ValueError):
            check_markdown_path(self.repo / "linked/file.md", self.repo)
        fifo = self.repo / "pipe.md"
        os.mkfifo(fifo)
        with self.assertRaises(ValueError):
            check_markdown_path(fifo, self.repo)

    def assert_failed_hook_preserves_archive_link(self, link: Path, target: Path):
        before_tree = self.git("write-tree")
        before_status = self.git("status", "--porcelain")
        before_link = os.readlink(link)
        before_files = {path.relative_to(target).as_posix(): path.read_bytes() for path in target.rglob("*") if path.is_file()} if target.is_dir() else {"target": target.read_bytes()}
        result = self.run_hook()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Archive path must stay inside its root without symlinks", result.stderr)
        self.assertEqual(self.git("write-tree"), before_tree)
        self.assertEqual(self.git("status", "--porcelain"), before_status)
        self.assertTrue(link.is_symlink())
        self.assertEqual(os.readlink(link), before_link)
        after_files = {path.relative_to(target).as_posix(): path.read_bytes() for path in target.rglob("*") if path.is_file()} if target.is_dir() else {"target": target.read_bytes()}
        self.assertEqual(after_files, before_files)

    def test_hook_rejects_a_staged_archive_symlink(self):
        self.install_hook_fixture()
        external_temp = tempfile.TemporaryDirectory()
        self.addCleanup(external_temp.cleanup)
        target = write(Path(external_temp.name), "external.zip", "must not be overwritten")
        link = self.repo / "zips/datocms.zip"
        link.parent.mkdir()
        link.symlink_to(target)
        self.git("add", "zips/datocms.zip")
        # Remove the link only from the working tree so it reaches the snapshot
        # guard rather than being rejected by the working-tree guard first.
        link.unlink()
        before_tree = self.git("write-tree")
        before_status = self.git("status", "--porcelain")
        result = self.run_hook()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Archive path must stay inside its root without symlinks", result.stderr)
        self.assertEqual(target.read_text(), "must not be overwritten")
        self.assertFalse(link.exists())
        self.assertEqual(self.git("write-tree"), before_tree)
        self.assertEqual(self.git("status", "--porcelain"), before_status)

    def test_hook_rejects_worktree_archive_and_directory_symlinks(self):
        self.install_hook_fixture()
        # A real staged package change would otherwise rebuild the archive.
        path = self.package / "references/cma.md"
        path.write_text("# Staged content\n")
        self.git("add", str(path))
        external_temp = tempfile.TemporaryDirectory()
        self.addCleanup(external_temp.cleanup)
        target_root = Path(external_temp.name)
        target = write(target_root, "external.zip", "must not be overwritten")
        output_dir = self.repo / "zips"
        output_dir.mkdir()
        link = output_dir / "datocms.zip"
        link.symlink_to(target)
        self.assert_failed_hook_preserves_archive_link(link, target)
        link.unlink()
        output_dir.rmdir()
        output_dir.symlink_to(target_root, target_is_directory=True)
        self.assert_failed_hook_preserves_archive_link(output_dir, target_root)

    def test_archive_builder_rejects_worktree_output_symlinks(self):
        external_temp = tempfile.TemporaryDirectory()
        self.addCleanup(external_temp.cleanup)
        target_root = Path(external_temp.name)
        target = write(target_root, "external.zip", "must not be overwritten")
        output_dir = self.repo / "zips"
        output_dir.mkdir()
        link = output_dir / "datocms.zip"
        link.symlink_to(target)
        command = [sys.executable, str(REPO_ROOT / "scripts/package_skill.py"), "--repo-root", str(self.repo)]
        result = subprocess.run(command, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("without symlinks", result.stderr)
        self.assertEqual(target.read_text(), "must not be overwritten")
        self.assertTrue(link.is_symlink())
        link.unlink()
        output_dir.rmdir()
        output_dir.symlink_to(target_root, target_is_directory=True)
        result = subprocess.run(command, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("without symlinks", result.stderr)
        self.assertEqual(target.read_text(), "must not be overwritten")
        self.assertFalse((target_root / "datocms.zip").exists())

    def test_hook_rebuilds_for_a_staged_deletion_only(self):
        self.install_hook_fixture()
        path = self.package / "recipes/platform/example/scripts/run.py"
        path.unlink()
        self.git("add", "-u")
        result = self.run_hook()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        with zipfile.ZipFile(io.BytesIO(self.git("show", ":zips/datocms.zip"))) as archive:
            self.assertNotIn("datocms/recipes/platform/example/scripts/run.py", archive.namelist())


if __name__ == "__main__":
    unittest.main()
