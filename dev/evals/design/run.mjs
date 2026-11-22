// Plugin UI evals: an agent builds one plugin surface in a small plugin project;
// `check` type-checks it against the real datocms-react-ui and datocms-plugin-sdk
// packages and applies rules of the design language that can be read from code.
//
//   node dev/evals/design/run.mjs prepare --case <id> --out <run dir> [--arm skills|none] [--skills-root <dir>]
//   node dev/evals/design/run.mjs check --case <id> --out <run dir>
//
// The first `prepare` installs the fixture's dependencies once into
// local/evals-design-cache (gitignored); workspaces link to it.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { skillListing } from '../knowledge/prompt.mjs';

const here = import.meta.dirname;
const repoRoot = resolve(here, '../../..');
const cache = join(repoRoot, 'local/evals-design-cache');

const main = (hook, component) => `import { connect } from 'datocms-plugin-sdk';
import ${component} from './${component}';
import { render } from './render';

connect({
  ${hook}
});
`;

export const cases = [
  {
    id: 'config-screen',
    file: 'ConfigScreen.tsx',
    main: main(`renderConfigScreen(ctx) {\n    render(<ConfigScreen ctx={ctx} />);\n  },`, 'ConfigScreen'),
    prompt: `Build the plugin's configuration screen in \`src/ConfigScreen.tsx\` (default export, props \`{ ctx: RenderConfigScreenCtx }\`). \`src/main.tsx\` already renders it from \`renderConfigScreen\`.

The plugin syncs editorial notes to an external service. Settings, stored in the plugin parameters:

- API token: secret, mandatory.
- Workspace: one of "Editorial", "Marketing", "Legal" (stored as \`editorial\`, \`marketing\`, \`legal\`), mandatory.
- Notify authors by e-mail: on/off, off by default, with a one-line explanation of what it does.
- Under a second group named "Advanced": Sync interval in minutes, a number, default 15.

A Save action stores the parameters and confirms to the user that they were saved. Saving is not possible while the API token is empty, and the user must be able to tell why. The screen must look native to DatoCMS, in light and dark mode.`,
    rules: ['noSectionTitleFirst', 'noPageShell', 'hasFieldWrapper', 'switchNamesItself', 'primarySave'],
  },
  {
    id: 'sidebar-panel',
    file: 'NotesPanel.tsx',
    main: main(
      `itemFormSidebarPanels() {\n    return [{ id: 'notes', label: 'Team notes' }];\n  },\n  renderItemFormSidebarPanel(_panelId, ctx) {\n    render(<NotesPanel ctx={ctx} />);\n  },`,
      'NotesPanel',
    ),
    prompt: `Build a record sidebar panel in \`src/NotesPanel.tsx\` (default export, props \`{ ctx: RenderItemFormSidebarPanelCtx }\`). \`src/main.tsx\` already registers and renders it.

The panel shows facts about the record being edited, read from \`ctx\`: its status, the model's name, and the number of locales the project has. Below them, a list of up to three "notes" (hard-code two sample notes, each with an author name and a text) and one action, "Add note", which for now only tells the user "Coming soon" through DatoCMS's own notification. When the record has not been saved yet (\`ctx.item\` is null), show an empty state that says notes become available after the first save, instead of the facts and the list.

The panel must look native to DatoCMS, in light and dark mode, and fit the narrow sidebar.`,
    rules: ['noOwnPanelTitle', 'noPageShell', 'factsInInfoList', 'emptyState', 'noStretchedButton'],
  },
  {
    id: 'custom-page',
    file: 'NotesPage.tsx',
    main: main(
      `mainNavigationTabs() {\n    return [{ label: 'Team notes', icon: 'note-sticky', pointsTo: { pageId: 'notes' } }];\n  },\n  renderPage(_pageId, ctx) {\n    render(<NotesPage ctx={ctx} />);\n  },`,
      'NotesPage',
    ),
    prompt: `Build a full custom page in \`src/NotesPage.tsx\` (default export, props \`{ ctx: RenderPageCtx }\`). \`src/main.tsx\` already registers and renders it.

The page lists team notes (hard-code six sample notes: id, title, author, status "open" or "resolved", updated-at date) in a table with the columns Title, Author, Status and Updated. A search box above the list filters by title. A control lets the user switch between All, Open and Resolved. The page has a title bar with the title "Team notes" and a primary action "New note" (it only needs to notify "Coming soon"). When the filters leave no note to show, the list area says so and offers to clear the filters. Dates are shown the way DatoCMS shows them to this user.

The page must look native to DatoCMS, in light and dark mode, and fill the page area.`,
    rules: ['usesTable', 'fixedFrameShell', 'mainLandmark', 'segmentedFilter', 'smartDates', 'emptyState'],
  },
];

