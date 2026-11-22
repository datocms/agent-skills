#!/usr/bin/env node
// Re-downloads the react-ui.datocms.com pages into the datocms-plugin-design skill.
//
//   node dev/scripts/sync-react-ui-docs.mjs            fetch, write changes, update SOURCE.md
//   node dev/scripts/sync-react-ui-docs.mjs --check    fetch and compare only (no writes)
//   node dev/scripts/sync-react-ui-docs.mjs --version 4.0.0   also set the package version in SOURCE.md
//
// Pages are stored byte for byte, in two files: `<Page>.md` holds the page up to its "## Props"
// heading (rules, examples) and `<Page>.props.md` the rest (the props tables), so that reading a
// page does not load its props tables. The two files joined are the page as the site serves it.
// Exits 1 when SKILL.md's page index does not list exactly the mirrored pages, when a fetch
// fails, or (with --check) when the local mirror differs from the site.
// No dependencies: Node >= 18 (global fetch).

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SITE = 'https://react-ui.datocms.com';
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const SKILL_DIR = join(REPO, 'skills/datocms-plugin-design');
export const DOCS_DIR = join(SKILL_DIR, 'references/docs');
const PAGE_PATH = /^[A-Z][A-Za-z]*\/[A-Za-z]+$/;
const PROPS_HEADING = Buffer.from('\n## Props\n');
const PROPS_SUFFIX = '.props.md';

/** A page's bytes as the two parts stored on disk; `props` is null for a page with no props tables. */
export function splitPage(body) {
  const at = body.indexOf(PROPS_HEADING);
  if (at === -1) return { page: body, props: null };
  return { page: body.subarray(0, at + 1), props: body.subarray(at + 1) };
}

/** The bytes of a mirrored page as the site serves it: its two files joined. */
export function readPage(path, dir = DOCS_DIR) {
  const page = readFileSync(join(dir, `${path}.md`));
  const propsFile = join(dir, `${path}${PROPS_SUFFIX}`);
  return existsSync(propsFile) ? Buffer.concat([page, readFileSync(propsFile)]) : page;
}

function writePage(path, body) {
  const { page, props } = splitPage(body);
  const file = join(DOCS_DIR, `${path}.md`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, page);
  const propsFile = join(DOCS_DIR, `${path}${PROPS_SUFFIX}`);
  if (props) writeFileSync(propsFile, props);
  else rmSync(propsFile, { force: true });
}

/** Page paths (`Section/Page`) listed in llms.txt, in order. */
export function parseLlmsTxt(text) {
  const paths = [];
  for (const match of text.matchAll(/\]\(https:\/\/react-ui\.datocms\.com\/([^)\s]+)\.md\)/g)) {
    if (PAGE_PATH.test(match[1]) && !paths.includes(match[1])) paths.push(match[1]);
  }
  return paths;
}

