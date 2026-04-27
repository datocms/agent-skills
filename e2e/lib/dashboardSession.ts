import {
	ApiError,
	buildClient as buildDashboardClient,
	type Client as DashboardClient,
} from "@datocms/dashboard-client";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const SESSION_CACHE_PATH = join(
	resolve(process.cwd()),
	"tmp",
	"dashboard-session.json",
);

type CachedSession = { sessionId: string };

function requireEnv(name: string): string {
	const v = process.env[name];
	if (!v) throw new Error(`Missing env var ${name}`);
	return v;
}

function shuffle<T>(xs: T[]): T[] {
	const arr = [...xs];
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j]!, arr[i]!];
	}
	return arr;
}

function readCachedSessionId(): string | null {
	if (process.env.DATOCMS_SESSION_ID) return process.env.DATOCMS_SESSION_ID;
	if (!existsSync(SESSION_CACHE_PATH)) return null;
	try {
		const parsed = JSON.parse(
			readFileSync(SESSION_CACHE_PATH, "utf8"),
		) as CachedSession;
		return parsed.sessionId ?? null;
	} catch {
		return null;
	}
}

function writeCachedSessionId(sessionId: string): void {
	mkdirSync(dirname(SESSION_CACHE_PATH), { recursive: true });
	writeFileSync(
		SESSION_CACHE_PATH,
		JSON.stringify({ sessionId } satisfies CachedSession, null, 2),
	);
	process.env.DATOCMS_SESSION_ID = sessionId;
}

export function invalidateCachedSession(): void {
	delete process.env.DATOCMS_SESSION_ID;
	try {
		if (existsSync(SESSION_CACHE_PATH)) {
			writeFileSync(SESSION_CACHE_PATH, "");
		}
	} catch {}
}

async function loginAndCache(): Promise<string> {
	const emails = shuffle(
		requireEnv("TEST_DATOCMS_ACCOUNT_EMAIL").split(/\s*,\s*/),
	);
	const password = requireEnv("TEST_DATOCMS_ACCOUNT_PASSWORD");

	for (const email of emails) {
		const bootstrap = buildDashboardClient({
			apiToken: null,
			autoRetry: false,
		});
		try {
			const session = await bootstrap.session.rawCreate({
				data: {
					type: "email_credentials",
					attributes: { email, password },
				},
			});
			writeCachedSessionId(session.data.id);
			return session.data.id;
		} catch (error) {
			if (error instanceof ApiError && error.findError("RATE_LIMIT_EXCEEDED")) {
				continue;
			}
			throw error;
		}
	}

	throw new Error("All test accounts rate-limited; cannot create session.");
}

export async function getDashboardSessionId(): Promise<string> {
	const cached = readCachedSessionId();
	if (cached) return cached;
	return loginAndCache();
}

export async function buildAuthenticatedDashboardClient(): Promise<DashboardClient> {
	const organizationId = requireEnv("TEST_DATOCMS_ORGANIZATION_ID");
	const sessionId = await getDashboardSessionId();
	return buildDashboardClient({
		apiToken: sessionId,
		organization: organizationId,
	});
}

export function isAuthError(error: unknown): boolean {
	if (!(error instanceof ApiError)) return false;
	return (
		error.response.status === 401 ||
		error.response.status === 403 ||
		Boolean(error.findError("INVALID_AUTHORIZATION_HEADER")) ||
		Boolean(error.findError("INVALID_AUTHENTICATION"))
	);
}
