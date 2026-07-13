import { describe, expect, it } from "vitest";
import {
	epleyEstimatedOneRepMax,
	rpeAdjustedEpleyEstimatedOneRepMax,
	sessionVolume,
} from "./training.ts";

describe("training calculations", () => {
	it("calculates Epley estimated 1RM", () => {
		expect(epleyEstimatedOneRepMax(375, 3)).toBe(412.5);
	});

	it("calculates RPE-adjusted Epley estimated 1RM", () => {
		expect(rpeAdjustedEpleyEstimatedOneRepMax(375, 3, 8)).toBe(437.5);
	});

	it("validates RPE range", () => {
		expect(() => rpeAdjustedEpleyEstimatedOneRepMax(375, 3, 11)).toThrow(
			"RPE must be between 1 and 10",
		);
	});

	it("calculates session volume", () => {
		expect(
			sessionVolume({
				id: "s",
				date: "2026-01-01",
				exercises: [
					{
						id: "e",
						name: "Deadlift",
						sets: [
							{ id: "1", weightLb: 300, reps: 5 },
							{ id: "2", weightLb: 350, reps: 3 },
						],
					},
				],
			}),
		).toBe(2550);
	});
});
