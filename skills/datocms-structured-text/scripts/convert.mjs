#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { lstat, readFile, realpath, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { hastToStructuredText, parse5ToStructuredText } from 'datocms-html-to-structured-text';
import { allowedChildren, inlineNodeTypes, validate } from 'datocms-structured-text-utils';
import { toHast } from 'mdast-util-to-hast';
import { parse as parseHtml } from 'parse5';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

// This helper deliberately supports semantic prose, not arbitrary document fidelity.
const usage = 'node convert.mjs --input FILE --format markdown|html --output FILE --report FILE';
const markdownTypes = new Set(['root', 'paragraph', 'heading', 'blockquote', 'list', 'listItem', 'text', 'strong', 'emphasis', 'delete', 'inlineCode', 'code', 'link', 'linkReference', 'definition', 'break', 'thematicBreak']);
const nodeTypes = { p: 'paragraph', h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading', blockquote: 'blockquote', ul: 'list', ol: 'list', li: 'listItem', pre: 'code', a: 'link', hr: 'thematicBreak' };
const inlineTags = new Set(['strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'mark', 'code', 'br', 'span']);
const wrappers = new Set(['html', 'head', 'body', 'div']);
const metadata = new Set(['title', 'meta']);

function issue(code, message, node, action = 'Map this feature explicitly in task code before retrying.') {
  const loc = node?.position?.start || node?.sourceCodeLocation;
  return { code, message, ...(loc ? { position: { line: loc.line ?? loc.startLine, column: loc.column ?? loc.startCol } } : {}), action };
}

function auditMarkdown(tree, diagnostics) {
  function walk(node) {
    if (!markdownTypes.has(node.type)) {
      diagnostics.push(issue('UNSUPPORTED_MARKDOWN', `Markdown ${node.type} requires an explicit mapping.`, node));
      return;
    }
    if (node.type === 'listItem' && node.checked != null) {
      diagnostics.push(issue('TASK_LIST', 'Task-list checkbox state has no automatic mapping.', node));
    }
    if (node.type === 'list' && node.ordered && node.start !== 1) {
      diagnostics.push(issue('LIST_START', 'Numbered lists must start at 1; DAST does not preserve a custom start.', node));
    }
    if (node.type === 'code' && node.meta) {
      diagnostics.push(issue('CODE_METADATA', 'Code-fence metadata needs an explicit mapping.', node));
    }
    node.children?.forEach(walk);
  }
  walk(tree);
}

function auditHtml(document, diagnostics) {
  // Audit parse5 nodes before the converter's whitespace minification or handlers run.
  function hasListContent(node) {
    if (node.nodeName === '#text') return /[^\t\n\f\r ]/.test(node.value);
    if (node.tagName === 'br') return true;
    return node.childNodes?.some(hasListContent) ?? false;
  }

  function walk(node, context = 'root', ancestors = [], inheritedUnderline = false) {
    const tag = node.tagName;
    if (node.nodeName === '#text') {
      if (node.value.trim() && ['list', 'blockquote'].includes(context)) {
        diagnostics.push(issue('UNSUPPORTED_NESTING', `Text directly inside ${context} needs an explicit paragraph.`, node));
      }
      return;
    }
    if (!tag) {
      node.childNodes?.forEach((child) => walk(child, context, ancestors, inheritedUnderline));
      return;
    }
    if (metadata.has(tag) && ancestors.includes('head')) return;
    if (!nodeTypes[tag] && !inlineTags.has(tag) && !wrappers.has(tag)) {
      diagnostics.push(issue('UNSUPPORTED_HTML', `HTML <${tag}> requires an explicit mapping.`, node));
      return;
    }
    if (tag === 'li' && !hasListContent(node)) {
      diagnostics.push(issue('EMPTY_LIST_ITEM', 'The converter would remove this empty list item and change list positions.', node, 'Add the intended item content, or explicitly map the empty item while preserving list positions.'));
    }
    // Tight Markdown lists (and ordinary HTML <li>) omit <p>. The converter
    // wraps each consecutive inline run in a paragraph without changing it.
    if (context === 'listItem' && (inlineTags.has(tag) || tag === 'a')) context = 'paragraph';
    let nextContext = nodeTypes[tag] || context;
    if (nodeTypes[tag]) {
      const allowed = allowedChildren[context];
      const accepted = allowed === 'inlineNodes' ? inlineNodeTypes : allowed;
      if (!accepted?.includes(nextContext)) {
        diagnostics.push(issue('UNSUPPORTED_NESTING', `<${tag}> cannot retain its meaning inside ${context}.`, node));
      }
    }
    if (inlineTags.has(tag) && ['root', 'list', 'listItem', 'blockquote'].includes(context)) {
      diagnostics.push(issue('UNSUPPORTED_NESTING', `<${tag}> needs an explicit paragraph or heading.`, node));
    }
    if (ancestors.includes('pre') && tag !== 'code') {
      diagnostics.push(issue('CODE_MARKUP', 'Code blocks may contain only plain text and one <code> wrapper.', node));
    }
    if (tag === 'div' && context !== 'root') {
      diagnostics.push(issue('UNSUPPORTED_NESTING', 'Container <div> is supported only around root-level blocks.', node));
    }
    if (tag === 'div' && node.childNodes?.some((child) => child.nodeName === '#text' && child.value.trim())) {
      diagnostics.push(issue('UNSUPPORTED_NESTING', 'Wrap text inside <div> in explicit paragraphs to retain boundaries.', node));
    }
    if (tag === 'u' && ancestors.includes('a')) {
      diagnostics.push(issue('LINK_UNDERLINE', 'Explicit underline inside links is removed by the converter.', node));
    }
    const attrs = Object.fromEntries((node.attrs || []).map((attr) => [attr.name, attr.value]));
    if (tag === 'a' && inheritedUnderline) {
      diagnostics.push(issue('LINK_UNDERLINE', 'Inherited underline on links is removed by the converter.', node));
    }
    for (const [name, value] of Object.entries(attrs)) {
      if (tag === 'a' && ['href', 'title', 'target', 'rel'].includes(name)) continue;
      if (tag === 'ol' && name === 'start' && value === '1') continue;
      if (tag === 'code' && name === 'class' && /^language-[\w.+-]+$/.test(value)) {
        if (!ancestors.includes('pre')) diagnostics.push(issue('CODE_LANGUAGE', 'Language metadata belongs on a fenced code block.', node));
        continue;
      }
      if (tag === 'span' && name === 'style') {
        const declarations = value.split(';').map((part) => part.trim()).filter(Boolean);
        for (const declaration of declarations) {
          if (!/^(font-weight\s*:\s*(bold|[5-9]00)|font-style\s*:\s*italic|text-decoration\s*:\s*underline)$/.test(declaration)) {
            diagnostics.push(issue('UNSUPPORTED_STYLE', `Unsupported inline style: ${declaration}.`, node));
          } else if (ancestors.includes('a') && declaration.startsWith('text-decoration')) {
            diagnostics.push(issue('LINK_UNDERLINE', 'Explicit underline inside links is removed by the converter.', node));
          }
        }
        continue;
      }
      diagnostics.push(issue('UNSUPPORTED_ATTRIBUTE', `Attribute ${name} on <${tag}> has no automatic mapping.`, node));
    }
    if (tag === 'a' && !attrs.href) diagnostics.push(issue('MISSING_LINK_URL', 'Links must have a nonempty href.', node));
    if (tag === 'pre') {
      const nonempty = (node.childNodes || []).filter((child) => child.nodeName !== '#text' || child.value.trim());
      if (nonempty.some((child) => child.tagName && child.tagName !== 'code') || nonempty.filter((child) => child.tagName === 'code').length > 1) {
        diagnostics.push(issue('CODE_MARKUP', 'Use plain text or one <code> wrapper for a code block.', node));
      }
      // Code is a leaf in DAST; its optional HTML <code> wrapper is structural only.
      nextContext = 'paragraph';
    }
    const underline = inheritedUnderline || tag === 'u' || (tag === 'span' && /(?:^|;)\s*text-decoration\s*:\s*underline\s*(?:;|$)/.test(attrs.style || ''));
    node.childNodes?.forEach((child) => walk(child, nextContext, [...ancestors, tag], underline));
  }
  walk(document);
}

// Markdown's generated HAST is inspected with the same HTML policy and locations.
function asParse5(node) {
  if (node.type === 'text') return { nodeName: '#text', value: node.value, position: node.position };
  const attrs = Object.entries(node.properties || {}).map(([name, value]) => ({
    name: name === 'className' ? 'class' : name,
    value: Array.isArray(value) ? value.join(' ') : String(value),
  }));
  return { nodeName: node.tagName || '#document', tagName: node.tagName, attrs, position: node.position, childNodes: node.children?.map(asParse5) };
}

function normalizeDeletedMark(tree) {
  // The converter handles <s>; remark-gfm emits the equivalent <del> instead.
  if (tree.tagName === 'del') tree.tagName = 's';
  tree.children?.forEach(normalizeDeletedMark);
}

function preserveMarkdownCode(tree) {
  const inlineCode = new Map();
  function protect(node) {
    if (node.tagName === 'pre') return;
    if (node.tagName === 'code') {
      inlineCode.set(node, node.children);
      // The converter minifies before preprocessing. A non-whitespace placeholder
      // also keeps whitespace-only code and its surrounding spaces from disappearing.
      node.children = [{ type: 'text', value: 'code' }];
      return;
    }
    node.children?.forEach(protect);
  }
  protect(tree);
  return (tree) => {
    for (const [node, children] of inlineCode) node.children = children;
    normalizeDeletedMark(tree);
  };
}

function parseArgs(argv) {
  const options = {};
  const errors = [];
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '');
    if (!argv[i].startsWith('--') || !['input', 'format', 'output', 'report'].includes(key)) {
      errors.push(`Unknown argument ${argv[i]}.`);
    } else if (options[key] !== undefined) {
      errors.push(`Duplicate --${key}.`);
    } else if (!argv[i + 1] || argv[i + 1].startsWith('--')) {
      errors.push(`Missing value for --${key}.`);
    } else {
      options[key] = argv[++i];
    }
  }
  for (const key of ['input', 'format', 'output', 'report']) {
    if (!options[key]) errors.push(`Missing --${key}.`);
  }
  if (options.format && !['markdown', 'html'].includes(options.format)) errors.push('Format must be markdown or html.');
  return { options, errors };
}

async function identify(path, writable) {
  const absolute = resolve(path);
  try {
    const info = await lstat(absolute);
    if (writable && !info.isFile()) throw new Error('Output and report paths must be regular files, not symlinks or directories.');
    const canonical = await realpath(absolute);
    const target = await stat(canonical);
    return { path: absolute, canonical, inode: `${target.dev}:${target.ino}` };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    // Real parent paths catch aliases through a symlinked directory, including new outputs.
    const parent = await realpath(dirname(absolute));
    const parentInfo = await stat(parent);
    return { path: absolute, canonical: resolve(parent, basename(absolute)), parentInode: `${parentInfo.dev}:${parentInfo.ino}` };
  }
}

async function missingPathsAlias(first, second) {
  if (first.inode || second.inode || first.parentInode !== second.parentInode) return false;
  // Probe in the destination directory: case rules can vary by directory.
  // A shared random prefix keeps both destination names untouched.
  const prefix = `.${randomUUID()}-`;
  const firstProbe = resolve(dirname(first.canonical), prefix + basename(first.canonical));
  const secondProbe = resolve(dirname(first.canonical), prefix + basename(second.canonical));
  await writeFile(firstProbe, '', { flag: 'wx', mode: 0o600 });
  try {
    const firstInfo = await lstat(firstProbe);
    try {
      const secondInfo = await lstat(secondProbe);
      return firstInfo.dev === secondInfo.dev && firstInfo.ino === secondInfo.ino;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return false;
    }
  } finally {
    await unlink(firstProbe);
  }
}

async function safePaths(options) {
  if (!options.input || !options.output || !options.report) throw new Error('All three file paths are required before writing diagnostics.');
  const paths = await Promise.all(['input', 'output', 'report'].map((key) => identify(options[key], key !== 'input')));
  for (let i = 0; i < paths.length; i++) {
    for (let j = i + 1; j < paths.length; j++) {
      if (paths[i].canonical === paths[j].canonical || (paths[i].inode && paths[i].inode === paths[j].inode) || await missingPathsAlias(paths[i], paths[j])) {
        throw new Error('Input, output, and report must be distinct files (including symlink and hard-link aliases).');
      }
    }
  }
  return Object.fromEntries(['input', 'output', 'report'].map((key, index) => [key, paths[index].path]));
}

async function atomicWrite(path, content) {
  const temporary = resolve(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, content, { flag: 'wx', mode: 0o600 });
    await rename(temporary, path);
  } finally {
    await unlink(temporary).catch((error) => { if (error.code !== 'ENOENT') throw error; });
  }
}

