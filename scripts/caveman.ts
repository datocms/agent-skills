#!/usr/bin/env tsx
/**
 * Caveman Compress — TypeScript port.
 *
 * Compresses natural-language markdown into terse "caveman" form via the
 * `claude` CLI, preserving code blocks, URLs, headings, and paths.
 *
 * Usage:
 *   tsx scripts/caveman.ts <file> [<file> ...]
 *   tsx scripts/caveman.ts skills/**\/SKILL.md     # zsh expands the glob
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { encode } from "gpt-tokenizer";

function countTokens(text: string): number {
  return encode(text).length;
}

const ENV_FILE = resolve(import.meta.dirname, "..", ".env.local");
const Z_AI_BASE_URL = "https://api.z.ai/api/anthropic";

const MAX_FILE_SIZE = 500_000;
const MAX_RETRIES = 2;

const COMPRESSIBLE_EXTENSIONS = new Set([".md", ".txt", ".markdown", ".rst"]);
const SKIP_EXTENSIONS = new Set([
  ".py", ".js", ".ts", ".tsx", ".jsx", ".json", ".yaml", ".yml",
  ".toml", ".env", ".lock", ".css", ".scss", ".html", ".xml",
  ".sql", ".sh", ".bash", ".zsh", ".go", ".rs", ".java", ".c",
  ".cpp", ".h", ".hpp", ".rb", ".php", ".swift", ".kt", ".lua",
  ".dockerfile", ".makefile", ".csv", ".ini", ".cfg",
]);

const CODE_LINE_PATTERNS: RegExp[] = [
  /^\s*(import |from .+ import |require\(|const |let |var )/,
  /^\s*(def |class |function |async function |export )/,
  /^\s*(if\s*\(|for\s*\(|while\s*\(|switch\s*\(|try\s*\{)/,
  /^\s*[\}\]\);]+\s*$/,
  /^\s*@\w+/,
  /^\s*"[^"]+"\s*:\s*/,
  /^\s*\w+\s*=\s*[{\[("']/,
];

const OUTER_FENCE_REGEX = /^\s*(`{3,}|~{3,})[^\n]*\n([\s\S]*)\n\1\s*$/;
const URL_REGEX = /https?:\/\/[^\s)]+/g;
const HEADING_REGEX = /^(#{1,6})\s+(.*)$/gm;
const BULLET_REGEX = /^\s*[-*+]\s+/gm;
const FENCE_OPEN_REGEX = /^(\s{0,3})(`{3,}|~{3,})(.*)$/;
const PATH_REGEX =
  /(?:\.\/|\.\.\/|\/|[A-Za-z]:\\)[\w\-/\\.]+|[\w\-.]+[/\\][\w\-/\\.]+/g;

// ---------- Detection ----------

function isJsonContent(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

function isYamlContent(lines: string[]): boolean {
  let indicators = 0;
  let nonEmpty = 0;
  for (const line of lines.slice(0, 30)) {
    const stripped = line.trim();
    if (!stripped) continue;
    nonEmpty++;
    if (stripped.startsWith("---")) indicators++;
    else if (/^\w[\w\s]*:\s/.test(stripped)) indicators++;
    else if (stripped.startsWith("- ") && stripped.includes(":")) indicators++;
  }
  return nonEmpty > 0 && indicators / nonEmpty > 0.6;
}

function isCodeLine(line: string): boolean {
  return CODE_LINE_PATTERNS.some((p) => p.test(line));
}

function isNaturalLanguage(filepath: string): boolean {
  const ext = extname(filepath).toLowerCase();

  if (COMPRESSIBLE_EXTENSIONS.has(ext)) return true;
  if (SKIP_EXTENSIONS.has(ext)) return false;
  if (ext) return false;

  let text: string;
  try {
    text = readFileSync(filepath, "utf8");
  } catch {
    return false;
  }
  const lines = text.split(/\r?\n/).slice(0, 50);

  if (isJsonContent(text.slice(0, 10_000))) return false;
  if (isYamlContent(lines)) return false;

  const nonEmpty = lines.filter((l) => l.trim());
  const codeLines = nonEmpty.filter(isCodeLine).length;
  return nonEmpty.length === 0 || codeLines / nonEmpty.length <= 0.4;
}

function shouldCompress(filepath: string): boolean {
  if (!existsSync(filepath) || !statSync(filepath).isFile()) return false;
  return isNaturalLanguage(filepath);
}

// ---------- Claude CLI ----------

function stripLlmWrapper(text: string): string {
  const m = text.match(OUTER_FENCE_REGEX);
  return m && m[2] !== undefined ? m[2] : text;
}

function readZaiToken(): string | null {
  if (!existsSync(ENV_FILE)) return null;
  const text = readFileSync(ENV_FILE, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?Z_AI_API_TOKEN\s*=\s*(.*)$/);
    if (!m) continue;
    let value = (m[1] ?? "").trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) return value;
  }
  return null;
}

function callClaude(prompt: string): string {
  const token = readZaiToken();
  const env = token
    ? {
        ...process.env,
        ANTHROPIC_AUTH_TOKEN: token,
        ANTHROPIC_BASE_URL: Z_AI_BASE_URL,
      }
    : process.env;
  const result = spawnSync("claude", ["--print"], {
    input: prompt,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
    env,
  });
  if (result.status !== 0) {
    throw new Error(`claude CLI failed:\n${result.stderr}`);
  }
  return stripLlmWrapper(result.stdout.trim());
}

function buildCompressPrompt(original: string): string {
  return `Compress this markdown into caveman format.

STRICT RULES:
- Do NOT modify anything inside \`\`\` code blocks
- Do NOT modify anything inside inline backticks
- Preserve ALL URLs exactly
- Preserve ALL headings exactly
- Preserve file paths and commands
- Return ONLY the compressed markdown body — do NOT wrap the entire output in a \`\`\`markdown fence or any other fence. Inner code blocks from the original stay as-is; do not add a new outer fence around the whole file.

Only compress natural language.

TEXT:
${original}
`;
}

function buildFixPrompt(
  original: string,
  compressed: string,
  errors: string[],
): string {
  const errorsStr = errors.map((e) => `- ${e}`).join("\n");
  return `You are fixing a caveman-compressed markdown file. Specific validation errors were found.

CRITICAL RULES:
- DO NOT recompress or rephrase the file
- ONLY fix the listed errors — leave everything else exactly as-is
- The ORIGINAL is provided as reference only (to restore missing content)
- Preserve caveman style in all untouched sections

ERRORS TO FIX:
${errorsStr}

HOW TO FIX:
- Missing URL: find it in ORIGINAL, restore it exactly where it belongs in COMPRESSED
- Code block mismatch: find the exact code block in ORIGINAL, restore it in COMPRESSED
- Heading mismatch: restore the exact heading text from ORIGINAL into COMPRESSED
- Do not touch any section not mentioned in the errors

ORIGINAL (reference only):
${original}

COMPRESSED (fix this):
${compressed}

Return ONLY the fixed compressed file. No explanation.
`;
}

// ---------- Validation ----------

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

function extractHeadings(text: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const m of text.matchAll(HEADING_REGEX)) {
    out.push([m[1] ?? "", (m[2] ?? "").trim()]);
  }
  return out;
}

interface CodeBlockMatch {
  block: string;
  start: number;
  end: number;
}

function extractCodeBlocksWithPositions(text: string): CodeBlockMatch[] {
  const blocks: CodeBlockMatch[] = [];
  let i = 0;
  while (i < text.length) {
    const lineStart = i;
    let lineEnd = text.indexOf("\n", i);
    if (lineEnd === -1) lineEnd = text.length;
    const line = text.slice(lineStart, lineEnd);

    const m = line.match(FENCE_OPEN_REGEX);
    if (!m) {
      i = lineEnd + 1;
      continue;
    }
    const fenceMarker = m[2] ?? "";
    const fenceChar = fenceMarker[0] ?? "";
    const fenceLen = fenceMarker.length;

    let cursor = lineEnd + 1;
    let blockEnd = -1;
    while (cursor <= text.length) {
      const ls = cursor;
      let le = text.indexOf("\n", cursor);
      if (le === -1) le = text.length;
      const cur = text.slice(ls, le);
      const cm = cur.match(FENCE_OPEN_REGEX);
      if (
        cm &&
        (cm[2]?.[0] ?? "") === fenceChar &&
        (cm[2]?.length ?? 0) >= fenceLen &&
        (cm[3] ?? "").trim() === ""
      ) {
        blockEnd = le;
        break;
      }
      if (le === text.length) break;
      cursor = le + 1;
    }

    if (blockEnd >= 0) {
      blocks.push({
        block: text.slice(lineStart, blockEnd),
        start: lineStart,
        end: blockEnd,
      });
      i = blockEnd + 1;
    } else {
      i = lineEnd + 1;
    }
  }
  return blocks;
}

function extractCodeBlocks(text: string): string[] {
  return extractCodeBlocksWithPositions(text).map((b) => b.block);
}

function extractSet(text: string, regex: RegExp): Set<string> {
  return new Set(text.match(regex) ?? []);
}

function setDiff(a: Set<string>, b: Set<string>): string[] {
  return [...a].filter((x) => !b.has(x));
}

function formatHeading([level, text]: [string, string]): string {
  return `${level} ${text}`;
}

function diffHeadings(
  a: Array<[string, string]>,
  b: Array<[string, string]>,
): { lost: string[]; added: string[]; reordered: Array<[string, string]> } {
  const sa = a.map(formatHeading);
  const sb = b.map(formatHeading);
  const setB = new Set(sb);
  const setA = new Set(sa);
  const lost = sa.filter((h) => !setB.has(h));
  const added = sb.filter((h) => !setA.has(h));
  const reordered: Array<[string, string]> = [];
  if (lost.length === 0 && added.length === 0) {
    for (let i = 0; i < sa.length; i++) {
      if (sa[i] !== sb[i]) reordered.push([sa[i] ?? "", sb[i] ?? ""]);
    }
  }
  return { lost, added, reordered };
}

function summarizeBlock(block: string, maxLen = 80): string {
  const firstLine = (block.split("\n")[0] ?? "").trim();
  const lineCount = block.split("\n").length;
  const head =
    firstLine.length > maxLen ? `${firstLine.slice(0, maxLen)}…` : firstLine;
  return `${head} (${lineCount} lines)`;
}

function diffCodeBlocks(
  a: string[],
  b: string[],
): Array<{ index: number; reason: string; orig: string; comp?: string }> {
  const diffs: Array<{
    index: number;
    reason: string;
    orig: string;
    comp?: string;
  }> = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    const ao = a[i];
    const bo = b[i];
    if (ao === undefined) {
      diffs.push({ index: i, reason: "extra block in compressed", orig: "—", comp: bo });
    } else if (bo === undefined) {
      diffs.push({ index: i, reason: "missing in compressed", orig: ao });
    } else if (ao !== bo) {
      diffs.push({ index: i, reason: "content differs", orig: ao, comp: bo });
    }
  }
  return diffs;
}

