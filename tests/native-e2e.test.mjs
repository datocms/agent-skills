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
import { nativeSession } from "../e2e/lib/nativeSession.ts";

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
    assert.ok(args.includes('model="gpt-5.6-luna"'));
    assert.ok(args.includes('model_reasoning_effort="medium"'));
    assert.equal(existsSync(join(options.output, "native-home")), false);
    await assert.rejects(
      nativeSession(options),
      /Refusing to replace evidence/,
    );
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
