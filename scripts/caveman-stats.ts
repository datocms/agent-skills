#!/usr/bin/env tsx
/**
 * Heuristic stats for skills/**\/*.md files based on caveman compression.
 * Counts /\b(a|an|the)\b/i occurrences — caveman style strips articles,
 * so high counts per 100 words flag uncompressed files; low counts flag
 * already-cavemanized ones.
 *
 * Usage:
 *   tsx scripts/caveman-stats.ts            # ascending: compressed first
 *   tsx scripts/caveman-stats.ts --desc     # descending: uncompressed first
 *   tsx scripts/caveman-stats.ts --by-gain  # by absolute article count
 *                                           # (proxy for tokens saved if
 *                                           # cavemanized — biggest wins first)
 */

import { readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";

const ARTICLE_REGEX = /\b(?:a|an|the)\b/gi;
const WORD_REGEX = /\b\w+\b/g;
const FENCED_CODE_REGEX = /```[\s\S]*?```/g;

function stripFencedCode(text: string): string {
  return text.replace(FENCED_CODE_REGEX, "");
}

const desc = process.argv.includes("--desc");
const byGain = process.argv.includes("--by-gain");
const THRESHOLD = 5.0;

function listMarkdown(): string[] {
  const r = spawnSync("git", ["ls-files", "--", "skills/**/*.md"], {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stdout.split("\n").filter(Boolean);
}

interface Row {
  path: string;
  articles: number;
  words: number;
  per100: number;
  bytes: number;
}

const rows: Row[] = [];
for (const path of listMarkdown()) {
  const text = stripFencedCode(readFileSync(path, "utf8"));
  const articles = (text.match(ARTICLE_REGEX) ?? []).length;
  const words = (text.match(WORD_REGEX) ?? []).length;
  const per100 = words > 0 ? (articles / words) * 100 : 0;
  rows.push({ path, articles, words, per100, bytes: statSync(path).size });
}

if (byGain) {
  rows.sort((a, b) => b.articles - a.articles);
} else {
  rows.sort((a, b) => (desc ? b.per100 - a.per100 : a.per100 - b.per100));
}

const w = Math.max(...rows.map((r) => r.path.length), 4);
console.log(
  `${"path".padEnd(w)}  ${"art".padStart(5)}  ${"words".padStart(6)}  ${"art/100w".padStart(8)}`,
);
console.log("-".repeat(w + 2 + 5 + 2 + 6 + 2 + 8));
for (const r of rows) {
  console.log(
    `${r.path.padEnd(w)}  ${String(r.articles).padStart(5)}  ${String(r.words).padStart(6)}  ${r.per100.toFixed(2).padStart(8)}`,
  );
}

if (byGain) {
  const total = rows.reduce((sum, r) => sum + r.articles, 0);
  console.log(
    `\nTop gain candidates (≈ articles ≈ tokens saved). Total articles across all files: ${total}`,
  );
  const top = rows.slice(0, 10).map((r) => r.path);
  console.log(`\ntsx scripts/caveman.ts ${top.join(" ")}`);
} else if (desc) {
  const suspect = rows.filter((r) => r.per100 >= THRESHOLD).slice(0, 10);
  console.log(
    `\n${suspect.length} file(s) with ≥ ${THRESHOLD} articles/100 words — likely NOT cavemanized:`,
  );
  console.log(`\ntsx scripts/caveman.ts ${suspect.map((r) => r.path).join(" ")}`);
}
