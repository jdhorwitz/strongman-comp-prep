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
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://jdhorwitz.github.io",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const PUBLIC_TRACKER_ID = "josh";
const SCHEMA_VERSION = 1;

type NutritionPayload = {
  date: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  notes?: string;
};

type AppData = {
  schemaVersion: 1;
  nutritionEntries: Array<{ id: string; date: string; calories: number; proteinG: number; carbsG: number; fatG: number; notes?: string }>;
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
  return authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
}

function numericField(payload: Record<string, unknown>, key: keyof NutritionPayload): number {
  const value = payload[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${key} must be a non-negative number.`);
  }
  return value;
}

function assertPayload(value: unknown): NutritionPayload {
  if (!value || typeof value !== "object") throw new Error("JSON body is required.");
  const payload = value as Record<string, unknown>;
  const date = payload.date;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("date must be YYYY-MM-DD.");
  const notes = payload.notes;
  if (notes !== undefined && typeof notes !== "string") throw new Error("notes must be a string when provided.");
  return {
    date,
    calories: numericField(payload, "calories"),
    proteinG: numericField(payload, "proteinG"),
    carbsG: numericField(payload, "carbsG"),
    fatG: numericField(payload, "fatG"),
    notes,
  };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeadersFor(request) });
  if (request.method !== "POST") return jsonResponse(request, { error: "Method not allowed" }, 405);

  const expectedToken = Deno.env.get("CHATGPT_IMPORT_TOKEN");
  if (!expectedToken) return jsonResponse(request, { error: "CHATGPT_IMPORT_TOKEN is not configured" }, 500);
  if (bearerToken(request) !== expectedToken) return jsonResponse(request, { error: "Unauthorized" }, 401);

  try {
    const payload = assertPayload(await request.json());
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase service env vars are not configured.");

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: row, error: readError } = await supabase
      .from("app_data_public")
      .select("data")
      .eq("id", PUBLIC_TRACKER_ID)
      .maybeSingle();
    if (readError) throw readError;
    if (!row?.data) throw new Error("Public tracker row does not exist yet. Sign in to the website and sync once first.");

    const appData = row.data as AppData;
    if (appData.schemaVersion !== SCHEMA_VERSION) throw new Error("Unsupported tracker schema version.");

    const entry = {
      id: `chatgpt-nutrition-${payload.date}`,
      date: payload.date,
      calories: payload.calories,
      proteinG: payload.proteinG,
      carbsG: payload.carbsG,
      fatG: payload.fatG,
      notes: payload.notes ?? "Imported from ChatGPT meal log",
    };

    const nextData: AppData = {
      ...appData,
      nutritionEntries: [
        ...appData.nutritionEntries.filter((existing) => existing.date !== payload.date),
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

    return jsonResponse(request, { ok: true, date: payload.date, entry, updatedAt });
  } catch (error) {
    return jsonResponse(request, { error: error instanceof Error ? error.message : "Unknown error" }, 400);
  }
});
