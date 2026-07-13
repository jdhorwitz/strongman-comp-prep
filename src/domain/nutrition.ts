import { differenceInCalendarDays, parseISO } from "date-fns";
import type { NutritionEntry } from "../types/domain.ts";

const round = (value: number) => Number(value.toFixed(0));

export type MacroAverages = {
	calories: number;
	proteinG: number;
	carbsG: number;
	fatG: number;
	days: number;
};

export function averageNutrition(
	entries: NutritionEntry[],
	days = 7,
	anchorDate?: string,
): MacroAverages | null {
	if (entries.length === 0) return null;
	const latestDate =
		anchorDate ??
		[...entries].sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.date;
	if (!latestDate) return null;
	const anchor = parseISO(latestDate);
	const window = entries.filter((entry) => {
		const diff = differenceInCalendarDays(anchor, parseISO(entry.date));
		return diff >= 0 && diff < days;
	});
	if (window.length === 0) return null;
	return {
		calories: round(
			window.reduce((sum, entry) => sum + entry.calories, 0) / window.length,
		),
		proteinG: round(
			window.reduce((sum, entry) => sum + entry.proteinG, 0) / window.length,
		),
		carbsG: round(
			window.reduce((sum, entry) => sum + entry.carbsG, 0) / window.length,
		),
		fatG: round(
			window.reduce((sum, entry) => sum + entry.fatG, 0) / window.length,
		),
		days: window.length,
	};
}
