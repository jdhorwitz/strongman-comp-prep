import React, {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import { initialData } from "../data/initialData.ts";
import type {
	AppData,
	BodyweightEntry,
	NutritionEntry,
	RecoveryEntry,
	TrainingSession,
} from "../types/domain.ts";
import { loadAppDataFromDatabase, saveAppDataToDatabase } from "./database.ts";
import {
	fetchPublicAppData,
	fetchRemoteAppData,
	getCurrentSession,
	isSupabaseConfigured,
	onSessionChange,
	saveRemoteAppData,
	signInWithEmail,
	signOutOfSupabase,
	syncOuraFromSupabaseFunction,
	type SyncStatus,
} from "./supabaseSync.ts";
import { appDataSchema } from "./schemas.ts";

type Action =
	| { type: "import"; data: AppData }
	| { type: "reset" }
	| { type: "addBodyweight"; entry: Omit<BodyweightEntry, "id"> }
	| { type: "deleteBodyweight"; id: string }
	| { type: "addNutrition"; entry: Omit<NutritionEntry, "id"> }
	| { type: "deleteNutrition"; id: string }
	| { type: "addTrainingSession"; session: Omit<TrainingSession, "id"> }
	| { type: "deleteTrainingSession"; id: string }
	| { type: "addRecovery"; entry: Omit<RecoveryEntry, "id"> }
	| { type: "deleteRecovery"; id: string };

type AppDataContextValue = {
	data: AppData;
	dispatch: React.Dispatch<Action>;
	isSupabaseConfigured: boolean;
	syncStatus: SyncStatus;
	syncError: string | null;
	userEmail: string | null;
	signIn: (email: string) => Promise<void>;
	signOut: () => Promise<void>;
	syncNow: () => Promise<void>;
	syncOuraNow: () => Promise<void>;
};
const AppDataContext = createContext<AppDataContextValue | null>(null);

function withId<T extends object>(value: T): T & { id: string } {
	return { ...value, id: nanoid() };
}

function reducer(state: AppData, action: Action): AppData {
	switch (action.type) {
		case "import":
			return action.data;
		case "reset":
			return initialData;
		case "addBodyweight":
			return {
				...state,
				bodyweightEntries: [
					...state.bodyweightEntries.filter(
						(e) => e.date !== action.entry.date,
					),
					withId(action.entry),
				].sort((a, b) => a.date.localeCompare(b.date)),
			};
		case "deleteBodyweight":
			return {
				...state,
				bodyweightEntries: state.bodyweightEntries.filter(
					(entry) => entry.id !== action.id,
				),
			};
		case "addNutrition":
			return {
				...state,
				nutritionEntries: [
					...state.nutritionEntries.filter((e) => e.date !== action.entry.date),
					withId(action.entry),
				].sort((a, b) => a.date.localeCompare(b.date)),
			};
		case "deleteNutrition":
			return {
				...state,
				nutritionEntries: state.nutritionEntries.filter(
					(entry) => entry.id !== action.id,
				),
			};
		case "addTrainingSession":
			return {
				...state,
				trainingSessions: [
					...state.trainingSessions,
					withId(action.session),
				].sort((a, b) => a.date.localeCompare(b.date)),
			};
		case "deleteTrainingSession":
			return {
				...state,
				trainingSessions: state.trainingSessions.filter(
					(session) => session.id !== action.id,
				),
			};
		case "addRecovery":
			return {
				...state,
				recoveryEntries: [
					...state.recoveryEntries.filter((e) => e.date !== action.entry.date),
					withId(action.entry),
				].sort((a, b) => a.date.localeCompare(b.date)),
			};
		case "deleteRecovery":
			return {
				...state,
				recoveryEntries: state.recoveryEntries.filter(
					(entry) => entry.id !== action.id,
				),
			};
		default:
			return state;
	}
}

export function AppDataProvider({ children }: { children: ReactNode }) {
	const [data, rawDispatch] = useReducer(reducer, initialData);
	const [isLoaded, setIsLoaded] = React.useState(false);
	const [storageError, setStorageError] = React.useState<string | null>(null);
	const [syncStatus, setSyncStatus] = React.useState<SyncStatus>(
		isSupabaseConfigured ? "signed-out" : "local-only",
	);
	const [syncError, setSyncError] = React.useState<string | null>(null);
	const [session, setSession] = React.useState<Session | null>(null);
	const sessionRef = React.useRef<Session | null>(null);
	const dataRef = React.useRef<AppData>(initialData);
	const shouldSaveRemoteRef = React.useRef(false);

	const dispatch = React.useCallback((action: Action) => {
		shouldSaveRemoteRef.current = true;
		rawDispatch(action);
	}, []);

	useEffect(() => {
		dataRef.current = data;
	}, [data]);

	const applyRemoteOrSeedRemote = React.useCallback(
		async (activeSession: Session, localData: AppData) => {
			setSyncStatus("syncing");
			setSyncError(null);
			const [privateRemote, publicRemote] = await Promise.all([
				fetchRemoteAppData(activeSession),
				fetchPublicAppData(),
			]);
			const newestRemote = [privateRemote, publicRemote]
				.filter((remote): remote is NonNullable<typeof remote> =>
					Boolean(remote),
				)
				.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
			if (newestRemote) {
				rawDispatch({ type: "import", data: newestRemote.data });
				await saveAppDataToDatabase(newestRemote.data);
			} else {
				await saveRemoteAppData(activeSession, localData);
			}
			setSyncStatus("synced");
		},
		[],
	);

	useEffect(() => {
		let cancelled = false;
		loadAppDataFromDatabase()
			.then(async (storedData) => {
				if (cancelled) return;
				rawDispatch({ type: "import", data: storedData });
				if (isSupabaseConfigured) {
					const activeSession = await getCurrentSession();
					if (cancelled) return;
					setSession(activeSession);
					sessionRef.current = activeSession;
					if (activeSession) {
						await applyRemoteOrSeedRemote(activeSession, storedData);
					} else {
						const publicData = await fetchPublicAppData();
						if (publicData && !cancelled) {
							rawDispatch({ type: "import", data: publicData.data });
							await saveAppDataToDatabase(publicData.data);
						}
						setSyncStatus("signed-out");
					}
				}
				setIsLoaded(true);
			})
			.catch((error) => {
				if (cancelled) return;
				setStorageError(
					error instanceof Error
						? error.message
						: "Could not load IndexedDB data",
				);
				setIsLoaded(true);
			});
		return () => {
			cancelled = true;
		};
	}, [applyRemoteOrSeedRemote]);

	useEffect(() => {
		return onSessionChange((nextSession) => {
			setSession(nextSession);
			sessionRef.current = nextSession;
			if (!nextSession) {
				setSyncStatus(isSupabaseConfigured ? "signed-out" : "local-only");
				return;
			}
			applyRemoteOrSeedRemote(nextSession, dataRef.current).catch((error) => {
				setSyncStatus("error");
				setSyncError(
					error instanceof Error ? error.message : "Could not sync remote data",
				);
			});
		});
	}, [applyRemoteOrSeedRemote]);

	useEffect(() => {
		if (!isLoaded) return;
		saveAppDataToDatabase(data).catch((error) => {
			setStorageError(
				error instanceof Error
					? error.message
					: "Could not save IndexedDB data",
			);
		});
		const activeSession = sessionRef.current;
		if (!activeSession || !shouldSaveRemoteRef.current) return;
		shouldSaveRemoteRef.current = false;
		setSyncStatus("syncing");
		saveRemoteAppData(activeSession, data)
			.then(() => {
				setSyncError(null);
				setSyncStatus("synced");
			})
			.catch((error) => {
				setSyncStatus("error");
				setSyncError(
					error instanceof Error ? error.message : "Could not save remote data",
				);
			});
	}, [data, isLoaded]);

	const signIn = React.useCallback(async (email: string) => {
		await signInWithEmail(email);
	}, []);

	const signOut = React.useCallback(async () => {
		await signOutOfSupabase();
		setSession(null);
		sessionRef.current = null;
		setSyncStatus(isSupabaseConfigured ? "signed-out" : "local-only");
	}, []);

	const syncNow = React.useCallback(async () => {
		const activeSession = sessionRef.current;
		if (!activeSession) throw new Error("Sign in before syncing.");
		await saveRemoteAppData(activeSession, data);
		setSyncStatus("synced");
	}, [data]);

	const syncOuraNow = React.useCallback(async () => {
		const activeSession = sessionRef.current;
		if (!activeSession) throw new Error("Sign in before syncing Oura.");
		setSyncStatus("syncing");
		setSyncError(null);
		await syncOuraFromSupabaseFunction();
		const publicData = await fetchPublicAppData();
		if (publicData) {
			rawDispatch({ type: "import", data: publicData.data });
			await saveAppDataToDatabase(publicData.data);
			await saveRemoteAppData(activeSession, publicData.data);
		}
		setSyncStatus("synced");
	}, []);

	const value = useMemo(
		() => ({
			data,
			dispatch,
			isSupabaseConfigured,
			syncStatus,
			syncError,
			userEmail: session?.user.email ?? null,
			signIn,
			signOut,
			syncNow,
			syncOuraNow,
		}),
		[
			data,
			session,
			signIn,
			signOut,
			syncError,
			syncNow,
			syncOuraNow,
			syncStatus,
		],
	);
	return (
		<AppDataContext.Provider value={value}>
			{storageError ? (
				<p className="page danger">Storage error: {storageError}</p>
			) : null}
			{isLoaded ? (
				children
			) : (
				<p className="page muted">Loading tracker data…</p>
			)}
		</AppDataContext.Provider>
	);
}

export function useAppData() {
	const context = useContext(AppDataContext);
	if (!context)
		throw new Error("useAppData must be used within AppDataProvider");
	return context;
}

export function parseImportedAppData(raw: string): AppData {
	return appDataSchema.parse(JSON.parse(raw));
}

export function exportFileName(date = new Date()) {
	return `strongman-comp-prep-backup-${date.toISOString().slice(0, 10)}.json`;
}
