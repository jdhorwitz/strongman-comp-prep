import { Dexie, type Table } from "dexie";
import { initialData } from "../data/initialData.ts";
import type { AppData } from "../types/domain.ts";
import { appDataSchema } from "./schemas.ts";

const DATABASE_NAME = "strongman-comp-prep";
const APP_DATA_ID = "current";
const LEGACY_LOCAL_STORAGE_KEY = "strongman-comp-prep:v1";

type AppDataRecord = {
	id: string;
	data: AppData;
	updatedAt: string;
};

type StrongmanPrepDatabase = Dexie & {
	appData: Table<AppDataRecord, string>;
};

const db = new Dexie(DATABASE_NAME) as StrongmanPrepDatabase;
db.version(1).stores({ appData: "id, updatedAt" });

db.appData = db.table("appData");

function legacyLocalStorageData(): AppData | null {
	try {
		const raw = globalThis.localStorage?.getItem(LEGACY_LOCAL_STORAGE_KEY);
		if (!raw) return null;
		return appDataSchema.parse(JSON.parse(raw));
	} catch {
		return null;
	}
}

export async function loadAppDataFromDatabase(): Promise<AppData> {
	const stored = await db.appData.get(APP_DATA_ID);
	if (stored) return appDataSchema.parse(stored.data);

	const legacy = legacyLocalStorageData();
	const data = legacy ?? initialData;
	await saveAppDataToDatabase(data);
	if (legacy) globalThis.localStorage?.removeItem(LEGACY_LOCAL_STORAGE_KEY);
	return data;
}

export async function saveAppDataToDatabase(data: AppData): Promise<void> {
	const parsed = appDataSchema.parse(data);
	await db.appData.put({
		id: APP_DATA_ID,
		data: parsed,
		updatedAt: new Date().toISOString(),
	});
}

export async function resetAppDataDatabase(): Promise<void> {
	await saveAppDataToDatabase(initialData);
}

export { DATABASE_NAME };