// ---------------------------------------------------------------- rules

const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/** Rules that hold for every surface. Each returns an error message or null. */
const common = {
  'imports each component from its own entry, never from the package root': (files) =>
    /from\s+['"]datocms-react-ui['"]/.test(files.all) ? 'imports from the `datocms-react-ui` root' : null,
  'imports the stylesheet once': (files) => {
    const count = (files.all.match(/import\s+['"]datocms-react-ui\/styles\.css['"]/g) ?? []).length;
    return count === 1 ? null : `\`datocms-react-ui/styles.css\` is imported ${count} times`;
  },
  'wraps the surface in Canvas with ctx': (files) =>
    /from\s+['"]datocms-react-ui\/Canvas['"]/.test(files.all) && /<Canvas\b[^>]*\bctx=\{/.test(files.all) ? null : 'no `<Canvas ctx={ctx}>` from `datocms-react-ui/Canvas`',
  'uses no 2.x component': (files) => {
    const found = files.all.match(/\b(TextField|TextareaField|SwitchField|SelectField|ButtonLink|FieldGroup|ButtonGroup|SplitView|VerticalSplit)\b/);
    return found ? `uses the 2.x component \`${found[1]}\`` : null;
  },
  'writes no raw color': (files) => {
    const found = files.all.match(/#[0-9a-fA-F]{3,8}\b(?![\w-])|\brgba?\(|\bhsla?\(/);
    return found ? `hard-coded color \`${found[0]}\`` : null;
  },
  'uses no 2.x or primitive CSS variable': (files) => {
    const found = files.all.match(/var\(--(accent-color|primary-color|light-color|dark-color|border-color|light-bg-color|base-body-color|light-body-color|alert-color|warning-color|notice-color|font-size-s|font-size-xxs|spacing-xs|wash-[\w-]+|pigment-[\w-]+)\b/);
    return found ? `CSS variable \`--${found[1]}\` does not exist in the design tokens` : null;
  },
  'writes no raw heading or landmark tag': (files) => {
    const found = files.all.match(/<(h[1-6]|main|section|nav|aside)[\s>]/);
    return found ? `raw \`<${found[1]}>\` instead of the landmark and heading components` : null;
  },
  'names buttons with the label prop': (files) => {
    const found = files.all.replace(/=>/g, '\u21d2').match(/<Button\b[^>]*[^/]>(?!\s*<\/Button>)\s*[^<\s{]/);
    return found ? '`Button` is given children instead of `label`' : null;
  },
  'does not await host notices': (files) => (/await\s+ctx\.(notice|alert|customToast)\(/.test(files.all) ? 'awaits `ctx.notice` / `ctx.alert`' : null),
  'draws no toast or dialog of its own': (files) => (/window\.(alert|confirm)\(|\balert\(|\bconfirm\(/.test(files.all.replace(/ctx\.\w+\(/g, '')) ? 'uses a browser alert/confirm' : null),
};

const specific = {
  noSectionTitleFirst: ['does not open the config screen with a section title', (files) => {
    const firstField = files.main.search(/<FieldWrapper\b/);
    const firstTitle = files.main.search(/<Page\.SectionTitle\b|<Heading\b|<Page\.(Group|Section)\b[^>]*\btitle=/);
    return firstTitle !== -1 && (firstField === -1 || firstTitle < firstField) ? 'a section title or heading comes before the first field' : null;
  }],
  hasFieldWrapper: ['puts every input in a FieldWrapper', (files) => {
    const inputs = (files.main.match(/<(StringInput|PasswordInput|TextareaInput|NumberInput|SelectInput|SwitchInput|RadioGroupInput|DebouncedTextInput)\b/g) ?? []).length;
    const wrappers = (files.main.match(/<FieldWrapper\b/g) ?? []).length;
    return wrappers >= inputs && inputs >= 4 ? null : `${inputs} inputs but ${wrappers} FieldWrapper`;
  }],
  primarySave: ['has one primary Save that is not stretched', (files) => {
    const primaries = (files.main.match(/tone=["']primary["']/g) ?? []).length;
    if (primaries !== 1) return `${primaries} primary buttons`;
    return /<Button\b[^>]*\bexpand\b/.test(files.main) ? 'the Save button is stretched with `expand`' : null;
  }],
  noPageShell: ['adds no page shell inside a frame whose host already provides the column', (files) => {
    const found = files.main.match(/<(Page|Pane|Main)[\s>]/);
    return found ? `wraps the content in \`${found[1]}\`` : null;
  }],
  switchNamesItself: ['lets a switch name itself instead of repeating the label on its FieldWrapper', (files) =>
    /<FieldWrapper\b[^>]*\blabel=[^>]*>\s*<SwitchInput\b/.test(files.main.replace(/=>/g, '\u21d2')) ? 'a `FieldWrapper` with a label wraps a `SwitchInput`, so the label shows twice' : null],
  factsInInfoList: ['shows read-only facts with InfoList', (files) =>
    /from\s+['"]datocms-react-ui\/InfoList['"]/.test(files.main) ? null : 'no `InfoList` for the facts'],
  emptyState: ['uses the empty-state component for an empty area', (files) =>
    /from\s+['"]datocms-react-ui\/(BlankSlate|EmptySlot)['"]/.test(files.main) ? null : 'no `BlankSlate` or `EmptySlot`'],
  noStretchedButton: ['does not stretch a button to the full width', (files) =>
    /<Button\b[^>]*\bexpand\b/.test(files.main.replace(/=>/g, '\u21d2')) ? 'a `Button` uses `expand`' : null],
  mainLandmark: ['marks the page content with the Main landmark', (files) =>
    /from\s+['"]datocms-react-ui\/Main['"]/.test(files.main) ? null : 'no `Main` landmark'],
  segmentedFilter: ['offers a choice among a few visible options with SegmentedControl', (files) =>
    /from\s+['"]datocms-react-ui\/SegmentedControl['"]/.test(files.main) ? null : 'no `SegmentedControl` for All / Open / Resolved'],
  smartDates: ['shows dates in the user\'s format with SmartDate', (files) => {
    if (/toLocale(Date|Time)?String\(|Intl\.DateTimeFormat/.test(files.main)) return 'formats dates by hand';
    return /from\s+['"]datocms-react-ui\/(SmartDate|utils\/formatDate|Table\/cells\/TimeCell)['"]/.test(files.main) ? null : 'no `SmartDate` (or the table\'s time cell)';
  }],
  noOwnPanelTitle: ['does not redraw the panel title the host already draws', (files) =>
    /<SidebarPanel\b/.test(files.main) ? 'wraps the content in `SidebarPanel` although the host draws the panel' : null],
  usesTable: ['uses the Table component for the list', (files) =>
    /from\s+['"]datocms-react-ui\/Table['"]/.test(files.main) && !/<table[\s>]/.test(files.main) ? null : 'no `Table` from `datocms-react-ui/Table`'],
  fixedFrameShell: ['uses a full-height shell in the fixed page frame', (files) =>
    /from\s+['"]datocms-react-ui\/(Pane|ListDetail|SplitPane)['"]/.test(files.main) ? null : 'no `Pane` (or pattern shell) for a page frame'],
};

function readSources(workspace) {
  const dir = join(workspace, 'src');
  const names = readdirSync(dir).filter((name) => /\.(tsx?|css)$/.test(name) && name !== 'vite-env.d.ts');
  const sources = Object.fromEntries(names.map((name) => [name, stripComments(readFileSync(join(dir, name), 'utf8'))]));
  return sources;
}

export function checkWorkspace(testCase, workspace) {
  const result = { case: testCase.id, typecheck: 'ok', passed: false, failures: [], rules: 0 };
  if (!existsSync(join(workspace, 'src', testCase.file))) return { ...result, typecheck: 'missing', failures: [`src/${testCase.file} was not written`] };
  try {
    execFileSync(join(cache, 'node_modules/.bin/tsc'), ['--noEmit', '-p', workspace], { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    result.typecheck = 'failed';
    result.failures.push(`type errors:\n${String(error.stdout || error.message).split('\n').slice(0, 12).join('\n')}`);
  }
  const sources = readSources(workspace);
  const files = { all: Object.values(sources).join('\n'), main: sources[testCase.file] };
  const rules = [...Object.entries(common), ...testCase.rules.map((name) => specific[name])];
  result.rules = rules.length;
  for (const [name, rule] of rules) {
    const failure = rule(files);
    if (failure) result.failures.push(`${name}: ${failure}`);
  }
  result.passed = result.failures.length === 0;
  return result;
}

// ---------------------------------------------------------------- cli

function ensureCache() {
  if (existsSync(join(cache, 'node_modules/.bin/tsc'))) return;
  mkdirSync(cache, { recursive: true });
  cpSync(join(here, 'fixture/package.json'), join(cache, 'package.json'));
  execFileSync('npm', ['install', '--no-audit', '--no-fund', '--ignore-scripts'], { cwd: cache, stdio: 'inherit' });
}

function prompt({ testCase, arm, skillsRoot, workspace, out }) {
  const sources =
    arm === 'none'
      ? ['Work from your own knowledge and from the packages installed in the workspace (their type definitions are in `node_modules`). Do not use the Skill tool, the web or MCP tools.']
      : [
          `You have DatoCMS skills installed at ${resolve(skillsRoot, 'skills')}. Each skill is a folder with a SKILL.md and reference files. The list below is your skill listing: open a skill's SKILL.md when its description fits the task, then follow it to the reference files it points to.`,
          '',
          'Your only sources are your own knowledge, the files under that folder, and the packages installed in the workspace. Do not use the Skill tool, the web or MCP tools. Work as you normally would: read only what you need.',
          '',
          'Installed skills:',
          skillListing(skillsRoot),
        ];
  return [
    'You are a coding agent helping a developer who builds a DatoCMS plugin.',
    '',
    ...sources,
    '',
    `Workspace: ${workspace}`,
    '',
    'It is a DatoCMS plugin project (Vite, React, TypeScript) with its dependencies installed: see `package.json`. `src/main.tsx` holds the `connect()` call and `src/render.tsx` a `render(node)` helper. You cannot open the plugin inside DatoCMS from here.',
    '',
    'Task:',
    '',
    testCase.prompt,
    '',
    'You may edit `src/main.tsx` and add files under `src/`. Do not change `package.json` or install packages. The project must type-check: run `npx tsc --noEmit` in the workspace.',
    '',
    arm === 'none'
      ? 'When done, reply with only the word "done".'
      : `When done, write ${join(out, 'reads.json')}: a JSON array of the skill file paths you read, in order. Then reply with only the word "done".`,
    '',
  ].join('\n');
}

const option = (name) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined);

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const command = process.argv[2];
  const testCase = cases.find((entry) => entry.id === option('--case'));
  if (!testCase || !['prepare', 'check'].includes(command)) throw new Error(`Usage: run.mjs prepare|check --case <${cases.map((entry) => entry.id).join('|')}> --out <run dir>`);
  const out = resolve(option('--out') ?? '.');
  const workspace = join(out, 'workspace');
  ensureCache();
  if (command === 'prepare') {
    mkdirSync(join(workspace, 'src'), { recursive: true });
    cpSync(join(here, 'fixture'), workspace, { recursive: true });
    writeFileSync(join(workspace, 'src/main.tsx'), testCase.main);
    if (!existsSync(join(workspace, 'node_modules'))) symlinkSync(join(cache, 'node_modules'), join(workspace, 'node_modules'));
    const arm = option('--arm') ?? 'skills';
    writeFileSync(join(out, 'prompt.md'), prompt({ testCase, arm, skillsRoot: option('--skills-root') ?? repoRoot, workspace, out }));
    console.log(`${testCase.id} (${arm}) -> ${join(out, 'prompt.md')}`);
  } else {
    const result = checkWorkspace(testCase, workspace);
    writeFileSync(join(out, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
    console.log(`${testCase.id}: typecheck=${result.typecheck} passed=${result.passed} (${result.rules - result.failures.filter((failure) => !failure.startsWith('type errors')).length}/${result.rules} rules)`);
    for (const failure of result.failures) console.log(`  - ${failure.split('\n').slice(0, 6).join('\n    ')}`);
  }
}