/** Page paths listed in SKILL.md's "## Page index" section: lines starting with - `Section/Page`. */
export function parseSkillIndex(skillText) {
  const start = skillText.indexOf('\n## Page index');
  if (start === -1) throw new Error('SKILL.md has no "## Page index" section');
  const rest = skillText.slice(start + 1);
  const next = rest.indexOf('\n## ');
  const section = next === -1 ? rest : rest.slice(0, next);
  return [...section.matchAll(/^- `([^`]+)`/gm)].map((m) => m[1]);
}

/** Page paths mirrored on disk (`Section/Page`), excluding SOURCE.md. */
export function localPages(dir = DOCS_DIR) {
  if (!existsSync(dir)) return [];
  const pages = [];
  for (const section of readdirSync(dir, { withFileTypes: true })) {
    if (!section.isDirectory()) continue;
    for (const file of readdirSync(join(dir, section.name))) {
      if (file.endsWith('.md') && !file.endsWith(PROPS_SUFFIX)) pages.push(`${section.name}/${file.slice(0, -3)}`);
    }
  }
  return pages.sort();
}

/** Differences between two sets of page paths. */
export function compareSets(expected, actual) {
  const a = new Set(actual);
  const e = new Set(expected);
  return {
    missing: [...e].filter((p) => !a.has(p)).sort(),
    extra: [...a].filter((p) => !e.has(p)).sort(),
  };
}

async function get(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'agent-skills-docs-sync' } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

function looksLikeHtml(buffer) {
  // The site answers unknown paths with its SPA shell and status 200.
  return /^\s*<(!doctype|html)/i.test(buffer.subarray(0, 200).toString('utf8'));
}

function updateSource(count, version) {
  const file = join(DOCS_DIR, 'SOURCE.md');
  let text = readFileSync(file, 'utf8');
  const today = new Date().toISOString().slice(0, 10);
  text = text.replace(/^- Fetched: .*$/m, `- Fetched: ${today}`).replace(/^- Pages: .*$/m, `- Pages: ${count}`);
  if (version) text = text.replace(/^- Package documented: .*$/m, `- Package documented: \`datocms-react-ui@${version}\``);
  writeFileSync(file, text);
}

async function main(argv) {
  const check = argv.includes('--check');
  const versionIndex = argv.indexOf('--version');
  const version = versionIndex === -1 ? null : argv[versionIndex + 1];
  let failed = false;

  const remote = parseLlmsTxt((await get(`${SITE}/llms.txt`)).toString('utf8'));
  if (remote.length === 0) throw new Error('llms.txt lists no pages');

  const local = new Set(localPages());
  const added = [];
  const changed = [];
  const fetched = new Map();
  for (const path of remote) {
    const body = await get(`${SITE}/${path}.md`);
    if (looksLikeHtml(body)) {
      console.error(`! ${path}: the site returned HTML, not Markdown`);
      failed = true;
      continue;
    }
    fetched.set(path, body);
    if (!local.has(path)) added.push(path);
    else if (!readPage(path).equals(body)) changed.push(path);
  }
  const removed = [...local].filter((p) => !remote.includes(p)).sort();

  for (const [label, list] of [['added', added], ['removed', removed], ['changed', changed]]) {
    console.log(`${label}: ${list.length}${list.length ? `\n  ${list.join('\n  ')}` : ''}`);
  }

  if (check) {
    if (added.length || removed.length || changed.length) failed = true;
  } else if (!failed) {
    for (const path of [...added, ...changed]) writePage(path, fetched.get(path));
    for (const path of removed) {
      rmSync(join(DOCS_DIR, `${path}.md`));
      rmSync(join(DOCS_DIR, `${path}${PROPS_SUFFIX}`), { force: true });
    }
    for (const section of readdirSync(DOCS_DIR, { withFileTypes: true })) {
      if (section.isDirectory() && readdirSync(join(DOCS_DIR, section.name)).length === 0) {
        rmSync(join(DOCS_DIR, section.name), { recursive: true });
      }
    }
    updateSource(remote.length, version);
  }

  const index = parseSkillIndex(readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8'));
  const { missing, extra } = compareSets(remote, index);
  const duplicates = index.filter((p, i) => index.indexOf(p) !== i);
  if (missing.length || extra.length || duplicates.length) {
    failed = true;
    if (missing.length) console.error(`SKILL.md index lacks: ${missing.join(', ')}`);
    if (extra.length) console.error(`SKILL.md index lists pages the site does not have: ${extra.join(', ')}`);
    if (duplicates.length) console.error(`SKILL.md index lists twice: ${duplicates.join(', ')}`);
  } else {
    console.log(`SKILL.md index: ${index.length} pages, matches`);
  }

  if (!check && (added.length || removed.length)) {
    console.log('Pages were added or removed: update the index in SKILL.md and the expected list in the tests.');
  }
  return failed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(error.message);
      process.exit(1);
    },
  );
}
