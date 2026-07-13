import { createClient } from "npm:@supabase/supabase-js@2.110.3";

const allowedOrigins = new Set([
	"https://jdhorwitz.github.io",
	"http://127.0.0.1:5173",
	"https://chat.openai.com",
	"https://chatgpt.com",
]);

const PUBLIC_TRACKER_ID = "josh";
const OURA_API_BASE = "https://api.ouraring.com/v2/usercollection";

type RecoveryEntry = {
	id: string;
	date: string;
	sleepHours?: number;
	recoveryScore?: number;
	fatigueScore?: number;
	stressScore?: number;
	painAreas?: Array<{ area: string; severity: number }>;
	mobilityWork?: string;
	readinessScore?: number;
	sleepScore?: number;
	activityScore?: number;
	restingHeartRate?: number;
	hrvMs?: number;
	respiratoryRate?: number;
	bodyTemperatureDeviation?: number;
	source?: string;
	notes?: string;
};

type AppData = {
	schemaVersion: 1;
	recoveryEntries: RecoveryEntry[];
	[key: string]: unknown;
};

type OuraRangeRequest = {
	date?: string;
	startDate?: string;
	endDate?: string;
};

function corsHeadersFor(request: Request) {
	const origin = request.headers.get("origin") ?? "https://jdhorwitz.github.io";
	return {
		"Access-Control-Allow-Origin": allowedOrigins.has(origin)
			? origin
			: "https://jdhorwitz.github.io",
		"Access-Control-Allow-Headers":
			"authorization, x-client-info, apikey, content-type",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		Vary: "Origin",
	};
}

function jsonResponse(request: Request, body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeadersFor(request), "Content-Type": "application/json" },
	});
}

function bearerToken(request: Request): string | null {
	const authorization = request.headers.get("authorization") ?? "";
	return authorization.startsWith("Bearer ")
		? authorization.slice("Bearer ".length)
		: null;
}

function errorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
}

function isoDate(date: Date) {
	return date.toISOString().slice(0, 10);
}

function dateDaysAgo(days: number) {
	const date = new Date();
	date.setUTCDate(date.getUTCDate() - days);
	return isoDate(date);
}

function parseRange(value: unknown): { startDate: string; endDate: string } {
	const payload = (value ?? {}) as OuraRangeRequest;
	const date = payload.date;
	const startDate = date ?? payload.startDate ?? dateDaysAgo(7);
	const endDate = date ?? payload.endDate ?? isoDate(new Date());
	for (const item of [startDate, endDate]) {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(item)) {
			throw new Error("date, startDate, and endDate must use YYYY-MM-DD format.");
		}
	}
	return { startDate, endDate };
}

async function fetchOuraCollection(path: string, startDate: string, endDate: string, token: string) {
	const query = new URLSearchParams({ start_date: startDate, end_date: endDate });
	const url = `${OURA_API_BASE}/${path}?${query.toString()}`;
	const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
	if (!response.ok) throw new Error(`Oura ${path} failed: ${response.status} ${await response.text()}`);
	const json = await response.json();
	return Array.isArray(json.data) ? json.data as Array<Record<string, unknown>> : [];
}

function numberField(record: Record<string, unknown>, keys: string[]) {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === "number" && Number.isFinite(value)) return value;
	}
	return undefined;
}

function dayField(record: Record<string, unknown>) {
	const day = record.day ?? record.date;
	return typeof day === "string" ? day.slice(0, 10) : undefined;
}

function secondsToHours(seconds: number | undefined) {
	return seconds === undefined ? undefined : Number((seconds / 3600).toFixed(1));
}

function mergeMetric(target: Map<string, Partial<RecoveryEntry>>, date: string, patch: Partial<RecoveryEntry>) {
	target.set(date, { ...(target.get(date) ?? {}), ...patch });
}

