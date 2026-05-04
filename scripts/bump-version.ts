#!/usr/bin/env tsx
/**
 * Bump version in .claude-plugin/plugin.json and .codex-plugin/plugin.json.
 *
 * Usage:
 *   tsx scripts/bump-version.ts [patch|minor|major|<semver>]
 *
 * Default: patch.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const MANIFESTS = [
  ".claude-plugin/plugin.json",
  ".codex-plugin/plugin.json",
] as const;

type Bump = "patch" | "minor" | "major";

function parseSemver(v: string): [number, number, number] {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
  if (!m) throw new Error(`Not a valid semver: ${v}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function bump(version: string, kind: Bump): string {
  const [major, minor, patch] = parseSemver(version);
  if (kind === "major") return `${major + 1}.0.0`;
  if (kind === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function readManifest(path: string): { raw: string; json: { version: string } } {
  const raw = readFileSync(path, "utf8");
  return { raw, json: JSON.parse(raw) };
}

function writeManifest(path: string, raw: string, oldVersion: string, newVersion: string): void {
  const next = raw.replace(
    `"version": "${oldVersion}"`,
    `"version": "${newVersion}"`,
  );
  if (next === raw) {
    throw new Error(`Failed to replace version in ${path}`);
  }
  writeFileSync(path, next);
}

function main(): void {
  const arg = process.argv[2] ?? "patch";
  const root = resolve(process.cwd());

  const manifests = MANIFESTS.map((p) => ({ path: resolve(root, p), ...readManifest(resolve(root, p)) }));

  const versions = new Set(manifests.map((m) => m.json.version));
  if (versions.size > 1) {
    const summary = manifests.map((m) => `  ${m.path}: ${m.json.version}`).join("\n");
    throw new Error(`Manifests out of sync:\n${summary}`);
  }

  const current = manifests[0].json.version;
  const next = arg === "patch" || arg === "minor" || arg === "major"
    ? bump(current, arg)
    : (parseSemver(arg), arg);

  for (const m of manifests) {
    writeManifest(m.path, m.raw, current, next);
  }

  console.log(`${current} → ${next}`);
  for (const m of manifests) {
    console.log(`  updated ${m.path.replace(`${root}/`, "")}`);
  }
}

main();
