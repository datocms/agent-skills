import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// The hosted MCP server answers `get_api_methods` for `items` and `items/update`
// with two guides of this repo: it drops every line containing `cma:`, splits the
// guide at its `## ` headings, always shows the intro and a fixed list of sections,
// and lists the other sections by title for the agent to request one by one
// (remote-mcp: src/tools/getApiMethods/{index,curatedDocs}.ts). The functions below
// mirror that rendering, so these tests fail when a guide would make an MCP answer
// too big, or when a section the server names no longer exists.
const guides = {
  'records.md': {
    alwaysIncluded: ['Reading: `nested: true` is the primary knob', 'Typed records via generated `Schema.X`'],
    defaultAnswerBudget: 4_500,
  },
  'editing-records.md': {
    alwaysIncluded: ['Workflow', '`Schema.X` is mandatory on every typed call'],
    defaultAnswerBudget: 6_500,
  },
};
// The server warns the client above ~10k tokens per tool result and adds method
// docs and types to the guide, so one section must stay well below that.
const SECTION_BUDGET = 5_500;

function parseGuide(markdown) {
  const intro = [];
  const sections = [];
  let fence;
  for (const line of markdown.split('\n')) {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker) {
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length && line.trim() === marker) fence = undefined;
    } else if (!fence && line.startsWith('## ')) {
      sections.push({ title: line.slice(3).trim(), lines: [line] });
      continue;
    }
    (sections.at(-1)?.lines ?? intro).push(line);
  }
  return {
    intro: intro.join('\n').trim(),
    sections: sections.filter((section) => section.title !== 'Contents').map((section) => ({ title: section.title, markdown: section.lines.join('\n').trim() })),
  };
}
const normalize = (title) => title.replace(/`/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

for (const [file, { alwaysIncluded, defaultAnswerBudget }] of Object.entries(guides)) {
  const source = readFileSync(new URL(`../../skills/datocms-cma/references/${file}`, import.meta.url), 'utf8');
  const guide = parseGuide(source.split('\n').filter((line) => !line.includes('cma:')).join('\n'));

  test(`${file}: the sections the MCP server always shows exist`, () => {
    for (const title of alwaysIncluded) {
      assert.equal(guide.sections.filter((section) => normalize(section.title) === normalize(title)).length, 1, `section "${title}"`);
    }
  });

  test(`${file}: the default MCP answer stays within ${defaultAnswerBudget} characters`, () => {
    const shown = guide.sections.filter((section) => alwaysIncluded.some((title) => normalize(title) === normalize(section.title)));
    const listed = guide.sections.filter((section) => !shown.includes(section)).map((section) => `- ${section.title} (0.0 KB)`);
    const answer = [guide.intro, ...shown.map((section) => section.markdown), ...listed].join('\n\n');
    assert.ok(answer.length <= defaultAnswerBudget, `default answer is ${answer.length} characters`);
  });

  test(`${file}: every section an agent can request stays within ${SECTION_BUDGET} characters`, () => {
    for (const section of guide.sections) {
      assert.ok(section.markdown.length <= SECTION_BUDGET, `"${section.title}" is ${section.markdown.length} characters`);
    }
  });

  test(`${file}: section titles are unique and the Contents list matches them`, () => {
    const titles = guide.sections.map((section) => normalize(section.title));
    assert.equal(new Set(titles).size, titles.length);
    const contents = source.split('## Contents')[1].split(/^## /m)[0].split('\n').filter((line) => line.startsWith('- ')).map((line) => normalize(line.slice(2)));
    assert.deepEqual(contents, titles);
  });

  test(`${file}: the intro is short and no section depends on a CLI-only line`, () => {
    assert.ok(guide.intro.length <= 900, `intro is ${guide.intro.length} characters`);
    for (const line of source.split('\n').filter((entry) => entry.includes('cma:'))) {
      assert.match(line, /^> In CLI mode/, `a line with \`cma:\` is dropped by the server, so it must be a CLI-only note: ${line.slice(0, 80)}`);
    }
  });
}
