import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
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
	 * that introduces the project, the `DATOCMS_API_TOKEN` env var, and
	 * the `cma:script` skill — so the task should jump straight into what
	 * the agent has to accomplish.
	 */
	task: (project: TestProject<Context>) => string;
	maxAttempts: number;
	assert: (project: TestProject<Context>) => Promise<void>;
	model?: string;
	timeoutMs?: number;
};

export type E2ETestOutcome = {
	name: string;
	passed: boolean;
	attempts: number;
	reason: string;
	transcriptPath: string;
	toolCallNames: string[];
	finalText: string | undefined;
	assertionError?: Error;
};

function buildPrompt<Context>(
	project: TestProject<Context>,
	task: string,
): string {
	return (
		`You have access to a DatoCMS project (site ID "${project.siteId}"). ` +
		`Assume \`npx datocms cma:script\` and \`npx datocms schema:inspect\` are already configured and ready to run — no auth setup needed.\n\n` +
		`Ensure you load both the datocms-cma AND datocms-cli skills before starting!\n\n` +
		`After requested the task is done, do not spend extra time/passes to check for the actual results: I'll do it myself.\n\n` +
		`Task: ${task}`
	);
}

export async function runE2ETest<Context = undefined>(
	testCase: E2ETestCase<Context>,
): Promise<E2ETestOutcome> {
	const project = await createTestProject<Context>({
		name: `e2e-${testCase.name.replace(/[^a-z0-9-]+/gi, "-")}-${Date.now()}`,
		fixtures: testCase.fixtures,
	});

	const outcome = await runAndAssert(testCase, project);
	await persistOutcome(outcome).catch(() => {}); // Best-effort.

	if (!process.env.E2E_KEEP_PROJECT) {
		await destroyTestProject(project).catch(() => {}); // Best-effort.
	}

	return outcome;
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

	const toolCallNames = runResult.toolCalls.map((c) => c.name);
	const base = {
		name: testCase.name,
		attempts: runResult.attempts,
		transcriptPath: runResult.transcriptPath,
		toolCallNames,
		finalText: runResult.finalText,
	};

	if (runResult.terminatedByCap) {
		return {
			...base,
			passed: false,
			reason: `Terminated after exceeding maxAttempts=${testCase.maxAttempts} or hitting timeout`,
		};
	}

	if (runResult.exitCode !== 0) {
		return {
			...base,
			passed: false,
			reason: `claude CLI exited with code ${runResult.exitCode}`,
		};
	}

	try {
		await testCase.assert(project);
	} catch (error) {
		const err = error instanceof Error ? error : new Error(String(error));
		return {
			...base,
			passed: false,
			reason: `Assertion failed: ${err.message}`,
			assertionError: err,
		};
	}

	return { ...base, passed: true, reason: "ok" };
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
	};
	await writeFile(path, `${JSON.stringify(serializable, null, 2)}\n`);
}