// ---------- Mechanical patching ----------

const FUZZY_THRESHOLD = 0.7;

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  let cur = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, (prev[j] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n] ?? 0;
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  const min = Math.min(a.length, b.length);
  // Lower bound: best possible similarity given the length gap.
  // Skips Levenshtein when even a perfect alignment can't reach the threshold.
  if (min / max < FUZZY_THRESHOLD) return min / max;
  return 1 - levenshtein(a, b) / max;
}

// Replaces compressed code blocks with their originals when fuzzy match is
// confident. Tries positional match first (the common case), then best-match
// across remaining originals (handles deleted/reordered blocks). Blocks below
// the threshold are left untouched and surface as validation errors.
function patchCodeBlocks(
  origBody: string,
  compBody: string,
): { patched: string; count: number } {
  const origBlocks = extractCodeBlocksWithPositions(origBody).map((b) => b.block);
  const compBlocks = extractCodeBlocksWithPositions(compBody);

  const used = new Set<number>();
  const replacements: Array<{ start: number; end: number; text: string }> = [];

  for (let i = 0; i < compBlocks.length; i++) {
    const cb = compBlocks[i];
    if (cb === undefined) continue;
    let matchIdx = -1;

    const positional = origBlocks[i];
    if (
      positional !== undefined &&
      !used.has(i) &&
      similarity(positional, cb.block) >= FUZZY_THRESHOLD
    ) {
      matchIdx = i;
    } else {
      let bestSim = FUZZY_THRESHOLD;
      for (let j = 0; j < origBlocks.length; j++) {
        if (used.has(j)) continue;
        const ob = origBlocks[j];
        if (ob === undefined) continue;
        const s = similarity(ob, cb.block);
        if (s > bestSim) {
          bestSim = s;
          matchIdx = j;
        }
      }
    }

    if (matchIdx >= 0) {
      used.add(matchIdx);
      const matched = origBlocks[matchIdx];
      if (matched !== undefined && matched !== cb.block) {
        replacements.push({ start: cb.start, end: cb.end, text: matched });
      }
    }
  }

  if (replacements.length === 0) return { patched: compBody, count: 0 };

  replacements.sort((a, b) => b.start - a.start);
  let patched = compBody;
  for (const r of replacements) {
    patched = patched.slice(0, r.start) + r.text + patched.slice(r.end);
  }
  return { patched, count: replacements.length };
}