function buildRecoveryPatches(
	readiness: Array<Record<string, unknown>>,
	sleep: Array<Record<string, unknown>>,
	activity: Array<Record<string, unknown>>,
) {
	const byDate = new Map<string, Partial<RecoveryEntry>>();
	for (const item of readiness) {
		const date = dayField(item);
		if (!date) continue;
		const readinessScore = numberField(item, ["score"]);
		mergeMetric(byDate, date, {
			readinessScore,
			recoveryScore: readinessScore ? Math.round(readinessScore / 10) : undefined,
			bodyTemperatureDeviation: numberField(item, ["temperature_deviation"]),
		});
	}
	for (const item of sleep) {
		const date = dayField(item);
		if (!date) continue;
		mergeMetric(byDate, date, {
			sleepScore: numberField(item, ["score"]),
			sleepHours: secondsToHours(numberField(item, ["total_sleep_duration", "sleep_duration"])),
			restingHeartRate: numberField(item, ["lowest_heart_rate", "average_heart_rate"]),
			hrvMs: numberField(item, ["average_hrv", "hrv"]),
			respiratoryRate: numberField(item, ["average_breath", "respiratory_rate"]),
		});
	}
	for (const item of activity) {
		const date = dayField(item);
		if (!date) continue;
		mergeMetric(byDate, date, { activityScore: numberField(item, ["score"]) });
	}
	return byDate;
}

Deno.serve(async (request: Request) => {
	if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeadersFor(request) });
	if (request.method !== "POST") return jsonResponse(request, { error: "Method not allowed" }, 405);

	const expectedToken = Deno.env.get("OURA_SYNC_TOKEN") ?? Deno.env.get("CHATGPT_IMPORT_TOKEN");
	if (!expectedToken) return jsonResponse(request, { error: "OURA_SYNC_TOKEN or CHATGPT_IMPORT_TOKEN is not configured" }, 500);
	if (bearerToken(request) !== expectedToken) return jsonResponse(request, { error: "Unauthorized" }, 401);

	try {
		const { startDate, endDate } = parseRange(await request.json().catch(() => ({})));
		const ouraToken = Deno.env.get("OURA_ACCESS_TOKEN");
		const supabaseUrl = Deno.env.get("SUPABASE_URL");
		const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
		if (!ouraToken) throw new Error("OURA_ACCESS_TOKEN is not configured.");
		if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase service env vars are not configured.");

		const [readiness, sleep, activity] = await Promise.all([
			fetchOuraCollection("daily_readiness", startDate, endDate, ouraToken),
			fetchOuraCollection("daily_sleep", startDate, endDate, ouraToken),
			fetchOuraCollection("daily_activity", startDate, endDate, ouraToken),
		]);
		const patches = buildRecoveryPatches(readiness, sleep, activity);

		const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
		const { data: row, error: readError } = await supabase
			.from("app_data_public")
			.select("data")
			.eq("id", PUBLIC_TRACKER_ID)
			.maybeSingle();
		if (readError) throw readError;
		if (!row?.data) throw new Error("Public tracker row does not exist yet. Sign in to the website and sync once first.");

		const appData = row.data as AppData;
		if (appData.schemaVersion !== 1) throw new Error("Unsupported tracker schema version.");
		const existingByDate = new Map(appData.recoveryEntries.map((entry) => [entry.date, entry]));
		for (const [date, patch] of patches) {
			const existing = existingByDate.get(date);
			existingByDate.set(date, {
				...(existing ?? { id: `oura-recovery-${date}`, date }),
				...patch,
				source: "Oura",
				notes: existing?.notes ?? "Imported from Oura",
			});
		}
		const nextData: AppData = {
			...appData,
			recoveryEntries: [...existingByDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
		};
		const updatedAt = new Date().toISOString();
		const { error: publicWriteError } = await supabase
			.from("app_data_public")
			.upsert({ id: PUBLIC_TRACKER_ID, data: nextData, updated_at: updatedAt });
		if (publicWriteError) throw publicWriteError;

		const joshUserId = Deno.env.get("JOSH_USER_ID");
		if (joshUserId) {
			const { error: privateWriteError } = await supabase
				.from("app_data")
				.upsert({ user_id: joshUserId, data: nextData, updated_at: updatedAt });
			if (privateWriteError) throw privateWriteError;
		}

		return jsonResponse(request, {
			ok: true,
			startDate,
			endDate,
			updatedDates: [...patches.keys()].sort(),
			updatedAt,
		});
	} catch (error) {
		console.error("sync-oura failed", error);
		return jsonResponse(request, { error: errorMessage(error) }, 400);
	}
});
