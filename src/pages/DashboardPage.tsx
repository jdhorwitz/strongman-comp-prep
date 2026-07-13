import React from "react";
import { format } from "date-fns";
import { MetricCard } from "../components/cards/MetricCard.tsx";
import { WeightTrendChart } from "../components/charts/WeightTrendChart.tsx";
import {
	daysRemainingUntil,
	latestWeight,
	poundsRemainingToRange,
	weeklyRateOfWeightLoss,
	averageNutrition,
	sessionVolume,
	detectPersonalRecords,
} from "../domain/index.ts";
import { useAppData } from "../storage/appStorage.tsx";

export function DashboardPage() {
	const { data } = useAppData();
	const latest = latestWeight(data.bodyweightEntries);
	const currentWeight = latest?.weightLb ?? data.profile.currentWeightLb ?? 0;
	const remaining = poundsRemainingToRange(
		currentWeight,
		data.profile.targetPreCutRangeLb,
	);
	const rate = weeklyRateOfWeightLoss(data.bodyweightEntries);
	const nutrition = averageNutrition(data.nutritionEntries, 7);
	const lastSession = [...data.trainingSessions]
		.sort((a, b) => a.date.localeCompare(b.date))
		.at(-1);
	const allTimePrs = detectPersonalRecords(
		data.trainingSessions,
		data.profile.prepCycleStartDate,
		"all-time",
	).slice(0, 3);
	return (
		<div className="grid">
			<div className="grid three">
				<MetricCard
					label="Days to compete"
					value={daysRemainingUntil(data.competition.date)}
					detail={format(
						new Date(`${data.competition.date}T00:00:00`),
						"MMM d, yyyy",
					)}
				/>
				<MetricCard
					label="Latest weight"
					value={`${currentWeight} lb`}
					detail={`${remaining.toUpper} lb to 225 / ${remaining.toLower} lb to 223`}
				/>
				<MetricCard
					label="Weekly rate"
					value={rate === null ? "Need data" : `${rate} lb/wk`}
					tone={rate !== null && rate <= -0.5 ? "success" : undefined}
				/>
				<MetricCard
					label="7-day calories"
					value={nutrition ? nutrition.calories : "—"}
					detail={
						nutrition
							? `${nutrition.proteinG}P / ${nutrition.carbsG}C / ${nutrition.fatG}F`
							: "Log nutrition to start trends"
					}
				/>
				<MetricCard
					label="Last session"
					value={lastSession?.title ?? "—"}
					detail={
						lastSession
							? `${lastSession.date} · ${sessionVolume(lastSession).toLocaleString()} lb volume`
							: "Log training to start"
					}
				/>
				<MetricCard
					label="Prep target"
					value="223–225 lb"
					detail="Masters Men 220 pre-cut range"
				/>
			</div>
			<section className="card">
				<h2>Weight trend</h2>
				<WeightTrendChart entries={data.bodyweightEntries} />
			</section>
			<section className="card">
				<h2>Top PRs</h2>
				<div className="list">
					{allTimePrs.map((pr) => (
						<div className="list-item" key={pr.id}>
							<strong>{pr.label}</strong>
							<br />
							<span className="muted">
								{pr.date} · {pr.scope}
							</span>
						</div>
					))}
				</div>
			</section>
		</div>
	);
}
