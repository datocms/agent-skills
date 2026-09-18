import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { parseArgs } from "node:util";
import { nativeSession } from "../lib/nativeSession.ts";
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
await Promise.all(
  Array.from({ length: jobs }, async () => {
    while (queue.length) {
      const { c, repetition } = queue.shift();
      const directory = join(output, `${c.id}-${repetition}`);
      mkdirSync(join(directory, "workspace"), { recursive: true });
      for (const [path, content] of Object.entries(c.files ?? {}))
        writeFileSync(join(directory, "workspace", path), content);
      const session = await nativeSession({
        repoRoot: root,
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
        completed:
          session.completed &&
          session.exitCode === 0 &&
          !session.errors.length &&
          !session.timedOut,
        finalText: session.finalText,
        commands: session.commands.map((x) => ({
          command: x.command,
          exitCode: x.exit_code,
        })),
        rubric: c.rubric,
        review: "pending",
      };
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
if (results.some((x) => !x.completed)) process.exitCode = 1;
