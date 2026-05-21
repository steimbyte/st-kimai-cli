import { describe, it, expect } from "vitest";
import { formatDuration, parseDate, getEntityId } from "./utils";

describe("formatDuration", () => {
	it("should format 0 seconds", () => {
		expect(formatDuration(0)).toBe("-");
	});
	it("should format seconds only", () => {
		expect(formatDuration(45)).toBe("45s");
	});
	it("should format minutes and seconds", () => {
		expect(formatDuration(125)).toBe("2m 5s");
	});
	it("should format hours, minutes, seconds", () => {
		expect(formatDuration(3723)).toBe("1h 2m 3s");
	});
});

describe("parseDate", () => {
	it("should add T00:00:00 to YYYY-MM-DD", () => {
		expect(parseDate("2026-05-21")).toBe("2026-05-21T00:00:00");
	});
	it("should pass through ISO strings", () => {
		expect(parseDate("2026-05-21T09:30:00+0200")).toBe(
			"2026-05-21T09:30:00+0200",
		);
	});
});

describe("getEntityId", () => {
	it("should return number as-is", () => {
		expect(getEntityId(42)).toBe(42);
	});
	it("should extract id from object", () => {
		expect(getEntityId({ id: 42, name: "test" } as { id: number })).toBe(42);
	});
	it("should return null for null/undefined", () => {
		expect(getEntityId(null)).toBe(null);
		expect(getEntityId(undefined)).toBe(null);
	});
});
