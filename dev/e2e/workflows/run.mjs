import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { parseArgs } from "node:util";
import { nativeSession, REPO_ROOT } from "../lib/nativeSession.ts";
import { cases } from "./cases.mjs";
const root = resolve(import.meta.dirname, "../..");
const { values } = parseArgs({
  options: {
    cases: { type: "string" },
    output: { type: "string" },
    repetitions: { type: "string", default: "1" },
    jobs: { type: "string", default: "2" },
  },
});
const jobs = Number(values.jobs);
if (!Number.isInteger(jobs) || jobs < 1)
  throw Error("jobs must be a positive integer");
const repetitions = Number(values.repetitions);
if (!Number.isInteger(repetitions) || repetitions < 1)
  throw Error("repetitions must be a positive integer");
const output = resolve(
  values.output ??
    join(
      root,
      "local/workflows",
      new Date().toISOString().replace(/[:.]/g, "-"),
    ),
);
if (existsSync(join(output, "results.json")))
  throw Error("Preserve previous results: choose new output");
mkdirSync(output, { recursive: true });
const selected = values.cases
  ? cases.filter((c) => values.cases.split(",").includes(c.id))
  : cases;
if (
  !selected.length ||
  (values.cases &&
    values.cases.split(",").some((id) => !cases.some((c) => c.id === id)))
)
  throw Error("Unknown or empty case selection");
const queue = [];
for (let repetition = 1; repetition <= repetitions; repetition++)
  for (const c of selected) queue.push({ c, repetition });
const results = [];
let usageLimitReached = false;
await Promise.all(
  Array.from({ length: jobs }, async () => {
    while (queue.length && !usageLimitReached) {
      const { c, repetition } = queue.shift();
      const directory = join(output, `${c.id}-${repetition}`);
      mkdirSync(join(directory, "workspace"), { recursive: true });
      for (const [path, content] of Object.entries(c.files ?? {}))
        writeFileSync(join(directory, "workspace", path), content);
      const session = await nativeSession({
        repoRoot: REPO_ROOT,
        workspace: join(directory, "workspace"),
        output: directory,
        prompt: c.prompt,
        timeoutMs: 300000,
      });
      const result = {
        case: c.id,
        repetition,
        model: session.model,
        reasoningEffort: session.reasoningEffort,
        usageLimitReached: session.usageLimitReached,
        completed:
          session.completed &&
          session.exitCode === 0 &&
          !session.errors.length &&
          !session.timedOut &&
          !session.oracleAccess.length,
        oracleAccess: session.oracleAccess.map((a) => a.command),
        finalText: session.finalText,
        commands: session.commands.map((x) => ({
          command: x.command,
          exitCode: x.exit_code,
        })),
        rubric: c.rubric,
        review: "pending",
      };
      if (session.usageLimitReached) {
        usageLimitReached = true;
        writeFileSync(
          join(output, "usage-checkpoint.json"),
          JSON.stringify(
            {
              status: "paused-usage-limit",
              interrupted: { case: c.id, repetition },
              remaining: queue.map(({ c, repetition }) => ({
                case: c.id,
                repetition,
              })),
            },
            null,
            2,
          ),
        );
      }
      results.push(result);
      writeFileSync(
        join(directory, "result.json"),
        JSON.stringify(result, null, 2),
      );
      writeFileSync(
        join(output, "results.json"),
        JSON.stringify(results, null, 2),
      );
      console.log(
        `${result.completed ? "REVIEW" : "ERROR"} ${c.id}/${repetition}`,
      );
    }
  }),
);
// Advisory results require evidence-backed review; completion is never a quality pass.
if (usageLimitReached) process.exitCode = 2;
else if (results.some((x) => !x.completed)) process.exitCode = 1;
