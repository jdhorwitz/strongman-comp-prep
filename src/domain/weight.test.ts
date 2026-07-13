import { describe, expect, it } from "vitest";
import {
	calculateSevenDayRollingAverage,
	poundsRemainingToRange,
	weeklyRateOfWeightLoss,
} from "./weight.ts";

const entries = Array.from({ length: 8 }, (_, index) => ({
	id: String(index),
	date: `2026-01-0${index + 1}`,
	weightLb: 240 - index,
}));

describe("weight calculations", () => {
	it("calculates partial and seven-day rolling averages", () => {
		const rolling = calculateSevenDayRollingAverage(entries);
		expect(rolling[0].sevenDayAverageLb).toBe(240);
		expect(rolling[6].sevenDayAverageLb).toBe(237);
		expect(rolling[7].sevenDayAverageLb).toBe(236);
	});

	it("calculates weekly rate from rolling averages", () => {
		expect(weeklyRateOfWeightLoss(entries)).toBe(-4);
	});

	it("calculates pounds remaining to target range", () => {
		expect(
			poundsRemainingToRange(240.6, { minimum: 223, maximum: 225 }),
		).toEqual({ toUpper: 15.6, toLower: 17.6 });
	});
});
