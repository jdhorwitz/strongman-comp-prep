import { describe, expect, it } from "vitest";
import { averageNutrition } from "./nutrition.ts";

describe("nutrition calculations", () => {
	it("averages macros over a trailing window", () => {
		expect(
			averageNutrition(
				[
					{
						id: "1",
						date: "2026-01-01",
						calories: 2500,
						proteinG: 200,
						carbsG: 250,
						fatG: 70,
					},
					{
						id: "2",
						date: "2026-01-02",
						calories: 2700,
						proteinG: 220,
						carbsG: 280,
						fatG: 80,
					},
				],
				7,
			),
		).toEqual({
			calories: 2600,
			proteinG: 210,
			carbsG: 265,
			fatG: 75,
			days: 2,
		});
	});
});
