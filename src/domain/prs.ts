import { parseISO } from "date-fns";
import type { PrScope, TrainingSession, TrainingSet } from "../types/domain.ts";
import {
	epleyEstimatedOneRepMax,
	rpeAdjustedEpleyEstimatedOneRepMax,
} from "./training.ts";

export type PersonalRecord = {
	id: string;
	scope: PrScope;
	date: string;
	exercise: string;
	metric: string;
	value: number;
	label: string;
};

type SetWithContext = { date: string; exercise: string; set: TrainingSet };

function setsFromSessions(
	sessions: TrainingSession[],
	prepCycleStartDate?: string,
	scope: PrScope = "all-time",
): SetWithContext[] {
	return sessions
		.filter(
			(session) =>
				scope === "all-time" ||
				!prepCycleStartDate ||
				parseISO(session.date) >= parseISO(prepCycleStartDate),
		)
		.flatMap((session) =>
			session.exercises.flatMap((exercise) =>
				exercise.sets.map((set) => ({
					date: session.date,
					exercise: exercise.name,
					set,
				})),
			),
		);
}

function bestByExercise(
	sets: SetWithContext[],
	metric: string,
	valueFor: (set: TrainingSet) => number | null,
	higherIsBetter = true,
): PersonalRecord[] {
	const best = new Map<string, SetWithContext & { value: number }>();
	for (const item of sets) {
		const value = valueFor(item.set);
		if (value === null || Number.isNaN(value)) continue;
		const current = best.get(item.exercise);
		if (
			!current ||
			(higherIsBetter ? value > current.value : value < current.value)
		)
			best.set(item.exercise, { ...item, value });
	}
	return [...best.values()].map((item) => ({
		id: `${item.exercise}-${metric}`,
		scope: "all-time",
		date: item.date,
		exercise: item.exercise,
		metric,
		value: item.value,
		label: `${item.exercise} ${metric}: ${item.value}`,
	}));
}

export function detectPersonalRecords(
	sessions: TrainingSession[],
	prepCycleStartDate: string,
	scope: PrScope,
): PersonalRecord[] {
	const sets = setsFromSessions(sessions, prepCycleStartDate, scope);
	const records = [
		...bestByExercise(sets, "heaviest lift", (set) => set.weightLb ?? null),
		...bestByExercise(sets, "Epley e1RM", (set) =>
			set.weightLb && set.reps
				? epleyEstimatedOneRepMax(set.weightLb, set.reps)
				: null,
		),
		...bestByExercise(sets, "RPE-adjusted e1RM", (set) =>
			set.weightLb && set.reps && set.rpe
				? rpeAdjustedEpleyEstimatedOneRepMax(set.weightLb, set.reps, set.rpe)
				: null,
		),
		...bestByExercise(sets, "longest hold", (set) => set.holdSeconds ?? null),
		...bestByExercise(
			sets,
			"fastest carry",
			(set) => (set.timeSeconds && set.distanceFt ? set.timeSeconds : null),
			false,
		),
	];
	return records.map((record) => ({
		...record,
		id: `${scope}-${record.id}`,
		scope,
	}));
}
