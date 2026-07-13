import React from "react";
import { WeightTrendChart } from "../components/charts/WeightTrendChart.tsx";
import {
	latestWeight,
	poundsRemainingToRange,
	weeklyRateOfWeightLoss,
} from "../domain/weight.ts";
import { useAppData } from "../storage/appStorage.tsx";

export function BodyweightPage() {
	const { data, dispatch, isSupabaseConfigured, userEmail } = useAppData();
	const canEdit = !isSupabaseConfigured || Boolean(userEmail);
	const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
	const [weightLb, setWeightLb] = React.useState("");
	const [bodyFatPercent, setBodyFatPercent] = React.useState("");
	const [notes, setNotes] = React.useState("");
	const latest = latestWeight(data.bodyweightEntries);
	const remaining = latest
		? poundsRemainingToRange(latest.weightLb, data.profile.targetPreCutRangeLb)
		: null;
	return (
		<div className="grid two">
			<section className="card">
				<h2>Log bodyweight</h2>
				{canEdit ? null : (
					<p className="muted">
						Public view is read-only. Sign in under Settings to add, update, or
						delete weigh-ins.
					</p>
				)}
				<form
					className="form"
					onSubmit={(event) => {
						event.preventDefault();
						if (!canEdit) return;
						dispatch({
							type: "addBodyweight",
							entry: {
								date,
								weightLb: Number(weightLb),
								bodyFatPercent: bodyFatPercent
									? Number(bodyFatPercent)
									: undefined,
								notes,
							},
						});
						setWeightLb("");
						setBodyFatPercent("");
						setNotes("");
					}}
				>
					<label>
						Date
						<input
							type="date"
							value={date}
							onChange={(event) =>
								setDate(
									(event.currentTarget as unknown as { value: string }).value,
								)
							}
							required
						/>
					</label>
					<label>
						Weight lb
						<input
							inputMode="decimal"
							value={weightLb}
							onChange={(event) =>
								setWeightLb(
									(event.currentTarget as unknown as { value: string }).value,
								)
							}
							required
						/>
					</label>
					<label>
						Body fat %
						<input
							inputMode="decimal"
							value={bodyFatPercent}
							onChange={(event) =>
								setBodyFatPercent(
									(event.currentTarget as unknown as { value: string }).value,
								)
							}
						/>
					</label>
					<label>
						Notes
						<textarea
							value={notes}
							onChange={(event) =>
								setNotes(
									(event.currentTarget as unknown as { value: string }).value,
								)
							}
						/>
					</label>
					<button className="btn" disabled={!canEdit}>
						Save weigh-in
					</button>
				</form>
			</section>
			<section className="card">
				<h2>Cut status</h2>
				<p>
					<strong>{latest?.weightLb ?? "—"} lb</strong> latest
				</p>
				<p className="muted">
					Weekly rate:{" "}
					{weeklyRateOfWeightLoss(data.bodyweightEntries) ?? "Need 8+ days"}{" "}
					lb/wk
				</p>
				{remaining ? (
					<p className="muted">
						{remaining.toUpper} lb to 225 / {remaining.toLower} lb to 223
					</p>
				) : null}
			</section>
			<section className="card" style={{ gridColumn: "1 / -1" }}>
				<h2>Trend</h2>
				<WeightTrendChart entries={data.bodyweightEntries} />
			</section>
			<section className="card" style={{ gridColumn: "1 / -1" }}>
				<h2>Entries</h2>
				{canEdit ? null : (
					<p className="muted">
						You are viewing Josh’s public progress. Delete/edit controls are
						only available after sign-in.
					</p>
				)}
				<div className="list">
					{[...data.bodyweightEntries].reverse().map((entry) => (
						<div className="list-item split" key={entry.id}>
							<span>
								<strong>{entry.date}</strong>
								<br />
								{entry.weightLb} lb
								{entry.bodyFatPercent
									? ` · ${entry.bodyFatPercent}% body fat`
									: ""}
								{entry.source ? (
									<span className="muted"> · {entry.source}</span>
								) : null}
								{entry.notes ? (
									<span className="muted"> · {entry.notes}</span>
								) : null}
							</span>
							{canEdit ? (
								<button
									className="btn danger"
									onClick={() =>
										dispatch({ type: "deleteBodyweight", id: entry.id })
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
