import { differenceInCalendarDays, parseISO, startOfToday } from "date-fns";

export function daysRemainingUntil(
	date: string,
	today = startOfToday(),
): number {
	return differenceInCalendarDays(parseISO(date), today);
}
