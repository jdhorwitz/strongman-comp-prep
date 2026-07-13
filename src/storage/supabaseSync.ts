import {
	createClient,
	type Session,
	type SupabaseClient,
} from "@supabase/supabase-js";
import type { AppData } from "../types/domain.ts";
import { appDataSchema } from "./schemas.ts";

export type SyncStatus =
	| "local-only"
	| "signed-out"
	| "syncing"
	| "synced"
	| "error";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
	| string
	| undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
	? createClient(supabaseUrl!, supabaseAnonKey!, {
			auth: {
				persistSession: true,
				autoRefreshToken: true,
				detectSessionInUrl: true,
			},
		})
	: null;

type RemoteAppDataRow = {
	user_id: string;
	data: unknown;
	updated_at: string;
};

export async function getCurrentSession(): Promise<Session | null> {
	if (!supabase) return null;
	const { data, error } = await supabase.auth.getSession();
	if (error) throw error;
	return data.session;
}

export function onSessionChange(callback: (session: Session | null) => void) {
	if (!supabase) return () => undefined;
	const { data } = supabase.auth.onAuthStateChange((_event, session) =>
		callback(session),
	);
	return () => data.subscription.unsubscribe();
}

export async function signInWithEmail(email: string): Promise<void> {
	if (!supabase) throw new Error("Supabase is not configured.");
	const redirectTo = globalThis.location?.href.split("#")[0];
	const { error } = await supabase.auth.signInWithOtp({
		email,
		options: { emailRedirectTo: redirectTo },
	});
	if (error) throw error;
}

export async function signOutOfSupabase(): Promise<void> {
	if (!supabase) return;
	const { error } = await supabase.auth.signOut();
	if (error) throw error;
}

export async function fetchRemoteAppData(
	session: Session,
): Promise<{ data: AppData; updatedAt: string } | null> {
	if (!supabase) return null;
	const { data, error } = await supabase
		.from("app_data")
		.select("user_id,data,updated_at")
		.eq("user_id", session.user.id)
		.maybeSingle<RemoteAppDataRow>();
	if (error) throw error;
	if (!data) return null;
	return { data: appDataSchema.parse(data.data), updatedAt: data.updated_at };
}

export async function saveRemoteAppData(
	session: Session,
	data: AppData,
): Promise<void> {
	if (!supabase) return;
	const parsed = appDataSchema.parse(data);
	const { error } = await supabase.from("app_data").upsert({
		user_id: session.user.id,
		data: parsed,
		updated_at: new Date().toISOString(),
	});
	if (error) throw error;
}
