import { describe, expect, it } from "vitest";
import { detectPersonalRecords } from "./prs.ts";

describe("PR detection", () => {
	it("detects all-time and prep-cycle records", () => {
		const sessions = [
			{
				id: "old",
				date: "2025-12-01",
				title: "old",
				exercises: [
					{
						id: "e1",
						name: "Deadlift",
						sets: [{ id: "s1", weightLb: 500, reps: 1 }],
					},
				],
			},
			{
				id: "new",
				date: "2026-01-02",
				title: "new",
				exercises: [
					{
						id: "e2",
						name: "Deadlift",
						sets: [{ id: "s2", weightLb: 375, reps: 3, rpe: 8 }],
					},
				],
			},
		];
		expect(
			detectPersonalRecords(sessions, "2026-01-01", "all-time").find(
				(pr) => pr.metric === "heaviest lift",
			)?.value,
		).toBe(500);
		expect(
			detectPersonalRecords(sessions, "2026-01-01", "prep-cycle").find(
				(pr) => pr.metric === "heaviest lift",
			)?.value,
		).toBe(375);
	});
});
