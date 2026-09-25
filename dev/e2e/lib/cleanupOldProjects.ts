import { ApiError } from "@datocms/dashboard-client";
import { ConcurrentPromiseQueue } from "concurrent-promise-queue";
import {
	buildAuthenticatedDashboardClient,
	invalidateCachedSession,
	isAuthError,
} from "./dashboardSession.js";

const DEFAULT_MAX_AGE_MS = 30 * 60 * 1000;

function shuffle<T>(xs: T[]): T[] {
	const arr = [...xs];
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j]!, arr[i]!];
	}
	return arr;
}

export type CleanupOptions = {
	maxAgeMs?: number;
	force?: boolean;
	log?: (message: string) => void;
};

export async function cleanupOldProjects(
	options: CleanupOptions = {},
): Promise<{ destroyed: number; scanned: number }> {
	const maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
	const force = options.force ?? false;
	const log = options.log ?? (() => {});

	let client = await buildAuthenticatedDashboardClient();

	const cutoff = Date.now() - maxAgeMs;
	const toDestroy: string[] = [];
	let scanned = 0;

	const collectIterator = async (): Promise<void> => {
		for await (const site of client.sites.listPagedIterator(
			{},
			{ perPage: 50, concurrency: 5 },
		)) {
			scanned++;
			if (force || !site.created_at || Date.parse(site.created_at) < cutoff) {
				toDestroy.push(site.id);
			}
		}
	};

	try {
		await collectIterator();
	} catch (error) {
		if (!isAuthError(error)) throw error;
		log("Cached session rejected; logging in again.");
		invalidateCachedSession();
		client = await buildAuthenticatedDashboardClient();
		scanned = 0;
		toDestroy.length = 0;
		await collectIterator();
	}

	log(
		`Scanned ${scanned} project(s); destroying ${toDestroy.length} (force=${force}, maxAge=${Math.round(maxAgeMs / 60000)}min).`,
	);

	const queue = new ConcurrentPromiseQueue({
		maxNumberOfConcurrentPromises: 20,
	});

	let destroyed = 0;
	await Promise.all(
		shuffle(toDestroy).map((id) =>
			queue.addPromise(async () => {
				try {
					await client.sites.destroy(id);
					destroyed++;
				} catch (error) {
					if (error instanceof ApiError && error.findError("NOT_FOUND")) return;
					log(`Failed to destroy ${id}: ${(error as Error).message}`);
				} finally {
					process.stdout.write(".");
				}
			}),
		),
	);

	log(`Destroyed ${destroyed} project(s).`);
	return { destroyed, scanned };
}
