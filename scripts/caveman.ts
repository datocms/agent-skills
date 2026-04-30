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
  if (filepath.endsWith(".original.md")) return false;
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

function extractCodeBlocks(text: string): string[] {
  const blocks: string[] = [];
  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line === undefined) {
      i++;
      continue;
    }
    const m = line.match(FENCE_OPEN_REGEX);
    if (!m) {
      i++;
      continue;
    }
    const fenceMarker = m[2] ?? "";
    const fenceChar = fenceMarker[0] ?? "";
    const fenceLen = fenceMarker.length;
    const blockLines = [line];
    i++;
    let closed = false;
    while (i < lines.length) {
      const cur = lines[i];
      if (cur === undefined) break;
      const cm = cur.match(FENCE_OPEN_REGEX);
      if (
        cm &&
        (cm[2]?.[0] ?? "") === fenceChar &&
        (cm[2]?.length ?? 0) >= fenceLen &&
        (cm[3] ?? "").trim() === ""
      ) {
        blockLines.push(cur);
        closed = true;
        i++;
        break;
      }
      blockLines.push(cur);
      i++;
    }
    if (closed) blocks.push(blockLines.join("\n"));
  }
  return blocks;
}

function extractSet(text: string, regex: RegExp): Set<string> {
  return new Set(text.match(regex) ?? []);
}

function setDiff(a: Set<string>, b: Set<string>): string[] {
  return [...a].filter((x) => !b.has(x));
}

function validate(orig: string, comp: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const h1 = extractHeadings(orig);
  const h2 = extractHeadings(comp);
  if (h1.length !== h2.length) {
    errors.push(`Heading count mismatch: ${h1.length} vs ${h2.length}`);
  }
  if (JSON.stringify(h1) !== JSON.stringify(h2)) {
    warnings.push("Heading text/order changed");
  }

  const c1 = extractCodeBlocks(orig);
  const c2 = extractCodeBlocks(comp);
  if (JSON.stringify(c1) !== JSON.stringify(c2)) {
    errors.push("Code blocks not preserved exactly");
  }

  const u1 = extractSet(orig, URL_REGEX);
  const u2 = extractSet(comp, URL_REGEX);
  if (u1.size !== u2.size || [...u1].some((u) => !u2.has(u))) {
    errors.push(
      `URL mismatch: lost=${JSON.stringify(setDiff(u1, u2))}, added=${JSON.stringify(setDiff(u2, u1))}`,
    );
  }

  const p1 = extractSet(orig, PATH_REGEX);
  const p2 = extractSet(comp, PATH_REGEX);
  if (p1.size !== p2.size || [...p1].some((p) => !p2.has(p))) {
    warnings.push(
      `Path mismatch: lost=${JSON.stringify(setDiff(p1, p2))}, added=${JSON.stringify(setDiff(p2, p1))}`,
    );
  }

  const b1 = (orig.match(BULLET_REGEX) ?? []).length;
  const b2 = (comp.match(BULLET_REGEX) ?? []).length;
  if (b1 > 0 && Math.abs(b1 - b2) / b1 > 0.15) {
    warnings.push(`Bullet count changed too much: ${b1} -> ${b2}`);
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
    console.log(`\nValidation attempt ${attempt + 1}`);
    const result = validate(originalText, frontmatter + compressedBody);

    if (result.isValid) {
      writeFileSync(abs, frontmatter + compressedBody);
      console.log("Validation passed");
      if (result.warnings.length) {
        console.log("Warnings:");
        for (const w of result.warnings) console.log(`   - ${w}`);
      }
      return true;
    }

    console.log("❌ Validation failed:");
    for (const err of result.errors) console.log(`   - ${err}`);

    if (attempt === MAX_RETRIES - 1) {
      console.log("❌ Failed after retries — original left untouched");
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