function validate(orig: string, comp: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const h1 = extractHeadings(orig);
  const h2 = extractHeadings(comp);
  if (h1.length !== h2.length) {
    const { lost, added } = diffHeadings(h1, h2);
    const detail = [
      lost.length ? `lost: ${lost.map((h) => JSON.stringify(h)).join(", ")}` : "",
      added.length ? `added: ${added.map((h) => JSON.stringify(h)).join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("; ");
    errors.push(
      `Heading count mismatch: ${h1.length} vs ${h2.length}${detail ? ` (${detail})` : ""}`,
    );
  } else if (JSON.stringify(h1) !== JSON.stringify(h2)) {
    const { lost, added, reordered } = diffHeadings(h1, h2);
    if (lost.length || added.length) {
      warnings.push(
        `Heading text changed: lost=${JSON.stringify(lost)}, added=${JSON.stringify(added)}`,
      );
    } else if (reordered.length) {
      const sample = reordered
        .slice(0, 3)
        .map(([from, to]) => `${JSON.stringify(from)} → ${JSON.stringify(to)}`)
        .join("; ");
      warnings.push(
        `Heading order changed (${reordered.length} position${reordered.length === 1 ? "" : "s"}): ${sample}`,
      );
    } else {
      warnings.push("Heading text/order changed");
    }
  }

  const c1 = extractCodeBlocks(orig);
  const c2 = extractCodeBlocks(comp);
  if (JSON.stringify(c1) !== JSON.stringify(c2)) {
    const diffs = diffCodeBlocks(c1, c2);
    if (diffs.length === 0) {
      errors.push(
        `Code block count mismatch: ${c1.length} vs ${c2.length} (no per-index diff)`,
      );
    } else {
      for (const d of diffs.slice(0, 3)) {
        errors.push(
          `Code block #${d.index + 1} ${d.reason}: original=${JSON.stringify(summarizeBlock(d.orig))}${d.comp !== undefined ? `, compressed=${JSON.stringify(summarizeBlock(d.comp))}` : ""}`,
        );
      }
      if (diffs.length > 3) {
        errors.push(`…and ${diffs.length - 3} more code block diff(s)`);
      }
    }
  }

  const u1 = extractSet(orig, URL_REGEX);
  const u2 = extractSet(comp, URL_REGEX);
  if (u1.size !== u2.size || [...u1].some((u) => !u2.has(u))) {
    const lost = setDiff(u1, u2);
    const added = setDiff(u2, u1);
    const parts: string[] = [`${u1.size} → ${u2.size}`];
    if (lost.length) parts.push(`lost (${lost.length}): ${JSON.stringify(lost)}`);
    if (added.length) parts.push(`added (${added.length}): ${JSON.stringify(added)}`);
    errors.push(`URL mismatch: ${parts.join("; ")}`);
  }

  const p1 = extractSet(orig, PATH_REGEX);
  const p2 = extractSet(comp, PATH_REGEX);
  const lostPaths = setDiff(p1, p2);
  if (lostPaths.length) {
    const added = setDiff(p2, p1);
    const parts: string[] = [`${p1.size} → ${p2.size}`];
    parts.push(`lost (${lostPaths.length}): ${JSON.stringify(lostPaths)}`);
    if (added.length) parts.push(`added (${added.length}): ${JSON.stringify(added)}`);
    warnings.push(`Path mismatch: ${parts.join("; ")}`);
  }

  const b1 = (orig.match(BULLET_REGEX) ?? []).length;
  const b2 = (comp.match(BULLET_REGEX) ?? []).length;
  if (b1 > 0 && Math.abs(b1 - b2) / b1 > 0.15) {
    const delta = b2 - b1;
    const pct = ((Math.abs(delta) / b1) * 100).toFixed(1);
    warnings.push(
      `Bullet count changed too much: ${b1} → ${b2} (${delta >= 0 ? "+" : ""}${delta}, ${pct}% change, threshold 15%)`,
    );
  }

  return { isValid: errors.length === 0, errors, warnings };
}

