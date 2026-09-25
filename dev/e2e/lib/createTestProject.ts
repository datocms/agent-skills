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
	dashboardClient?: DashboardClient;
	environment?: string;
	context: Context;
};

export type CreateTestProjectOptions<Context> = {
	name?: string;
	fixtures?: (client: CmaClient) => Promise<Context>;
};

export async function createTestProject<Context = undefined>(
	options: CreateTestProjectOptions<Context> = {},
): Promise<TestProject<Context>> {
	if (process.env.E2E_DATOCMS_API_TOKEN) {
		const apiToken = process.env.E2E_DATOCMS_API_TOKEN;
		const root = buildCmaClient({ apiToken });
		const site = await root.site.find();
		if (
			!process.env.E2E_DATOCMS_SITE_ID ||
			site.id !== process.env.E2E_DATOCMS_SITE_ID
		)
			throw Error(
				"Set E2E_DATOCMS_SITE_ID to the authorized throwaway project ID",
			);
		const models = await root.itemTypes.list();
		if (models.length)
			throw Error("Token-based E2E requires an empty primary environment");
		const environment = `e2e-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
		const primary = (await root.environments.list()).find(
			(e) => e.meta.primary,
		);
		if (!primary) throw Error("Primary environment not found");
		await root.environments.fork(primary.id, { id: environment });
		const cmaClient = buildCmaClient({ apiToken, environment });
		const project: TestProject<Context> = {
			siteId: site.id,
			apiToken,
			cmaClient,
			environment,
			context: undefined as Context,
		};
		try {
			if (options.fixtures) project.context = await options.fixtures(cmaClient);
			return project;
		} catch (error) {
			await destroyTestProject(project);
			throw error;
		}
	}
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

	// Projects are never deleted by the harness; remove them manually.
	const context = options.fixtures
		? await options.fixtures(cmaClient)
		: (undefined as Context);

	return { siteId, apiToken, cmaClient, dashboardClient, context };
}

export async function destroyTestProject(
	project: TestProject<unknown>,
): Promise<void> {
	// Dashboard-route projects are left for manual deletion; only the token route's own
	// sandbox environment is removed here.
	if (project.dashboardClient) return;
	if (!project.environment?.startsWith("e2e-"))
		throw Error("Refusing cleanup outside a created test environment");
	const root = buildCmaClient({ apiToken: project.apiToken });
	if ((await root.site.find()).id !== project.siteId)
		throw Error("Cleanup project mismatch");
	await root.environments.destroy(project.environment);
	if (
		(await root.environments.list()).some((e) => e.id === project.environment)
	)
		throw Error("Environment cleanup was not verified");
}
