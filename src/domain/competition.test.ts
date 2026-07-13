import { describe, expect, it } from "vitest";
import { parseISO } from "date-fns";
import { daysRemainingUntil } from "./competition.ts";

describe("competition calculations", () => {
	it("calculates date-only days remaining", () => {
		expect(daysRemainingUntil("2026-09-26", parseISO("2026-09-20"))).toBe(6);
	});
});
