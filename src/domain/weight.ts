import { differenceInCalendarDays, parseISO } from "date-fns";
import type { BodyweightEntry } from "../types/domain.ts";

export type RollingAveragePoint = {
	date: string;
	weightLb: number;
	sevenDayAverageLb: number;
};

const byDate = <T extends { date: string }>(a: T, b: T) =>
	a.date.localeCompare(b.date);
const round = (value: number, digits = 1) => Number(value.toFixed(digits));

export function sortByDate<T extends { date: string }>(entries: T[]): T[] {
	return [...entries].sort(byDate);
}

export function calculateSevenDayRollingAverage(
	entries: BodyweightEntry[],
): RollingAveragePoint[] {
	const sorted = sortByDate(entries);
	return sorted.map((entry) => {
		const entryDate = parseISO(entry.date);
		const window = sorted.filter((candidate) => {
			const diff = differenceInCalendarDays(
				entryDate,
				parseISO(candidate.date),
			);
			return diff >= 0 && diff <= 6;
		});
		const average =
			window.reduce((sum, item) => sum + item.weightLb, 0) / window.length;
		return {
			date: entry.date,
			weightLb: entry.weightLb,
			sevenDayAverageLb: round(average),
		};
	});
}

export function latestWeight(
	entries: BodyweightEntry[],
): BodyweightEntry | undefined {
	return sortByDate(entries).at(-1);
}

export function weeklyRateOfWeightLoss(
	entries: BodyweightEntry[],
): number | null {
	const rolling = calculateSevenDayRollingAverage(entries);
	const current = rolling.at(-1);
	if (!current) return null;
	const currentDate = parseISO(current.date);
	const prior = [...rolling]
		.reverse()
		.find(
			(point) =>
				differenceInCalendarDays(currentDate, parseISO(point.date)) >= 7,
		);
	if (!prior) return null;
	return round(current.sevenDayAverageLb - prior.sevenDayAverageLb);
}

export function poundsRemainingToRange(
	currentWeightLb: number,
	range: { minimum: number; maximum: number },
) {
	return {
		toUpper: round(Math.max(0, currentWeightLb - range.maximum)),
		toLower: round(Math.max(0, currentWeightLb - range.minimum)),
	};
}