// ---------- Compression ----------

// Splits a markdown file into [frontmatter, body]. Frontmatter is the leading
// `---\n...\n---\n` block, returned verbatim including delimiters and trailing
// newline. Returns ["", text] when no frontmatter is present.
function splitFrontmatter(text: string): [string, string] {
  const m = text.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)([\s\S]*)$/);
  if (!m || m[1] === undefined || m[2] === undefined) return ["", text];
  return [m[1], m[2]];
}

function compressFile(filepath: string): boolean {
  const abs = resolve(filepath);
  if (!existsSync(abs)) {
    throw new Error(`File not found: ${abs}`);
  }
  if (statSync(abs).size > MAX_FILE_SIZE) {
    throw new Error(`File too large to compress safely (max 500KB): ${abs}`);
  }

  console.log(`Processing: ${abs}`);

  if (!shouldCompress(abs)) {
    console.log("Skipping (not natural language)");
    return false;
  }

  const originalText = readFileSync(abs, "utf8");
  const [frontmatter, originalBody] = splitFrontmatter(originalText);

  console.log("Compressing with Claude...");
  let compressedBody = callClaude(buildCompressPrompt(originalBody));

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    console.log(`\nValidation attempt ${attempt + 1}/${MAX_RETRIES}`);

    const patched = patchCodeBlocks(originalBody, compressedBody);
    if (patched.count > 0) {
      console.log(
        `🔧 Restored ${patched.count} code block${patched.count === 1 ? "" : "s"} from original`,
      );
      compressedBody = patched.patched;
    }

    const result = validate(originalText, frontmatter + compressedBody);

    if (result.isValid) {
      const finalText = frontmatter + compressedBody;
      writeFileSync(abs, finalText);
      const before = countTokens(originalText);
      const after = countTokens(finalText);
      const saved = before - after;
      const pct = before > 0 ? ((saved / before) * 100).toFixed(1) : "0.0";
      console.log(
        `✅ Validation passed (${result.warnings.length} warning${result.warnings.length === 1 ? "" : "s"})`,
      );
      console.log(
        `🪙 Tokens: ${before} → ${after} (saved ${saved}, -${pct}%)`,
      );
      if (result.warnings.length) {
        console.log(`Warnings (${result.warnings.length}):`);
        for (const [i, w] of result.warnings.entries()) {
          console.log(`   ${i + 1}. ${w}`);
        }
      }
      return true;
    }

    console.log(
      `❌ Validation failed (${result.errors.length} error${result.errors.length === 1 ? "" : "s"}, ${result.warnings.length} warning${result.warnings.length === 1 ? "" : "s"}):`,
    );
    console.log(`Errors (${result.errors.length}):`);
    for (const [i, err] of result.errors.entries()) {
      console.log(`   ${i + 1}. ${err}`);
    }
    if (result.warnings.length) {
      console.log(`Warnings (${result.warnings.length}):`);
      for (const [i, w] of result.warnings.entries()) {
        console.log(`   ${i + 1}. ${w}`);
      }
    }

    if (attempt === 0) {
      writeFileSync(abs, frontmatter + compressedBody);
      console.log(`🐞 Wrote post-step-1 output to ${abs}`);
    }

    if (attempt === MAX_RETRIES - 1) {
      console.log(
        `❌ Failed after ${MAX_RETRIES} attempts — original left untouched`,
      );
      return false;
    }

    console.log("Fixing with Claude...");
    compressedBody = callClaude(
      buildFixPrompt(originalBody, compressedBody, result.errors),
    );
  }

  return true;
}

// ---------- CLI ----------

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: tsx scripts/caveman.ts <file> [<file> ...]");
    process.exit(1);
  }

  let failures = 0;
  for (const arg of args) {
    try {
      const ok = compressFile(arg);
      if (!ok) failures++;
      console.log("");
    } catch (e) {
      failures++;
      console.error(`❌ ${arg}: ${(e as Error).message}\n`);
    }
  }

  process.exit(failures === 0 ? 0 : 2);
}

main();
