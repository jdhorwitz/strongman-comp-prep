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

type StepsPayload = {
	date: string;
	steps: number;
	source?: string;
	notes?: string;
};

type AppData = {
	schemaVersion: 1;
	bodyweightEntries: BodyweightPayloadWithId[];
	recoveryEntries: RecoveryEntry[];
	[key: string]: unknown;
};

type BodyweightPayloadWithId = BodyweightPayload & { id: string };
type RecoveryEntry = {
	id: string;
	date: string;
	steps?: number;
	source?: string;
	notes?: string;
	[key: string]: unknown;
};

type ParsedImport = {
	bodyweights: BodyweightPayload[];
	steps: StepsPayload[];
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

function stringField(value: unknown) {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberField(value: unknown) {
	return typeof value === "number" && Number.isFinite(value) && value >= 0
		? value
		: undefined;
}

function assertSinglePayload(value: unknown): ParsedImport {
	if (!value || typeof value !== "object")
		throw new Error("JSON body is required.");
	const payload = value as Record<string, unknown>;
	const date = payload.date;
	if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
		throw new Error("date must be YYYY-MM-DD.");
	const bodyweights: BodyweightPayload[] = [];
	const stepsPayloads: StepsPayload[] = [];
	const weightLb = numberField(payload.weightLb);
	if (weightLb !== undefined) {
		if (weightLb <= 0) throw new Error("weightLb must be positive.");
		bodyweights.push({
			date,
			weightLb,
			bodyFatPercent: numberField(payload.bodyFatPercent),
			source: stringField(payload.source),
			notes: stringField(payload.notes),
		});
	}
	const steps = numberField(payload.steps);
	if (steps !== undefined) {
		stepsPayloads.push({
			date,
			steps: Math.round(steps),
			source: stringField(payload.source),
			notes: stringField(payload.notes),
		});
	}
	if (bodyweights.length === 0 && stepsPayloads.length === 0) {
		throw new Error("Provide weightLb and/or steps.");
	}
	return { bodyweights, steps: stepsPayloads };
}

function sourceRank(source: string | undefined) {
	if (!source) return 0;
	if (/renpho/i.test(source)) return 4;
	if (/withings/i.test(source)) return 3;
	if (/apple/i.test(source)) return 2;
	if (/macrofactor/i.test(source)) return 1;
	return 0;
}

function metricDate(rawDate: unknown) {
	return typeof rawDate === "string" ? rawDate.slice(0, 10) : undefined;
}

function isDate(value: string | undefined) {
	return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function isStepMetricName(name: string | undefined) {
	return Boolean(name && /step/i.test(name));
}

function healthExportPayloads(value: unknown): ParsedImport | null {
	const root = value as {
		data?: {
			metrics?: Array<{ name?: string; units?: string; data?: unknown[] }>;
		};
	};
	const metrics = root?.data?.metrics;
	if (!Array.isArray(metrics)) return null;
	const bodyweights: BodyweightPayload[] = [];
	const stepsPayloads: StepsPayload[] = [];
	const weightMetric = metrics.find(
		(metric) => metric.name === "weight_body_mass",
	);
	if (weightMetric && Array.isArray(weightMetric.data)) {
		const units = weightMetric.units ?? "lb";
		const byDate = new Map<string, BodyweightPayload & { rawDate?: string }>();
		for (const item of weightMetric.data as Array<Record<string, unknown>>) {
			const date = metricDate(item.date);
			const qty = numberField(item.qty);
			if (!isDate(date) || qty === undefined || qty <= 0) continue;
			const source = stringField(item.source) ?? "Apple Health";
			const weightLb = units.toLowerCase() === "kg" ? qty * 2.2046226218 : qty;
			const candidate = {
				date,
				weightLb: Number(weightLb.toFixed(1)),
				source,
				notes: "Imported from Apple Health export",
				rawDate: stringField(item.date),
			};
			const current = byDate.get(date);
			if (
				!current ||
				sourceRank(candidate.source) > sourceRank(current.source) ||
				(candidate.rawDate ?? "") > (current.rawDate ?? "")
			) {
				byDate.set(date, candidate);
			}
		}
		bodyweights.push(
			...[...byDate.values()].map(
				({ rawDate: _rawDate, ...payload }) => payload,
			),
		);
	}
	const stepMetrics = metrics.filter((metric) => isStepMetricName(metric.name));
	const stepsByDate = new Map<string, StepsPayload>();
	for (const metric of stepMetrics) {
		if (!Array.isArray(metric.data)) continue;
		for (const item of metric.data as Array<Record<string, unknown>>) {
			const date = metricDate(item.date ?? item.start ?? item.end);
			const qty = numberField(item.qty ?? item.value ?? item.count);
			if (!isDate(date) || qty === undefined) continue;
			const current = stepsByDate.get(date);
			stepsByDate.set(date, {
				date,
				steps: (current?.steps ?? 0) + Math.round(qty),
				source: stringField(item.source) ?? current?.source ?? "Apple Health",
				notes: "Imported from Apple Health export",
			});
		}
	}
	stepsPayloads.push(...stepsByDate.values());
	return { bodyweights, steps: stepsPayloads };
}

function assertPayloads(value: unknown): ParsedImport {
	const healthExport = healthExportPayloads(value);
	if (healthExport) return healthExport;
	return assertSinglePayload(value);
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
		const payloads = assertPayloads(await request.json());
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

		const bodyweightEntries = [...(appData.bodyweightEntries ?? [])];
		for (const payload of payloads.bodyweights) {
			const entry = {
				id: `apple-health-bodyweight-${payload.date}`,
				date: payload.date,
				weightLb: payload.weightLb,
				bodyFatPercent: payload.bodyFatPercent,
				source: payload.source ?? "Apple Health",
				notes: payload.notes ?? "Imported from Apple Health",
			};
			const index = bodyweightEntries.findIndex(
				(existing) => existing.date === payload.date,
			);
			if (index >= 0) bodyweightEntries[index] = entry;
			else bodyweightEntries.push(entry);
		}

		const recoveryByDate = new Map(
			(appData.recoveryEntries ?? []).map((entry) => [entry.date, entry]),
		);
		for (const payload of payloads.steps) {
			const existing = recoveryByDate.get(payload.date);
			recoveryByDate.set(payload.date, {
				...(existing ?? {
					id: `apple-health-recovery-${payload.date}`,
					date: payload.date,
				}),
				steps: payload.steps,
				source: existing?.source ?? payload.source ?? "Apple Health",
				notes: existing?.notes ?? payload.notes ?? "Imported from Apple Health",
			});
		}

		const nextData: AppData = {
			...appData,
			bodyweightEntries: bodyweightEntries.sort((a, b) =>
				a.date.localeCompare(b.date),
			),
			recoveryEntries: [...recoveryByDate.values()].sort((a, b) =>
				a.date.localeCompare(b.date),
			),
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
			bodyweightCount: payloads.bodyweights.length,
			stepsCount: payloads.steps.length,
			updatedAt,
		});
	} catch (error) {
		console.error("log-bodyweight failed", error);
		return jsonResponse(request, { error: errorMessage(error) }, 400);
	}
});
