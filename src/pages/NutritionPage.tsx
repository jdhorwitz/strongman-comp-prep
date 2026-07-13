import React from "react";
import { averageNutrition } from "../domain/nutrition.ts";
import { useAppData } from "../storage/appStorage.tsx";

const val = (event: { currentTarget: unknown }) =>
	(event.currentTarget as { value: string }).value;

export function NutritionPage() {
	const { data, dispatch } = useAppData();
	const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
	const [calories, setCalories] = React.useState("");
	const [proteinG, setProteinG] = React.useState("");
	const [carbsG, setCarbsG] = React.useState("");
	const [fatG, setFatG] = React.useState("");
	const [notes, setNotes] = React.useState("");
	const avg = averageNutrition(data.nutritionEntries, 7);
	return (
		<div className="grid two">
			<section className="card">
				<h2>Log nutrition & meals</h2>
				<form
					className="form"
					onSubmit={(event) => {
						event.preventDefault();
						dispatch({
							type: "addNutrition",
							entry: {
								date,
								calories: Number(calories),
								proteinG: Number(proteinG),
								carbsG: Number(carbsG),
								fatG: Number(fatG),
								notes,
							},
						});
						setCalories("");
						setProteinG("");
						setCarbsG("");
						setFatG("");
						setNotes("");
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
						Calories
						<input
							inputMode="numeric"
							value={calories}
							onChange={(event) => setCalories(val(event))}
							required
						/>
					</label>
					<label>
						Protein g
						<input
							inputMode="numeric"
							value={proteinG}
							onChange={(event) => setProteinG(val(event))}
							required
						/>
					</label>
					<label>
						Carbs g
						<input
							inputMode="numeric"
							value={carbsG}
							onChange={(event) => setCarbsG(val(event))}
							required
						/>
					</label>
					<label>
						Fat g
						<input
							inputMode="numeric"
							value={fatG}
							onChange={(event) => setFatG(val(event))}
							required
						/>
					</label>
					<label>
						Meals / notes
						<textarea
							value={notes}
							onChange={(event) => setNotes(val(event))}
							placeholder="Meals: egg breakfast, yogurt bowl, Chipotle bowl. Fiber estimate: 32g."
						/>
					</label>
					<button className="btn">Save nutrition</button>
				</form>
			</section>
			<section className="card">
				<h2>7-day average</h2>
				{avg ? (
					<p>
						<strong>{avg.calories}</strong> kcal
						<br />
						{avg.proteinG}g protein · {avg.carbsG}g carbs · {avg.fatG}g fat
						<br />
						<span className="muted">Based on {avg.days} logged days</span>
					</p>
				) : (
					<p className="muted">No nutrition entries yet.</p>
				)}
			</section>
			<section className="card" style={{ gridColumn: "1 / -1" }}>
				<h2>Daily meals</h2>
				<div className="list">
					{[...data.nutritionEntries].reverse().map((entry) => (
						<div className="list-item split" key={entry.id}>
							<div>
								<strong>{entry.date}</strong>
								<br />
								{entry.calories} kcal · {entry.proteinG}P/{entry.carbsG}C/
								{entry.fatG}F
								{entry.notes ? (
									<p className="meal-notes">{entry.notes}</p>
								) : (
									<p className="muted">No meal details saved for this day.</p>
								)}
							</div>
							<button
								className="btn danger"
								onClick={() =>
									dispatch({ type: "deleteNutrition", id: entry.id })
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
