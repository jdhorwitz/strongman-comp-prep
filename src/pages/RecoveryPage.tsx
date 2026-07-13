import React from "react";
import { useAppData } from "../storage/appStorage.tsx";

const val = (event: { currentTarget: unknown }) =>
	(event.currentTarget as { value: string }).value;

export function RecoveryPage() {
	const { data, dispatch, isSupabaseConfigured, userEmail } = useAppData();
	const canEdit = !isSupabaseConfigured || Boolean(userEmail);
	const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
	const [recoveryScore, setRecoveryScore] = React.useState("");
	const [fatigueScore, setFatigueScore] = React.useState("");
	const [sleepHours, setSleepHours] = React.useState("");
	const [painArea, setPainArea] = React.useState("");
	const [painSeverity, setPainSeverity] = React.useState("");
	const [mobilityWork, setMobilityWork] = React.useState("");
	return (
		<div className="grid two">
			<section className="card">
				<h2>Log recovery</h2>
				{canEdit ? null : (
					<p className="muted">
						Public view is read-only. Sign in under Settings to add, update, or
						delete recovery entries.
					</p>
				)}
				<form
					className="form"
					onSubmit={(event) => {
						event.preventDefault();
						if (!canEdit) return;
						dispatch({
							type: "addRecovery",
							entry: {
								date,
								recoveryScore: recoveryScore
									? Number(recoveryScore)
									: undefined,
								fatigueScore: fatigueScore ? Number(fatigueScore) : undefined,
								sleepHours: sleepHours ? Number(sleepHours) : undefined,
								painAreas: painArea
									? [{ area: painArea, severity: Number(painSeverity || 1) }]
									: [],
								mobilityWork,
							},
						});
						setRecoveryScore("");
						setFatigueScore("");
						setSleepHours("");
						setPainArea("");
						setPainSeverity("");
						setMobilityWork("");
					}}
				>
					<label>
						Date
						<input
							type="date"
							value={date}
							onChange={(event) => setDate(val(event))}
							required
						/>
					</label>
					<label>
						Recovery 1–10
						<input
							inputMode="numeric"
							min="1"
							max="10"
							value={recoveryScore}
							onChange={(event) => setRecoveryScore(val(event))}
						/>
					</label>
					<label>
						Fatigue 1–10
						<input
							inputMode="numeric"
							min="1"
							max="10"
							value={fatigueScore}
							onChange={(event) => setFatigueScore(val(event))}
						/>
					</label>
					<label>
						Sleep hours
						<input
							inputMode="decimal"
							value={sleepHours}
							onChange={(event) => setSleepHours(val(event))}
						/>
					</label>
					<label>
						Pain area
						<input
							value={painArea}
							onChange={(event) => setPainArea(val(event))}
							placeholder="low back, knee, shoulder"
						/>
					</label>
					<label>
						Pain severity 1–10
						<input
							inputMode="numeric"
							min="1"
							max="10"
							value={painSeverity}
							onChange={(event) => setPainSeverity(val(event))}
						/>
					</label>
					<label>
						Mobility work
						<textarea
							value={mobilityWork}
							onChange={(event) => setMobilityWork(val(event))}
						/>
					</label>
					<button className="btn" disabled={!canEdit}>
						Save recovery
					</button>
				</form>
			</section>
			<section className="card">
				<h2>Recovery log</h2>
				{canEdit ? null : (
					<p className="muted">
						You are viewing Josh’s public recovery data. Delete/edit controls
						are only available after sign-in.
					</p>
				)}
				<div className="list">
					{[...data.recoveryEntries].reverse().map((entry) => (
						<div className="list-item split" key={entry.id}>
							<span>
								<strong>{entry.date}</strong>
								{entry.source ? (
									<span className="muted"> · {entry.source}</span>
								) : null}
								<br />
								Recovery {entry.recoveryScore ?? "—"} · Fatigue{" "}
								{entry.fatigueScore ?? "—"} · Sleep {entry.sleepHours ?? "—"}h
								<br />
								<span className="muted">
									Readiness {entry.readinessScore ?? "—"} · Sleep score{" "}
									{entry.sleepScore ?? "—"} · Activity{" "}
									{entry.activityScore ?? "—"}
								</span>
								<br />
								<span className="muted">
									RHR {entry.restingHeartRate ?? "—"} · HRV {entry.hrvMs ?? "—"}
									ms
									{entry.respiratoryRate
										? ` · Resp ${entry.respiratoryRate}`
										: ""}
									{entry.bodyTemperatureDeviation
										? ` · Temp ${entry.bodyTemperatureDeviation}`
										: ""}
								</span>
								<br />
								<span className="muted">
									{entry.painAreas
										?.map((pain) => `${pain.area} ${pain.severity}/10`)
										.join(", ")}
								</span>
							</span>
							{canEdit ? (
								<button
									className="btn danger"
									onClick={() =>
										dispatch({ type: "deleteRecovery", id: entry.id })
									}
								>
									Delete
								</button>
							) : null}
						</div>
					))}
				</div>
			</section>
		</div>
	);
}