const { options, errors } = parseArgs(process.argv.slice(2));
const report = { version: 1, ok: false, format: options.format ?? null, diagnostics: [], normalizations: [] };
let paths;
let document;
try {
  paths = await safePaths(options);
  if (errors.length) {
    report.diagnostics.push(issue('INVALID_ARGUMENTS', `${errors.join(' ')} Usage: ${usage}`, null, 'Correct the command arguments.'));
  } else {
    const source = new TextDecoder('utf-8', { fatal: true }).decode(await readFile(paths.input));
    if (!source.trim()) {
      report.diagnostics.push(issue('EMPTY_INPUT', 'Input contains no document content.', null, 'Supply a nonempty source document.'));
    } else if (options.format === 'markdown') {
      const tree = unified().use(remarkParse).use(remarkGfm).parse(source);
      auditMarkdown(tree, report.diagnostics);
      if (!report.diagnostics.length) {
        const hast = toHast(tree);
        auditHtml(asParse5(hast), report.diagnostics);
        if (!report.diagnostics.length) document = await hastToStructuredText(hast, { preprocess: preserveMarkdownCode(hast) });
      }
    } else {
      const tree = parseHtml(source, {
        sourceCodeLocationInfo: true,
        onParseError(error) {
          if (error.code !== 'missing-doctype') report.diagnostics.push(issue('INVALID_HTML', `HTML parser: ${error.code}.`, { sourceCodeLocation: error }, 'Repair the malformed HTML before conversion.'));
        },
      });
      auditHtml(tree, report.diagnostics);
      if (!report.diagnostics.length) document = await parse5ToStructuredText(tree, { preprocess: normalizeDeletedMark });
    }
    if (!report.diagnostics.length) {
      if (!document) report.diagnostics.push(issue('EMPTY_DOCUMENT', 'Conversion produced no document content.', null, 'Supply body content; document metadata alone is not content.'));
      else {
        const result = validate(document);
        if (!result.valid) report.diagnostics.push(issue('INVALID_DAST', result.message, null, 'Inspect the document structure and supply a custom mapping.'));
      }
    }
  }
} catch (error) {
  report.diagnostics.push(issue(paths ? 'CONVERSION_FAILED' : 'UNSAFE_PATHS', error.message, null, 'Correct the input or file paths and retry.'));
}

report.ok = report.diagnostics.length === 0;
if (report.ok) {
  report.normalizations = [
    'HTML whitespace and Markdown syntax are normalized to semantic prose; code-fence trailing newlines are removed.',
    'Document wrappers, doctype, comments, title, and meta do not become body content.',
    'Validation checks DAST structure only; destination field constraints and external references still need verification.',
  ];
}
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
try {
  if (paths) {
    // A report write failure must never replace a previously valid output document.
    await atomicWrite(paths.report, json(report));
    if (report.ok) await atomicWrite(paths.output, json(document));
  }
} catch (error) {
  report.ok = false;
  report.diagnostics.push(issue('WRITE_FAILED', error.message, null, 'Ensure both destination directories are writable and retry.'));
  if (paths) await atomicWrite(paths.report, json(report)).catch(() => {});
}
(report.ok ? process.stdout : process.stderr).write(json(report));
process.exitCode = report.ok ? 0 : 1;
