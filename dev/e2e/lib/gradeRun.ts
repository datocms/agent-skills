import type { TestProject } from "./createTestProject.ts";
import type { RunAgentResult } from "./runAgent.ts";
import type { E2ETestCase, E2ETestOutcome } from "./runE2ETest.ts";

export async function gradeRun<Context>(
	runResult: RunAgentResult,
	testCase: E2ETestCase<Context>,
	project: TestProject<Context>,
): Promise<E2ETestOutcome> {
	const base = {
		name: testCase.name,
		attempts: runResult.attempts,
		transcriptPath: runResult.transcriptPath,
		toolCallNames: runResult.toolCalls.map((call) => call.name),
		finalText: runResult.finalText,
	};
	const flagged = Boolean(runResult.oracleAccess?.length);
	let reason: string | undefined;
	if (runResult.terminatedByCap || runResult.attempts > testCase.maxAttempts) {
		reason = `Terminated after exceeding maxAttempts=${testCase.maxAttempts} or hitting timeout`;
	} else if (flagged) {
		reason = `Agent referenced evaluation state: ${runResult.oracleAccess!.join(" | ")}`;
	} else if (runResult.exitCode !== 0) {
		reason = `Agent exited with code ${runResult.exitCode}`;
	}
	// Preserve execution gates, but retain the independent state observation
	// whenever a detector flag would otherwise discard it.
	if (reason && !flagged) return { ...base, passed: false, reason };
	try {
		await testCase.assert(project);
	} catch (error) {
		const err = error instanceof Error ? error : new Error(String(error));
		return {
			...base,
			passed: false,
			reason: reason ?? `Assertion failed: ${err.message}`,
			assertionError: err,
			...(flagged ? { stateVerdict: `failed: ${err.message}` as const } : {}),
		};
	}
	if (flagged) return { ...base, passed: false, reason: reason!, stateVerdict: "passed" };
	return { ...base, passed: true, reason: "ok" };
}
