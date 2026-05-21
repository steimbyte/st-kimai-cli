import { describe, it, expect } from "vitest";
import {
	formatDuration,
	parseDate,
	getEntityId,
	parseId,
	parseDateRange,
	getCalendarWeek,
	formatDate,
} from "./utils";

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

describe("parseId", () => {
	it("should parse valid ID", () => {
		expect(parseId("42")).toBe(42);
	});
	it("should throw on invalid ID", () => {
		expect(() => parseId("abc")).toThrow();
		expect(() => parseId("")).toThrow();
	});
	it("should throw on negative ID", () => {
		expect(() => parseId("-5")).toThrow();
	});
});

describe("parseDateRange", () => {
	it("should parse DD.MM-DD.MM format", () => {
		const dates = parseDateRange("19.05-21.05");
		expect(dates).toHaveLength(3);
		expect(dates[0]).toBe("2026-05-18");
	});
	it("should reject invalid dates", () => {
		const dates = parseDateRange("32.05-35.05");
		expect(dates).toHaveLength(0);
	});
	it("should parse comma-separated dates", () => {
		const dates = parseDateRange("19.05,20.05,21.05");
		expect(dates).toHaveLength(3);
	});
});

describe("getCalendarWeek", () => {
	it("should return week 21 for May 21 2026", () => {
		const date = new Date("2026-05-21");
		expect(getCalendarWeek(date)).toBe(21);
	});
});

describe("formatDate", () => {
	it("should format German date", () => {
		const result = formatDate("2026-05-21T12:00:00");
		expect(result).toBe("21.05.2026");
	});
});
