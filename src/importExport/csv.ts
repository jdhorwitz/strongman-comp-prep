import Papa from "papaparse";
import type { AppData } from "../types/domain.ts";

export function toCsv<T extends Record<string, unknown>>(rows: T[]): string {
	return Papa.unparse(rows);
}

export function parseCsvRows(contents: string): Record<string, string>[] {
	const result = Papa.parse<Record<string, string>>(contents, {
		header: true,
		skipEmptyLines: true,
		transform: (value) => value.trim(),
	});
	if (result.errors.length > 0)
		throw new Error(result.errors.map((error) => error.message).join("; "));
	return result.data;
}

export function bodyweightCsv(data: AppData) {
	return toCsv(
		data.bodyweightEntries.map(({ date, weightLb, notes }) => ({
			date,
			weightLb,
			notes: notes ?? "",
		})),
	);
}

export function nutritionCsv(data: AppData) {
	return toCsv(
		data.nutritionEntries.map(
			({ date, calories, proteinG, carbsG, fatG, notes }) => ({
				date,
				calories,
				proteinG,
				carbsG,
				fatG,
				notes: notes ?? "",
			}),
		),
	);
}

export function trainingCsv(data: AppData) {
	const rows = data.trainingSessions.flatMap((session) =>
		session.exercises.flatMap((exercise) =>
			exercise.sets.map((set, index) => ({
				date: session.date,
				sessionTitle: session.title ?? "",
				exercise: exercise.name,
				eventCategory: exercise.eventCategory ?? "",
				setNumber: index + 1,
				weightLb: set.weightLb ?? "",
				reps: set.reps ?? "",
				rpe: set.rpe ?? "",
				distanceFt: set.distanceFt ?? "",
				timeSeconds: set.timeSeconds ?? "",
				holdSeconds: set.holdSeconds ?? "",
				notes: set.notes ?? "",
			})),
		),
	);
	return toCsv(rows);
}

export function recoveryCsv(data: AppData) {
	return toCsv(
		data.recoveryEntries.map((entry) => ({
			date: entry.date,
			sleepHours: entry.sleepHours ?? "",
			recoveryScore: entry.recoveryScore ?? "",
			fatigueScore: entry.fatigueScore ?? "",
			stressScore: entry.stressScore ?? "",
			painAreas:
				entry.painAreas
					?.map((pain) => `${pain.area}:${pain.severity}`)
					.join(";") ?? "",
			mobilityWork: entry.mobilityWork ?? "",
			notes: entry.notes ?? "",
		})),
	);
}

type DownloadAnchor = { href: string; download: string; click: () => void };
type DownloadRuntime = typeof globalThis & {
	document?: { createElement: (tagName: "a") => DownloadAnchor };
	URL: {
		createObjectURL: (blob: Blob) => string;
		revokeObjectURL: (url: string) => void;
	};
};

export function downloadTextFile(
	fileName: string,
	contents: string,
	type = "text/plain",
) {
	const runtime = globalThis as DownloadRuntime;
	if (!runtime.document) return;
	const blob = new Blob([contents], { type });
	const url = runtime.URL.createObjectURL(blob);
	const link = runtime.document.createElement("a");
	link.href = url;
	link.download = fileName;
	link.click();
	runtime.URL.revokeObjectURL(url);
}
