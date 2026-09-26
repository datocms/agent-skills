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
		`The datocms CLI is installed and authenticated. Use environment "${project.environment ?? "main"}"; no auth setup is needed.\n\n` +
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

	const toolCallNames = runResult.toolCalls.map((c) => c.name);
	const base = {
		name: testCase.name,
		attempts: runResult.attempts,
		transcriptPath: runResult.transcriptPath,
		toolCallNames,
		finalText: runResult.finalText,
	};

	if (runResult.terminatedByCap || runResult.attempts > testCase.maxAttempts) {
		return {
			...base,
			passed: false,
			reason: `Terminated after exceeding maxAttempts=${testCase.maxAttempts} or hitting timeout`,
		};
	}

	if (runResult.oracleAccess?.length) {
		return {
			...base,
			passed: false,
			reason: `Agent referenced evaluation state: ${runResult.oracleAccess.join(" | ")}`,
		};
	}

	if (runResult.exitCode !== 0) {
		return {
			...base,
			passed: false,
			reason: `Agent exited with code ${runResult.exitCode}`,
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
