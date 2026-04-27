import {
	buildClient as buildCmaClient,
	type Client as CmaClient,
} from "@datocms/cma-client-node";
import type { Client as DashboardClient } from "@datocms/dashboard-client";
import { buildAuthenticatedDashboardClient } from "./dashboardSession.js";

export type TestProject<Context = unknown> = {
	siteId: string;
	apiToken: string;
	cmaClient: CmaClient;
	dashboardClient: DashboardClient;
	context: Context;
};

export type CreateTestProjectOptions<Context> = {
	name?: string;
	fixtures?: (client: CmaClient) => Promise<Context>;
};

export async function createTestProject<Context = undefined>(
	options: CreateTestProjectOptions<Context> = {},
): Promise<TestProject<Context>> {
	const dashboardClient = await buildAuthenticatedDashboardClient();
	const name = options.name ?? `e2e-mcp-${crypto.randomUUID()}`;

	const site = await dashboardClient.sites.create({ name });
	const siteId = site.id;
	const apiToken = site.access_token;
	if (!apiToken) {
		throw new Error(
			`Site ${siteId} was created but no access_token was returned.`,
		);
	}

	const cmaClient = buildCmaClient({ apiToken });

	let context: Context;
	if (options.fixtures) {
		try {
			context = await options.fixtures(cmaClient);
		} catch (error) {
			await dashboardClient.sites.destroy(siteId).catch(() => {}); // Best-effort cleanup.
			throw error;
		}
	} else {
		context = undefined as Context;
	}

	return { siteId, apiToken, cmaClient, dashboardClient, context };
}

export async function destroyTestProject(
	project: TestProject<unknown>,
): Promise<void> {
	await project.dashboardClient.sites.destroy(project.siteId);
}
