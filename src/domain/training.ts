import type {
	TrainingExercise,
	TrainingSession,
	TrainingSet,
} from "../types/domain.ts";

const round = (value: number, digits = 1) => Number(value.toFixed(digits));

export function epleyEstimatedOneRepMax(
	weightLb: number,
	reps: number,
): number {
	return round(weightLb * (1 + reps / 30));
}

export function rpeAdjustedEpleyEstimatedOneRepMax(
	weightLb: number,
	reps: number,
	rpe: number,
): number {
	if (rpe < 1 || rpe > 10) throw new Error("RPE must be between 1 and 10");
	const repsInReserve = 10 - rpe;
	return epleyEstimatedOneRepMax(weightLb, reps + repsInReserve);
}

export function setVolume(set: TrainingSet): number {
	return set.weightLb && set.reps ? set.weightLb * set.reps : 0;
}

export function exerciseVolume(exercise: TrainingExercise): number {
	return exercise.sets.reduce((total, set) => total + setVolume(set), 0);
}

export function sessionVolume(session: TrainingSession): number {
	return session.exercises.reduce(
		(total, exercise) => total + exerciseVolume(exercise),
		0,
	);
}

export function topStrengthSet(session: TrainingSession) {
	return session.exercises
		.flatMap((exercise) => exercise.sets.map((set) => ({ exercise, set })))
		.filter(({ set }) => set.weightLb && set.reps)
		.sort((a, b) => (b.set.weightLb ?? 0) - (a.set.weightLb ?? 0))[0];
}
