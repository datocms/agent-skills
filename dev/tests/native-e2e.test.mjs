import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { nativeSession, isUsageLimitError } from "../e2e/lib/nativeSession.ts";

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
