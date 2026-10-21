#!/usr/bin/env bash
# Builds one claude.ai upload zip per shipped skill into the given directory (default: zips/).
# Zips hold only git-tracked files, so local junk never ships; agents/ (Codex-only metadata) is left out.
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
out_dir=$(mkdir -p "${1:-$repo_root/zips}" && cd "${1:-$repo_root/zips}" && pwd)
rm -f "$out_dir"/datocms-*.zip

cd "$repo_root/skills"
for dir in datocms-*/; do
  name=${dir%/}
  git ls-files -- "$name" | { grep -v "^$name/agents/" || true; } | zip -q "$out_dir/$name.zip" -@
  echo "built $out_dir/$name.zip"
done
