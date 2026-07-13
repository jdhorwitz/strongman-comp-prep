import React from "react";
import { nanoid } from "nanoid";
import {
	bodyweightCsv,
	downloadTextFile,
	nutritionCsv,
	parseCsvRows,
	recoveryCsv,
	trainingCsv,
} from "../importExport/csv.ts";
import {
	exportFileName,
	parseImportedAppData,
	useAppData,
} from "../storage/appStorage.tsx";
import type { EventCategory } from "../types/domain.ts";

const files = { bodyweightCsv, nutritionCsv, trainingCsv, recoveryCsv };
const fileFrom = (event: { currentTarget: unknown }) =>
	(
		event.currentTarget as {
			files: Array<{ text: () => Promise<string> }> | null;
		}
	).files?.[0];
const numberOrUndefined = (value: string | undefined) =>
	value ? Number(value) : undefined;

export function SettingsPage() {
	const {
		data,
		dispatch,
		isSupabaseConfigured,
		signIn,
		signOut,
		syncError,
		syncNow,
		syncStatus,
		userEmail,
	} = useAppData();
	const [message, setMessage] = React.useState("");
	const [email, setEmail] = React.useState("");
	const importCsv = async (
		kind: "bodyweight" | "nutrition" | "training" | "recovery",
		file: { text: () => Promise<string> },
	) => {
		const rows = parseCsvRows(await file.text());
		if (kind === "bodyweight")
			rows.forEach((row) =>
				dispatch({
					type: "addBodyweight",
					entry: {
						date: row.date,
						weightLb: Number(row.weightLb),
						bodyFatPercent: numberOrUndefined(row.bodyFatPercent),
						source: row.source,
						notes: row.notes,
					},
				}),
			);
		if (kind === "nutrition")
			rows.forEach((row) =>
				dispatch({
					type: "addNutrition",
					entry: {
						date: row.date,
						calories: Number(row.calories),
						proteinG: Number(row.proteinG),
						carbsG: Number(row.carbsG),
						fatG: Number(row.fatG),
						notes: row.notes,
					},
				}),
			);
		if (kind === "recovery")
			rows.forEach((row) =>
				dispatch({
					type: "addRecovery",
					entry: {
						date: row.date,
						sleepHours: numberOrUndefined(row.sleepHours),
						recoveryScore: numberOrUndefined(row.recoveryScore),
						fatigueScore: numberOrUndefined(row.fatigueScore),
						stressScore: numberOrUndefined(row.stressScore),
						readinessScore: numberOrUndefined(row.readinessScore),
						sleepScore: numberOrUndefined(row.sleepScore),
						activityScore: numberOrUndefined(row.activityScore),
						restingHeartRate: numberOrUndefined(row.restingHeartRate),
						hrvMs: numberOrUndefined(row.hrvMs),
						respiratoryRate: numberOrUndefined(row.respiratoryRate),
						bodyTemperatureDeviation: numberOrUndefined(
							row.bodyTemperatureDeviation,
						),
						source: row.source,
						mobilityWork: row.mobilityWork,
						notes: row.notes,
					},
				}),
			);
		if (kind === "training")
			rows.forEach((row) =>
				dispatch({
					type: "addTrainingSession",
					session: {
						date: row.date,
						title: row.sessionTitle || row.exercise || "Imported session",
						sessionType: row.eventCategory,
						exercises: [
							{
								id: nanoid(),
								name: row.exercise || "Imported exercise",
								eventCategory: (row.eventCategory || "other") as EventCategory,
								sets: [
									{
										id: nanoid(),
										weightLb: numberOrUndefined(row.weightLb),
										reps: numberOrUndefined(row.reps),
										rpe: numberOrUndefined(row.rpe),
										distanceFt: numberOrUndefined(row.distanceFt),
										timeSeconds: numberOrUndefined(row.timeSeconds),
										holdSeconds: numberOrUndefined(row.holdSeconds),
										notes: row.notes,
										completed: true,
									},
								],
							},
						],
					},
				}),
			);
		setMessage(`Imported ${rows.length} ${kind} CSV rows.`);
	};
	return (
		<div className="grid two">
			<section className="card">
				<h2>Cloud sync</h2>
				{isSupabaseConfigured ? (
					<div className="form">
						<p>
							<strong>Status:</strong> {syncStatus}
						</p>
						{userEmail ? (
							<p className="muted">Signed in as {userEmail}</p>
						) : (
							<p className="muted">
								Sign in with email magic link to sync across browsers/devices.
							</p>
						)}
						{syncError ? <p className="danger">{syncError}</p> : null}
						{userEmail ? (
							<div className="button-row">
								<button
									className="btn"
									onClick={async () => {
										try {
											await syncNow();
											setMessage("Synced to Supabase.");
										} catch (error) {
											setMessage(
												error instanceof Error ? error.message : "Sync failed",
											);
										}
									}}
								>
									Sync now
								</button>
								<button className="btn secondary" onClick={() => signOut()}>
									Sign out
								</button>
							</div>
						) : (
							<form
								className="form"
								onSubmit={async (event) => {
									event.preventDefault();
									try {
										await signIn(email);
										setMessage("Check your email for a Supabase magic link.");
									} catch (error) {
										setMessage(
											error instanceof Error
												? error.message
												: "Could not send sign-in email",
										);
									}
								}}
							>
								<label>
									Email
									<input
										type="email"
										value={email}
										onChange={(event) =>
											setEmail(
												(event.currentTarget as unknown as { value: string })
													.value,
											)
										}
										required
									/>
								</label>
								<button className="btn">Send magic link</button>
							</form>
						)}
					</div>
				) : (
					<p className="muted">
						Supabase is not configured. Add VITE_SUPABASE_URL and
						VITE_SUPABASE_ANON_KEY to enable multi-device sync.
					</p>
				)}
			</section>
			<section className="card">
				<h2>Profile</h2>
				<p>
					<strong>{data.profile.name}</strong>, {data.profile.age},{" "}
					{data.profile.heightInches}"
				</p>
				<p>Class: Masters Men {data.profile.targetClassLb}</p>
				<p>
					Pre-cut target: {data.profile.targetPreCutRangeLb.minimum}–
					{data.profile.targetPreCutRangeLb.maximum} lb
				</p>
				<p>Prep-cycle PR start: {data.profile.prepCycleStartDate}</p>
			</section>
			<section className="card">
				<h2>Backup</h2>
				<div className="button-row">
					<button
						className="btn"
						onClick={() =>
							downloadTextFile(
								exportFileName(),
								JSON.stringify(data, null, 2),
								"application/json",
							)
						}
					>
						Export JSON
					</button>
					<label className="btn secondary">
						Import JSON
						<input
							type="file"
							accept="application/json"
							hidden
							onChange={async (event) => {
								const file = fileFrom(event);
								if (!file) return;
								try {
									dispatch({
										type: "import",
										data: parseImportedAppData(await file.text()),
									});
									setMessage("Imported backup successfully.");
								} catch (error) {
									setMessage(
										`Import failed: ${error instanceof Error ? error.message : "Invalid file"}`,
									);
								}
							}}
						/>
					</label>
					<button
						className="btn danger"
						onClick={() => {
							if (globalThis.confirm("Reset all local data to seed data?"))
								dispatch({ type: "reset" });
						}}
					>
						Reset local data
					</button>
				</div>
				{message ? <p className="muted">{message}</p> : null}
			</section>
			<section className="card" style={{ gridColumn: "1 / -1" }}>
				<h2>CSV export/import</h2>
				<p className="muted">
					CSV is for spreadsheet workflows. JSON is the canonical complete
					backup.
				</p>
				<div className="button-row">
					{Object.entries(files).map(([name, makeCsv]) => (
						<button
							className="btn secondary"
							key={name}
							onClick={() =>
								downloadTextFile(`${name}.csv`, makeCsv(data), "text/csv")
							}
						>
							Export {name}
						</button>
					))}
				</div>
				<div className="button-row" style={{ marginTop: 10 }}>
					{(["bodyweight", "nutrition", "training", "recovery"] as const).map(
						(kind) => (
							<label className="btn secondary" key={kind}>
								Import {kind}
								<input
									type="file"
									accept="text/csv,.csv"
									hidden
									onChange={async (event) => {
										const file = fileFrom(event);
										if (!file) return;
										try {
											await importCsv(kind, file);
										} catch (error) {
											setMessage(
												`CSV import failed: ${error instanceof Error ? error.message : "Invalid CSV"}`,
											);
										}
									}}
								/>
							</label>
						),
					)}
				</div>
			</section>
		</div>
	);
}
