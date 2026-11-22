import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { gradeRun } from "./gradeRun.js";
import {
	type CreateTestProjectOptions,
	type TestProject,
	createTestProject,
	destroyTestProject,
} from "./createTestProject.js";
import {
	type RunAgentOptions,
	type RunAgentResult,
	runAgent,
} from "./runAgent.js";

export type E2ETestCase<Context = undefined> = {
	name: string;
	fixtures?: CreateTestProjectOptions<Context>["fixtures"];
	/**
	 * Task-specific instructions. The harness prepends a fixed preamble
	 * that introduces the authenticated project and isolated environment,
	 * so the task should jump straight into what
	 * the agent has to accomplish.
	 */
	task: (project: TestProject<Context>) => string;
	files?: (
		project: TestProject<Context>,
	) => Record<string, string | Uint8Array>;
	maxAttempts: number;
	assert: (project: TestProject<Context>) => Promise<void>;
	/**
	 * A reference solution: plain CMA client calls that do what the task asks.
	 * `E2E_CONTROL=reference` runs it in place of an agent and expects `assert`
	 * to pass; `E2E_CONTROL=noop` runs nothing and expects `assert` to fail.
	 */
	solution?: (project: TestProject<Context>) => Promise<void>;
	/**
	 * The wrong solutions the case is built to catch, by name. `E2E_CONTROL=traps`
	 * runs each one on a fresh fixture and expects `assert` to fail.
	 */
	traps?: Record<string, (project: TestProject<Context>) => Promise<void>>;
	model?: string;
	timeoutMs?: number;
};

/** Model-free checks of a case's own oracle, selected with `E2E_CONTROL`. */
type ControlMode = "reference" | "noop" | "traps";

function controlMode(): ControlMode | undefined {
	const raw = process.env.E2E_CONTROL;
	if (!raw) return undefined;
	if (raw === "reference" || raw === "noop" || raw === "traps") return raw;
	throw new Error(`Unknown E2E_CONTROL="${raw}" (expected "reference", "noop" or "traps")`);
}

export type E2ETestOutcome = {
	name: string;
	passed: boolean;
	attempts: number;
	reason: string;
	transcriptPath: string;
	toolCallNames: string[];
	finalText: string | undefined;
	assertionError?: Error;
	stateVerdict?: "passed" | `failed: ${string}`;
};

function buildPrompt<Context>(
	project: TestProject<Context>,
	task: string,
): string {
	return (
		`You have access to a DatoCMS project (site ID "${project.siteId}"). ` +
		`The datocms CLI is installed and authenticated. Use environment "${project.environment ?? "main"}"; no auth setup is needed.\n\n` +
		`Task: ${task}`
	);
}

const firstLine = (text: string) => (text.split("\n")[0] ?? "").slice(0, 160);

async function rejection<Context>(
	testCase: E2ETestCase<Context>,
	project: TestProject<Context>,
): Promise<string | undefined> {
	try {
		await testCase.assert(project);
		return undefined;
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
}

/**
 * Runs a control instead of an agent. The outcome passes when the control
 * holds: the reference solution satisfies the check, or the check rejects the
 * untouched fixture or a known wrong solution.
 */
async function runControl<Context>(
	testCase: E2ETestCase<Context>,
	mode: ControlMode,
): Promise<E2ETestOutcome> {
	const outcome = (passed: boolean, reason: string): E2ETestOutcome => ({
		name: testCase.name,
		passed,
		attempts: 0,
		reason: `[control: ${mode}] ${reason}`,
		transcriptPath: "",
		toolCallNames: [],
		finalText: undefined,
	});
	const steps: [string, ((project: TestProject<Context>) => Promise<void>) | undefined][] =
		mode === "reference"
			? [["reference solution", testCase.solution]]
			: mode === "noop"
				? [["untouched fixture", async () => {}]]
				: Object.entries(testCase.traps ?? {});
	if (mode === "reference" && !testCase.solution) return outcome(false, "the case has no `solution`");
	if (mode === "traps" && steps.length === 0) return outcome(true, "the case declares no traps");

	const held: string[] = [];
	for (const [label, step] of steps) {
		const project = await createTestProject<Context>({
			name: `e2e-${testCase.name.replace(/[^a-z0-9-]+/gi, "-")}-${Date.now()}`,
			fixtures: testCase.fixtures,
		});
		try {
			await step!(project);
			const rejected = await rejection(testCase, project);
			if (mode === "reference") {
				if (rejected) return outcome(false, `the check rejects the reference solution: ${rejected}`);
				held.push("the check accepts the reference solution");
			} else {
				if (!rejected) return outcome(false, `the check accepts "${label}"`);
				held.push(`"${label}" rejected (${firstLine(rejected)})`);
			}
		} catch (error) {
			// A trap the API itself refuses never reaches the check: that is a rejection too.
			const message = firstLine(error instanceof Error ? error.message : String(error));
			if (mode === "traps") held.push(`"${label}" refused by the API (${message})`);
			else return outcome(false, `${label} threw: ${message}`);
		} finally {
			if (!process.env.E2E_KEEP_PROJECT) await destroyTestProject(project);
		}
	}
	return outcome(true, held.join("; "));
}

export async function runE2ETest<Context = undefined>(
	testCase: E2ETestCase<Context>,
): Promise<E2ETestOutcome> {
	const control = controlMode();
	if (control) {
		const outcome = await runControl(testCase, control);
		console.log(`${outcome.passed ? "✓" : "✗"} ${testCase.name} ${outcome.reason}`);
		return outcome;
	}
	const project = await createTestProject<Context>({
		name: `e2e-${testCase.name.replace(/[^a-z0-9-]+/gi, "-")}-${Date.now()}`,
		fixtures: testCase.fixtures,
	});

	try {
		const outcome = await runAndAssert(testCase, project);
		await persistOutcome(outcome);
		return outcome;
	} finally {
		if (!process.env.E2E_KEEP_PROJECT) await destroyTestProject(project);
	}
}

async function runAndAssert<Context>(
	testCase: E2ETestCase<Context>,
	project: TestProject<Context>,
): Promise<E2ETestOutcome> {
	let runResult: RunAgentResult;
	try {
		const runOptions: RunAgentOptions = {
			name: testCase.name,
			prompt: buildPrompt(project, testCase.task(project)),
			maxAttempts: testCase.maxAttempts,
			apiToken: project.apiToken,
			environment: project.environment,
			files: testCase.files?.(project),
			model: testCase.model,
			timeoutMs: testCase.timeoutMs,
		};
		runResult = await runAgent(runOptions);
	} catch (error) {
		const err = error instanceof Error ? error : new Error(String(error));
		return {
			name: testCase.name,
			passed: false,
			attempts: 0,
			reason: `runAgent crashed: ${err.message}`,
			transcriptPath: "",
			toolCallNames: [],
			finalText: undefined,
		};
	}

	return gradeRun(runResult, testCase, project);
}

async function persistOutcome(outcome: E2ETestOutcome): Promise<void> {
	if (!outcome.transcriptPath) return;
	const workDir = dirname(outcome.transcriptPath);
	const path = join(workDir, "outcome.json");
	const serializable = {
		name: outcome.name,
		passed: outcome.passed,
		attempts: outcome.attempts,
		reason: outcome.reason,
		transcriptPath: outcome.transcriptPath,
		toolCallNames: outcome.toolCallNames,
		finalText: outcome.finalText,
		stateVerdict: outcome.stateVerdict,
	};
	await writeFile(path, `${JSON.stringify(serializable, null, 2)}\n`);
}
