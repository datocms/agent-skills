import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  realpathSync,
  symlinkSync,
  chmodSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { nativeSession, isUsageLimitError, oracleAccess, skillReads, REPO_ROOT } from "../e2e/lib/nativeSession.ts";

test("account usage exhaustion stops the actor without treating application rate limits as account limits", async () => {
  assert.equal(isUsageLimitError({ type: "item.completed", item: { type: "command_execution", aggregated_output: "usage_limit_reached" } }), false);
  assert.equal(isUsageLimitError({ type: "error", message: "HTTP 429: API rate limit" }), false);
  await fixture(async ({ options, writeBinary }) => {
    writeBinary(`console.log(JSON.stringify({type:'turn.failed',error:{message:'You have exhausted your weekly usage limit',code:'usage_limit_reached'}}));setInterval(()=>{},1000);`);
    const result = await nativeSession(options);
    assert.equal(result.usageLimitReached, true);
    assert.equal(result.completed, false);
    assert.equal(result.timedOut, false);
    assert.equal(result.errors.length, 1);
  });
});

async function fixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "native-e2e-unit-"));
  mkdirSync(join(root, "skills/example"), { recursive: true });
  writeFileSync(
    join(root, "skills/example/SKILL.md"),
    "---\nname: example\ndescription: Example fixture\n---\n",
  );
  const previous = process.env.CODEX_BIN;
  const binary = join(root, "native");
  process.env.CODEX_BIN = binary;
  const writeBinary = (source) =>
    writeFileSync(
      binary,
      `#!${process.execPath}\nif(process.argv.includes('--version')){console.log('fixture-runtime');process.exit(0);}\n${source}`,
      { mode: 0o700 },
    );
  const options = {
    repoRoot: root,
    workspace: join(root, "workspace"),
    output: join(root, "evidence"),
    prompt: "Do the fixture task.",
    timeoutMs: 5000,
  };
  try {
    await callback({ root, options, writeBinary });
  } finally {
    if (previous === undefined) delete process.env.CODEX_BIN;
    else process.env.CODEX_BIN = previous;
    rmSync(root, { recursive: true, force: true });
  }
}
test("native runner pins model and effort, redacts credentials, and removes authentication links", async () =>
  fixture(async ({ root, options, writeBinary }) => {
    writeBinary(
      `require('node:fs').writeFileSync(process.env.ARGUMENTS_PATH,JSON.stringify(process.argv));console.log(JSON.stringify({type:'item.completed',item:{id:'c1',type:'command_execution',command:'echo synthetic-secret',exit_code:0}}));console.error('synthetic-secret');console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:2}}));`,
    );
    const result = await nativeSession({
      ...options,
      secrets: ["synthetic-secret"],
      environment: { ARGUMENTS_PATH: join(root, "arguments.json") },
    });
    assert.equal(result.credentialLeak, true);
    assert.equal(result.completed, true);
    assert.equal(result.commands.length, 1);
    for (const path of [
      "native.jsonl",
      "stderr.log",
      "session.json",
      "provenance.json",
    ])
      assert.equal(
        readFileSync(join(options.output, path), "utf8").includes(
          "synthetic-secret",
        ),
        false,
        path,
      );
    const args = JSON.parse(readFileSync(join(root, "arguments.json"), "utf8"));
    assert.ok(args.includes('model="gpt-6-luna"'));
    assert.ok(args.includes('model_reasoning_effort="medium"'));
    assert.ok(args.includes('features.shell_snapshot=false'));
    assert.ok(args.includes('features.shell_snapshot_v2=false'));
    // Agents look for AGENTS.md above the workspace unless told where it is, and that trips the oracle-access check.
    assert.match(args.find((arg) => arg.startsWith('developer_instructions=')) ?? '', /AGENTS\.md[^"]*never search parent directories/);
    assert.equal(args.some(arg => arg.includes('synthetic-secret')), false);
    const provenance = JSON.parse(readFileSync(join(options.output, "provenance.json"), "utf8"));
    assert.ok(provenance.harnessHashes["e2e/lib/nativeSession.ts"]);
    assert.ok(provenance.skillHashes["skills/example/SKILL.md"]);
    assert.equal(provenance.runtimeFeatures["features.shell_snapshot"], false);
    assert.equal(existsSync(join(options.output, "native-home")), false);
    await assert.rejects(
      nativeSession(options),
      /Refusing to replace evidence/,
    );
  }));
test("an explicit comparison model is passed to the runtime and recorded without changing effort", async () =>
  fixture(async ({ root, options, writeBinary }) => {
    writeBinary(`require('node:fs').writeFileSync(process.env.ARGUMENTS_PATH,JSON.stringify(process.argv));console.log(JSON.stringify({type:'turn.completed'}));`);
    const result = await nativeSession({ ...options, model: 'gpt-6-sol', environment: { ARGUMENTS_PATH: join(root, 'arguments.json') } });
    const args = JSON.parse(readFileSync(join(root, 'arguments.json'), 'utf8'));
    assert.ok(args.includes('model="gpt-6-sol"'));
    assert.ok(args.includes('model_reasoning_effort="medium"'));
    assert.equal(result.model, 'gpt-6-sol');
    assert.equal(result.reasoningEffort, 'medium');
    const provenance = JSON.parse(readFileSync(join(options.output, 'provenance.json'), 'utf8'));
    assert.equal(provenance.model, result.model);
    assert.equal(provenance.reasoningEffort, result.reasoningEffort);
  }));
test("a native tool initialization error remains a failure despite normal completion", async () =>
  fixture(async ({ options, writeBinary }) => {
    writeBinary(
      `console.log(JSON.stringify({type:'item.completed',item:{type:'error',message:'command runner unavailable'}}));console.log(JSON.stringify({type:'turn.completed'}));`,
    );
    const result = await nativeSession(options);
    assert.equal(result.exitCode, 0);
    assert.equal(result.errors.length, 1);
    assert.equal(result.completed, true);
  }));
test("script budget counts distinct invocations and stops further execution", async () =>
  fixture(async ({ options, writeBinary }) => {
    writeBinary(
      `for(const id of ['one','one','two'])console.log(JSON.stringify({type:'item.started',item:{id,type:'command_execution',command:'datocms cma:script'}}));setInterval(()=>{},1000);`,
    );
    const result = await nativeSession({ ...options, maxScriptAttempts: 1 });
    assert.equal(result.capped, true);
    assert.equal(result.commands.length, 2);
    assert.equal(result.timedOut, false);
  }));
test("timeout terminates a stalled native session and removes its private home", async () =>
  fixture(async ({ options, writeBinary }) => {
    writeBinary("setInterval(()=>{},1000);");
    const result = await nativeSession({ ...options, timeoutMs: 150 });
    assert.equal(result.timedOut, true);
    assert.equal(result.completed, false);
    assert.equal(existsSync(join(options.output, "native-home")), false);
  }));
test("credentials cannot be inserted into agent prompts", async () =>
  fixture(async ({ options, writeBinary }) => {
    writeBinary("process.exit(0)");
    await assert.rejects(
      nativeSession({
        ...options,
        prompt: "Use synthetic-secret",
        secrets: ["synthetic-secret"],
      }),
      /Credentials must not appear/,
    );
  }));

test("hosted MCP configuration is explicit and completed calls remain observable", async () =>
  fixture(async ({ root, options, writeBinary }) => {
    writeBinary(`require('node:fs').writeFileSync(process.env.ARGUMENTS_PATH,JSON.stringify(process.argv));
      for(const type of ['item.started','item.completed'])console.log(JSON.stringify({type,item:{id:'m1',type:'mcp_tool_call',server:'FixtureHost',tool:'whoami',status:'completed',result:{content:[]}}}));
      console.log(JSON.stringify({type:'turn.completed'}));`);
    const result = await nativeSession({ ...options, hostedMcp: { name: 'FixtureHost', url: 'https://mcp.example.test' }, maxMcpCalls: 1, environment: { ARGUMENTS_PATH: join(root, 'arguments.json') } });
    const args = JSON.parse(readFileSync(join(root, 'arguments.json'), 'utf8'));
    assert.ok(args.some(arg => arg.startsWith('mcp_servers.FixtureHost=') && arg.includes('https://mcp.example.test')));
    assert.equal(result.mcpCalls.length, 1);
    assert.equal(result.mcpCalls[0].tool, 'whoami');
    assert.equal(result.capped, false);
  }));

test("MCP call budget counts distinct calls and stops excessive execution", async () =>
  fixture(async ({ options, writeBinary }) => {
    writeBinary(`for(const id of ['one','one','two'])console.log(JSON.stringify({type:'item.started',item:{id,type:'mcp_tool_call',server:'FixtureHost',tool:'whoami'}}));setInterval(()=>{},1000);`);
    const result = await nativeSession({ ...options, maxMcpCalls: 1 });
    assert.equal(result.capped, true);
    assert.equal(result.timedOut, false);
  }));
test("follow-up turns resume the persisted thread and run a hook after every turn", async () =>
  fixture(async ({ root, options, writeBinary }) => {
    // Records each invocation; the first turn announces a thread, later turns echo their stdin prompt.
    writeBinary(
      `const fs=require('node:fs');const args=process.argv.slice(2);let input='';process.stdin.on('data',d=>input+=d).on('end',()=>{fs.appendFileSync(process.env.CALLS_PATH,JSON.stringify({args,input})+'\\n');if(!args.includes('resume'))console.log(JSON.stringify({type:'thread.started',thread_id:'thread-7'}));console.log(JSON.stringify({type:'item.completed',item:{id:'c1',type:'command_execution',command:'ls',exit_code:0}}));console.log(JSON.stringify({type:'item.completed',item:{id:'m1',type:'agent_message',text:'reply to '+input.trim()}}));console.log(JSON.stringify({type:'turn.completed'}));});`,
    );
    const hooks = [];
    const result = await nativeSession({
      ...options,
      followUps: ["Go ahead."],
      onTurnComplete: (turn) => hooks.push(turn),
      environment: { CALLS_PATH: join(root, "calls.jsonl") },
    });
    const calls = readFileSync(join(root, "calls.jsonl"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
    assert.equal(calls.length, 2);
    assert.equal(calls[0].args.includes("--ephemeral"), false, "a resumable session must persist");
    assert.deepEqual(calls[1].args.slice(0, 2), ["exec", "resume"]);
    assert.equal(calls[1].args.at(-2), "thread-7");
    assert.ok(calls[1].args.includes('model="gpt-6-luna"'));
    assert.ok(calls[1].args.includes('sandbox_mode="danger-full-access"'));
    assert.equal(calls[1].input, "Go ahead.");
    assert.deepEqual(hooks, [0, 1]);
    assert.deepEqual(result.turns.map((t) => t.finalText), ["reply to Do the fixture task.", "reply to Go ahead."]);
    assert.equal(result.finalText, "reply to Go ahead.");
    // Item ids restart per turn; commands from both turns are kept and attributed.
    assert.deepEqual(result.commands.map((c) => c.turn), [0, 1]);
    assert.equal(result.completed, true);
    assert.equal(result.threadId, "thread-7");
    assert.equal(existsSync(join(options.output, "native-home")), false);
  }));
test("single-turn sessions stay ephemeral and stop before follow-ups when a turn fails", async () =>
  fixture(async ({ root, options, writeBinary }) => {
    writeBinary(
      `require('node:fs').appendFileSync(process.env.CALLS_PATH,JSON.stringify(process.argv.slice(2))+'\\n');console.log(JSON.stringify({type:'thread.started',thread_id:'t'}));console.log(JSON.stringify({type:'turn.failed',error:{message:'boom'}}));`,
    );
    const single = await nativeSession({ ...options, environment: { CALLS_PATH: join(root, "single.jsonl") } });
    assert.ok(JSON.parse(readFileSync(join(root, "single.jsonl"), "utf8")).includes("--ephemeral"));
    assert.equal(single.completed, false);
    const multi = await nativeSession({ ...options, output: join(root, "evidence-2"), followUps: ["Go ahead."], environment: { CALLS_PATH: join(root, "multi.jsonl") } });
    assert.equal(readFileSync(join(root, "multi.jsonl"), "utf8").trim().split("\n").length, 1, "a failed turn must not be resumed");
    assert.equal(multi.completed, false);
    assert.equal(multi.turns.length, 1);
  }));

test("actors get a fresh home, never the host's, and cannot open the operator's browser", async () => {
  // With the host HOME an actor's `datocms whoami` reached the operator's real account and `datocms login`
  // opened their browser.
  await fixture(async ({ root, options, writeBinary }) => {
    writeBinary(`const {execFileSync}=require('node:child_process');require('node:fs').writeFileSync(process.env.PROBE_PATH,JSON.stringify({home:process.env.HOME,codexHome:process.env.CODEX_HOME,config:process.env.XDG_CONFIG_HOME,open:execFileSync('/bin/sh',['-lc','command -v open'],{encoding:'utf8'}).trim()}));console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:1}}));`);
    const probe = join(root, "probe.json");
    await nativeSession({ ...options, environment: { PROBE_PATH: probe } });
    const seen = JSON.parse(readFileSync(probe, "utf8"));
    assert.notEqual(seen.home, process.env.HOME);
    for (const home of [seen.home, seen.codexHome]) {
      assert.equal(home.startsWith(options.output), false, "private homes must not reveal evidence paths");
      assert.equal(home.startsWith(REPO_ROOT), false, "private homes must not live inside the checkout");
      assert.equal(existsSync(home), false, "private homes are removed after the session");
    }
    assert.ok(seen.config.startsWith(seen.home));
    assert.equal(seen.open, join(seen.home, ".stub-bin/open"), "a login shell must resolve the stub open first");
    assert.equal(existsSync(seen.home), false, "the actor home is removed after the session");
  });
  await fixture(async ({ root, options, writeBinary }) => {
    writeBinary(`require('node:fs').writeFileSync(process.env.PROBE_PATH,process.env.HOME);console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:1}}));`);
    const home = join(root, "case-home");
    await nativeSession({ ...options, environment: { PROBE_PATH: join(root, "probe"), HOME: home } });
    assert.equal(readFileSync(join(root, "probe"), "utf8"), home, "a caller-provided home is kept");
  });
});

test("a session climbing out of its own native home cannot reach evidence", async () =>
  fixture(async ({ options, writeBinary }) => {
    writeBinary(`const command='cat '+process.env.CODEX_HOME+'/skills/.system/../..';console.log(JSON.stringify({type:'item.completed',item:{id:'c1',type:'command_execution',command,exit_code:1}}));console.log(JSON.stringify({type:'turn.completed'}));`);
    const result = await nativeSession(options);
    assert.deepEqual(result.oracleAccess, []);
  }));

async function waitForExit(pid) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { process.kill(pid, 0); }
    catch (error) { if (error.code === "ESRCH") return; throw error; }
    await delay(20);
  }
  assert.fail(`fixture subprocess ${pid} is still alive`);
}

for (const capped of [true, false]) {
  test(`${capped ? "a capped" : "a normally completed"} session kills detached command subprocesses before grading and cleans up`, async () =>
    fixture(async ({ root, options, writeBinary }) => {
      const probe = join(root, "descendant.json");
      const writer = `const fs=require('node:fs');const path=require('node:path');const home=process.env.HOME;fs.writeFileSync(path.join(home,'pid'),String(process.pid));fs.writeFileSync(process.env.PROBE_PATH,JSON.stringify({pid:process.pid,home,codexHome:process.env.CODEX_HOME}));setInterval(()=>{fs.mkdirSync(path.join(home,'.npm'),{recursive:true});fs.appendFileSync(path.join(home,'.npm','active'),'x');},20);`;
      writeBinary(`const fs=require('node:fs');const child=require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(writer)}],{detached:true,stdio:'ignore'});child.unref();const ready=setInterval(()=>{if(!fs.existsSync(process.env.PROBE_PATH))return;clearInterval(ready);console.log(JSON.stringify({type:'item.started',item:{id:'one',type:'command_execution',command:'fixture writer'}}));setTimeout(()=>{${capped ? "console.log(JSON.stringify({type:'item.started',item:{id:'two',type:'command_execution',command:'over budget'}}));setInterval(()=>{},1000);" : "console.log(JSON.stringify({type:'turn.completed'}));process.exit(0);"}},600);},10);`);
      let seen;
      try {
        const result = await nativeSession({
          ...options,
          maxCommands: 1,
          environment: { PROBE_PATH: probe },
          onTurnComplete: async () => {
            seen = JSON.parse(readFileSync(probe, "utf8"));
            await waitForExit(seen.pid);
          },
        });
        seen ??= JSON.parse(readFileSync(probe, "utf8"));
        assert.equal(result.capped, capped);
        assert.equal(result.completed, !capped);
        assert.equal(result.timedOut, false);
        assert.deepEqual(result.errors, []);
        assert.throws(() => process.kill(seen.pid, 0), { code: "ESRCH" });
        assert.equal(existsSync(seen.home), false);
        assert.equal(existsSync(seen.codexHome), false);
        assert.equal(existsSync(dirname(seen.home)), false, "the scratch parent is removed");
      } finally {
        seen ??= existsSync(probe) ? JSON.parse(readFileSync(probe, "utf8")) : undefined;
        if (seen) {
          try { process.kill(seen.pid, "SIGKILL"); } catch (error) { if (error.code !== "ESRCH") throw error; }
          await waitForExit(seen.pid);
          // Also removes files a pre-fix writer recreated after nativeSession's cleanup.
          rmSync(seen.home, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
        }
      }
    }));
}

test("private-home cleanup failure is non-fatal and still removes the authentication link", { skip: process.getuid?.() === 0 ? "chmod restrictions do not apply to root" : false }, async () =>
  fixture(async ({ root, options, writeBinary }) => {
    const probe = join(root, "cleanup.json");
    writeBinary(`const fs=require('node:fs');const path=require('node:path');const locked=path.join(process.env.HOME,'locked');fs.mkdirSync(locked);fs.writeFileSync(path.join(locked,'file'),'fixture');fs.writeFileSync(process.env.PROBE_PATH,JSON.stringify({locked,home:process.env.HOME,codexHome:process.env.CODEX_HOME}));fs.chmodSync(locked,0);console.log(JSON.stringify({type:'turn.completed'}));`);
    try {
      const result = await nativeSession({ ...options, environment: { PROBE_PATH: probe } });
      const seen = JSON.parse(readFileSync(probe, "utf8"));
      assert.equal(result.completed, true);
      assert.match(JSON.stringify(result.errors), /cleanup/);
      assert.equal(existsSync(join(seen.codexHome, "auth.json")), false);
      assert.match(readFileSync(join(options.output, "session.json"), "utf8"), /cleanup/);
    } finally {
      if (existsSync(probe)) {
        const seen = JSON.parse(readFileSync(probe, "utf8"));
        if (existsSync(seen.locked)) chmodSync(seen.locked, 0o700);
        // Only the session-owned scratch parent may live outside this fixture root.
        if (!seen.home.startsWith(root)) rmSync(dirname(seen.home), { recursive: true, force: true });
      }
    }
  }));

test("sessions record which skill files the actor read, and none when it never consulted a skill", async () => {
  assert.deepEqual(skillReads([
    { command: "cat .agents/skills/datocms-cma/SKILL.md && sed -n 1,80p .agents/skills/datocms-cma/references/records.md" },
    { command: "rg -n nested .agents/skills/datocms-cma/SKILL.md" },
    { command: "ls .agents/skills" },
  ]), ["datocms-cma/SKILL.md", "datocms-cma/references/records.md"]);
  assert.deepEqual(skillReads([{ command: "rg --files" }, { command: "cat node_modules/@datocms/cma-client/package.json" }]), []);
  await fixture(async ({ options, writeBinary }) => {
    writeBinary(`console.log(JSON.stringify({type:'item.completed',item:{id:'c1',type:'command_execution',command:'rg --files',exit_code:0}}));console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:2}}));`);
    const result = await nativeSession(options);
    assert.deepEqual(result.skillReads, []);
    assert.deepEqual(JSON.parse(readFileSync(join(options.output, "session.json"), "utf8")).skillReads, []);
  });
});

test("oracle access flags evaluation state outside the workspace but not workspace or package paths", () => {
  const root = mkdtempSync(join(tmpdir(), "oracle-access-"));
  try {
    const output = join(root, "case-1"), real = join(output, "workspace-real"), workspace = join(output, "workspace");
    mkdirSync(real, { recursive: true });
    symlinkSync(real, workspace);
    writeFileSync(join(output, "fixture.json"), "{}");
    // A home containing the checkout or evidence must not hide them.
    const paths = { workspace, output, repoRoot: REPO_ROOT, homes: [join(output, "oracle/home"), root, REPO_ROOT] };
    const flagged = [
      "cat ../oracle/expected.json",
      "cd src && ls ../../../other-case-1/oracle",
      "cat ../session.json ../native.jsonl",
      "cat ../fixture.json",
      "cd .. && cat oracle/expected.json",
      "find .. -name AGENTS.md",
      `sed -n 1,40p ${REPO_ROOT}/dev/e2e/regressions/cases/cda.mjs`,
      `cat ${REPO_ROOT}/local/regressions/run-01/cda-1/result.json`,
      `cat ${join(output, "oracle/state.json")}`,
      `cat ${workspace}/../oracle/state.json`,
      `cat ${join(output, "oracle/home")}/../expected.json`,
      "rg expected dev/evals/coexistence",
      "ls node_modules/../e2e",
      `cat ${REPO_ROOT}/dev/node_modules/../e2e/lib/nativeSession.ts`,
    ];
    const allowed = [
      `cd ${workspace} && npm run build`,
      `cat ${realpathSync(real)}/src/page.tsx`,
      "cat .agents/skills/datocms-cli/SKILL.md && cd src && cat ../package.json",
      "cd .agents/skills/datocms-cma && cat ../datocms-cli/references/cma-script.md",
      "cd src/app && cat ../lib/result.json && git diff HEAD..main",
      `node -e "console.log(require('path').resolve(__dirname, '..'))"`,
      "sed -n 1,40p node_modules/@datocms/cma-client/dist/types/index.d.ts",
      `cat ${REPO_ROOT}/dev/node_modules/datocms/package.json`,
      `ls ${tmpdir()} /tmp`,
      `cat ${join(output, "oracle/home/.npm/_logs/debug-0.log")}`,
    ];
    const commands = [...flagged, ...allowed].map((command) => ({ command, turn: 1 }));
    assert.deepEqual(oracleAccess(commands, paths), flagged.map((command) => ({ turn: 1, command })));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("native sessions record commands and edits that touch oracle state or evaluation code", async () =>
  fixture(async ({ options, writeBinary }) => {
    const home = join(options.output, "oracle/home");
    const commands = ["cat ../oracle/expected.json", `cat ${REPO_ROOT}/dev/e2e/lib/nativeSession.ts`, `cat ${options.workspace}/src/index.ts`, `cat ${home}/.npm/_logs/debug-0.log`];
    const edit = { id: "e1", type: "file_change", changes: [{ path: join(options.output, "oracle/expected.json"), kind: "update" }, { path: join(options.workspace, "src/index.ts"), kind: "add" }] };
    writeBinary(
      `for(const [i,command] of ${JSON.stringify(commands)}.entries())console.log(JSON.stringify({type:'item.completed',item:{id:'c'+i,type:'command_execution',command,exit_code:0}}));for(const type of ['item.started','item.completed'])console.log(JSON.stringify({type,item:${JSON.stringify(edit)}}));console.log(JSON.stringify({type:'turn.completed'}));`,
    );
    const result = await nativeSession({ ...options, environment: { HOME: home } });
    const flagged = [...commands.slice(0, 2), `update ${edit.changes[0].path}`];
    assert.deepEqual(result.oracleAccess, flagged.map((command) => ({ turn: 0, command })));
    assert.deepEqual(JSON.parse(readFileSync(join(options.output, "session.json"), "utf8")).oracleAccess, result.oracleAccess);
  }));
