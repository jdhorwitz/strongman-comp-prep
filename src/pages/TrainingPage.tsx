import React from "react";
import { nanoid } from "nanoid";
import {
	detectPersonalRecords,
	epleyEstimatedOneRepMax,
	rpeAdjustedEpleyEstimatedOneRepMax,
	sessionVolume,
} from "../domain/index.ts";
import { useAppData } from "../storage/appStorage.tsx";
import type { EventCategory } from "../types/domain.ts";

const val = (event: { currentTarget: unknown }) =>
	(event.currentTarget as { value: string }).value;
const categories: EventCategory[] = [
	"deadlift",
	"press",
	"carry",
	"hold",
	"medley",
	"other",
];

export function TrainingPage() {
	const { data, dispatch } = useAppData();
	const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
	const [title, setTitle] = React.useState("Training");
	const [exercise, setExercise] = React.useState("Deadlift");
	const [category, setCategory] = React.useState<EventCategory>("deadlift");
	const [weightLb, setWeightLb] = React.useState("");
	const [reps, setReps] = React.useState("");
	const [rpe, setRpe] = React.useState("");
	const [timeSeconds, setTimeSeconds] = React.useState("");
	const [holdSeconds, setHoldSeconds] = React.useState("");
	const [distanceFt, setDistanceFt] = React.useState("");
	const prs = detectPersonalRecords(
		data.trainingSessions,
		data.profile.prepCycleStartDate,
		"prep-cycle",
	).slice(0, 6);
	const e1rm =
		weightLb && reps
			? epleyEstimatedOneRepMax(Number(weightLb), Number(reps))
			: null;
	const rpeE1rm =
		weightLb && reps && rpe
			? rpeAdjustedEpleyEstimatedOneRepMax(
					Number(weightLb),
					Number(reps),
					Number(rpe),
				)
			: null;
	return (
		<div className="grid two">
			<section className="card">
				<h2>Log training</h2>
				<form
					className="form"
					onSubmit={(event) => {
						event.preventDefault();
						dispatch({
							type: "addTrainingSession",
							session: {
								date,
								title,
								sessionType: category,
								exercises: [
									{
										id: nanoid(),
										name: exercise,
										eventCategory: category,
										sets: [
											{
												id: nanoid(),
												weightLb: weightLb ? Number(weightLb) : undefined,
												reps: reps ? Number(reps) : undefined,
												rpe: rpe ? Number(rpe) : undefined,
												timeSeconds: timeSeconds
													? Number(timeSeconds)
													: undefined,
												holdSeconds: holdSeconds
													? Number(holdSeconds)
													: undefined,
												distanceFt: distanceFt ? Number(distanceFt) : undefined,
												completed: true,
											},
										],
									},
								],
							},
						});
						setWeightLb("");
						setReps("");
						setRpe("");
						setTimeSeconds("");
						setHoldSeconds("");
						setDistanceFt("");
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
						Template
						<select
							value={exercise}
							onChange={(event) => {
								const next = val(event);
								setExercise(next);
								const found = data.competition.events.find(
									(item) => item.name === next,
								);
								if (found) setCategory(found.category);
							}}
						>
							<option>Deadlift</option>
							<option>Push Press</option>
							{data.competition.events.map((event) => (
								<option key={event.id}>{event.name}</option>
							))}
						</select>
					</label>
					<label>
						Category
						<select
							value={category}
							onChange={(event) => setCategory(val(event) as EventCategory)}
						>
							{categories.map((item) => (
								<option key={item}>{item}</option>
							))}
						</select>
					</label>
					<label>
						Title
						<input value={title} onChange={(event) => setTitle(val(event))} />
					</label>
					<label>
						Weight lb
						<input
							inputMode="decimal"
							value={weightLb}
							onChange={(event) => setWeightLb(val(event))}
						/>
					</label>
					<label>
						Reps
						<input
							inputMode="numeric"
							value={reps}
							onChange={(event) => setReps(val(event))}
						/>
					</label>
					<label>
						RPE 1–10
						<input
							inputMode="decimal"
							min="1"
							max="10"
							value={rpe}
							onChange={(event) => setRpe(val(event))}
						/>
					</label>
					<label>
						Distance ft
						<input
							inputMode="decimal"
							value={distanceFt}
							onChange={(event) => setDistanceFt(val(event))}
						/>
					</label>
					<label>
						Time seconds
						<input
							inputMode="decimal"
							value={timeSeconds}
							onChange={(event) => setTimeSeconds(val(event))}
						/>
					</label>
					<label>
						Hold seconds
						<input
							inputMode="decimal"
							value={holdSeconds}
							onChange={(event) => setHoldSeconds(val(event))}
						/>
					</label>
					<button className="btn">Save session</button>
					{e1rm ? (
						<p className="muted">
							Epley e1RM: {e1rm} lb{" "}
							{rpeE1rm ? `· RPE-adjusted: ${rpeE1rm} lb` : ""}
						</p>
					) : null}
				</form>
			</section>
			<section className="card">
				<h2>Prep-cycle PRs</h2>
				<div className="list">
					{prs.map((pr) => (
						<div className="list-item" key={pr.id}>
							{pr.label}
							<br />
							<span className="muted">{pr.date}</span>
						</div>
					))}
				</div>
			</section>
			<section className="card" style={{ gridColumn: "1 / -1" }}>
				<h2>Sessions</h2>
				<div className="list">
					{[...data.trainingSessions].reverse().map((session) => (
						<div className="list-item split" key={session.id}>
							<span>
								<strong>
									{session.date} · {session.title}
								</strong>
								<br />
								{session.exercises.map((item) => item.name).join(", ")} ·{" "}
								{sessionVolume(session).toLocaleString()} lb volume
							</span>
							<button
								className="btn danger"
								onClick={() =>
									dispatch({ type: "deleteTrainingSession", id: session.id })
								}
							>
								Delete
							</button>
						</div>
					))}
				</div>
			</section>
		</div>
	);
}
