import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MESSAGE = "I didn't get a working migration (it looped twice through the same schema change) and the skill's advice didn't help me recover.";
const OPENERS = ['open', 'xdg-open', 'start', 'osascript'];
const REPLAY = 'control-open.sh';

// Actor HOME/XDG sandbox plus recording shims for every browser opener, all outside the workspace.
function sandbox(workspace) {
  const oracle = join(workspace, '..', 'oracle'), bin = join(oracle, 'bin');
  const env = { HOME: join(oracle, 'home'), XDG_CONFIG_HOME: join(oracle, 'config'), XDG_DATA_HOME: join(oracle, 'data'), XDG_CACHE_HOME: join(oracle, 'cache'), PATH: `${bin}:${process.env.PATH}`, BROWSER: join(bin, 'open') };
  return { bin, env, log: join(oracle, 'openers.jsonl') };
}
const shell = (command, workspace) => spawnSync('/bin/zsh', ['-lc', command], {
  cwd: workspace, encoding: 'utf8', timeout: 30000,
  env: { ...Object.fromEntries(['USER', 'LOGNAME', 'TMPDIR', 'LANG'].filter((k) => process.env[k]).map((k) => [k, process.env[k]])), ...sandbox(workspace).env },
});
// Old guidance: encodeURIComponent only, then open '<url>'. Fixed: also %-encode ' ( ).
const url = (subject, escape) => {
  const enc = (s) => escape ? encodeURIComponent(s).replace(/['()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`) : encodeURIComponent(s);
  return `https://www.datocms.com/support?topics=${enc('technical-support/ai-integration-issues')}&subject=${enc(subject)}&body=${enc(MESSAGE)}#form`;
};

export default [
  {
    id: 'feedback-apostrophe-url',
    guards: ['skills/datocms-feedback/SKILL.md'],
    prompt: `I've had a really frustrating time with the DatoCMS AI skills in my coding agent and want to send the DatoCMS team feedback through their website support form. I already wrote and reviewed the exact message, so use it word for word as the message text, with no edits and no extra review round:

${MESSAGE}

Please open the DatoCMS support form in my browser now, prefilled with that message (I'm on macOS). Nothing needs to be installed or created in this folder, and there is no DatoCMS project or API credentials available here.`,
    budget: { timeoutMs: 300000, maxCommands: 30 },
    setup(workspace) {
      const { bin, env, log } = sandbox(workspace);
      for (const dir of [bin, env.HOME, env.XDG_CONFIG_HOME, env.XDG_DATA_HOME, env.XDG_CACHE_HOME]) mkdirSync(dir, { recursive: true });
      for (const tool of OPENERS) writeFileSync(join(bin, tool), `#!${process.execPath}\nimport('node:fs').then((fs) => fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify({ tool: ${JSON.stringify(tool)}, argv: process.argv.slice(2) }) + '\\n'));\n`, { mode: 0o755 });
      // Login shells run macOS path_helper, which moves /usr/bin (the real `open`) ahead of inherited PATH; re-prepend the shims.
      for (const rc of ['.zprofile', '.bash_profile']) writeFileSync(join(env.HOME, rc), `export PATH=${JSON.stringify(bin)}:"$PATH"\n`);
      const which = shell(`command -v ${OPENERS.join(' ')}`, workspace);
      assert.deepEqual(which.stdout.trim().split('\n'), OPENERS.map((tool) => join(bin, tool)), 'Opener shims must win in the actor login shell');
      return { environment: env };
    },
    check(workspace, { session }) {
      let commands = session.commands;
      if (!session.transcriptPath) {
        // Controls have no actor session: run the reference command through the same login shell and shims.
        const command = readFileSync(join(workspace, REPLAY), 'utf8'), run = shell(command, workspace);
        commands = [{ command, exit_code: run.status, aggregated_output: run.stdout + run.stderr }];
      }
      // A shell-mangled opener command counts even if a later retry succeeded; unrelated helper commands do not.
      const broken = commands.filter((c) => /(^|[\s;&|('"`])(open|xdg-open|start|osascript)\s/.test(c.command) && /parse error|syntax error|unmatched ['"]|unexpected EOF|no matches found/i.test(c.aggregated_output ?? ''));
      assert.deepEqual(broken.map((c) => c.command), [], 'Shell rejected an opener command');
      const { log } = sandbox(workspace);
      const calls = existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
      assert.equal(calls.length, 1, `Expected exactly one browser open, got ${JSON.stringify(calls)}`);
      assert.equal(calls[0].tool, 'open', 'macOS opener expected');
      const urls = calls[0].argv.filter((a) => /^https?:\/\//.test(a));
      assert.equal(urls.length, 1, `Expected one URL argument: ${JSON.stringify(calls[0].argv)}`);
      const opened = new URL(urls[0]);
      assert.ok(['www.datocms.com', 'datocms.com'].includes(opened.hostname) && opened.pathname.replace(/\/$/, '') === '/support', `Not the DatoCMS support form: ${urls[0]}`);
      const body = opened.searchParams.get('body');
      assert.ok(body?.includes(MESSAGE), `Form body lost the approved message: ${JSON.stringify(body)} from ${urls[0]}`);
      return { opener: calls[0], topics: opened.searchParams.get('topics'), subject: opened.searchParams.get('subject'), body };
    },
    controls: {
      pass: { files: { [REPLAY]: `open '${url("Skill's migration loop", true)}'\n` } },
      fail: [
        { name: 'encodeURIComponent-unbalanced-quote', files: { [REPLAY]: `open '${url('Frustrating skills experience', false)}'\n` } },
        { name: 'encodeURIComponent-body-dropped', files: { [REPLAY]: `open '${url("Skill's migration loop", false)}'\n` } },
      ],
    },
  },
];
