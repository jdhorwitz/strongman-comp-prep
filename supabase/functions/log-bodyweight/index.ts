import { createClient } from "npm:@supabase/supabase-js@2.110.3";

const allowedOrigins = new Set([
	"https://jdhorwitz.github.io",
	"http://127.0.0.1:5173",
	"https://chat.openai.com",
	"https://chatgpt.com",
]);

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

const PUBLIC_TRACKER_ID = "josh";
const SCHEMA_VERSION = 1;

type BodyweightPayload = {
	date: string;
	weightLb: number;
	bodyFatPercent?: number;
	source?: string;
	notes?: string;
};

type AppData = {
	schemaVersion: 1;
	bodyweightEntries: Array<{
		id: string;
		date: string;
		weightLb: number;
		bodyFatPercent?: number;
		source?: string;
		notes?: string;
	}>;
	[key: string]: unknown;
};

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

function optionalString(
	payload: Record<string, unknown>,
	key: keyof BodyweightPayload,
) {
	const value = payload[key];
	if (value === undefined || value === null || value === "") return undefined;
	if (typeof value !== "string")
		throw new Error(`${key} must be a string when provided.`);
	return value;
}

function optionalNumber(
	payload: Record<string, unknown>,
	key: keyof BodyweightPayload,
) {
	const value = payload[key];
	if (value === undefined || value === null || value === "") return undefined;
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
		throw new Error(`${key} must be a non-negative number when provided.`);
	}
	return value;
}

function assertPayload(value: unknown): BodyweightPayload {
	if (!value || typeof value !== "object")
		throw new Error("JSON body is required.");
	const payload = value as Record<string, unknown>;
	const date = payload.date;
	if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
		throw new Error("date must be YYYY-MM-DD.");
	const weightLb = payload.weightLb;
	if (
		typeof weightLb !== "number" ||
		!Number.isFinite(weightLb) ||
		weightLb <= 0
	) {
		throw new Error("weightLb must be a positive number.");
	}
	return {
		date,
		weightLb,
		bodyFatPercent: optionalNumber(payload, "bodyFatPercent"),
		source: optionalString(payload, "source"),
		notes: optionalString(payload, "notes"),
	};
}

Deno.serve(async (request: Request) => {
	if (request.method === "OPTIONS")
		return new Response("ok", { headers: corsHeadersFor(request) });
	if (request.method !== "POST")
		return jsonResponse(request, { error: "Method not allowed" }, 405);

	const expectedToken =
		Deno.env.get("BODYWEIGHT_IMPORT_TOKEN") ??
		Deno.env.get("CHATGPT_IMPORT_TOKEN");
	if (!expectedToken)
		return jsonResponse(
			request,
			{
				error:
					"BODYWEIGHT_IMPORT_TOKEN or CHATGPT_IMPORT_TOKEN is not configured",
			},
			500,
		);
	if (bearerToken(request) !== expectedToken)
		return jsonResponse(request, { error: "Unauthorized" }, 401);

	try {
		const payload = assertPayload(await request.json());
		const supabaseUrl = Deno.env.get("SUPABASE_URL");
		const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
		if (!supabaseUrl || !serviceRoleKey)
			throw new Error("Supabase service env vars are not configured.");

		const supabase = createClient(supabaseUrl, serviceRoleKey, {
			auth: { persistSession: false },
		});
		const { data: row, error: readError } = await supabase
			.from("app_data_public")
			.select("data")
			.eq("id", PUBLIC_TRACKER_ID)
			.maybeSingle();
		if (readError) throw readError;
		if (!row?.data)
			throw new Error(
				"Public tracker row does not exist yet. Sign in to the website and sync once first.",
			);

		const appData = row.data as AppData;
		if (appData.schemaVersion !== SCHEMA_VERSION)
			throw new Error("Unsupported tracker schema version.");

		const entry = {
			id: `apple-health-bodyweight-${payload.date}`,
			date: payload.date,
			weightLb: payload.weightLb,
			bodyFatPercent: payload.bodyFatPercent,
			source: payload.source ?? "Apple Health",
			notes: payload.notes ?? "Imported from Apple Health",
		};

		const nextData: AppData = {
			...appData,
			bodyweightEntries: [
				...appData.bodyweightEntries.filter(
					(existing) => existing.date !== payload.date,
				),
				entry,
			].sort((a, b) => a.date.localeCompare(b.date)),
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
			date: payload.date,
			entry,
			updatedAt,
		});
	} catch (error) {
		console.error("log-bodyweight failed", error);
		return jsonResponse(request, { error: errorMessage(error) }, 400);
	}
});
