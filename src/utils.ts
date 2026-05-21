/**
 * Utility functions for kimai-cli
 * Provides formatting, parsing, and display helpers
 */

import type { Timesheet, Project, Customer, Activity } from "./types.js";
import { TABLE_WIDTH, LABEL_WIDTH, MIN_GAP_MINUTES } from "./constants.js";
import pc from "picocolors";

// ═══════════════════════════════════════════════════════════════════════════════
// COLOR STYLES (using picocolors with NO_COLOR support)
// ═══════════════════════════════════════════════════════════════════════════════

const useColor =
	!process.env.NO_COLOR &&
	process.stdout.isTTY &&
	!process.argv.includes("--no-color");

function c(fn: (s: string) => string): (s: string) => string {
	return useColor ? fn : (s: string) => s;
}

/**
 * Reusable style functions with conditional color support
 */
export const styles = {
	cyan: c(pc.cyan),
	yellow: c(pc.yellow),
	green: c(pc.green),
	red: c(pc.red),
	magenta: c(pc.magenta),
	blue: c(pc.blue),
	gray: c(pc.gray),
	white: c(pc.white),
	bold: c(pc.bold),
	boldCyan: (text: string) => (useColor ? pc.bold(pc.cyan(text)) : text),
	boldGreen: (text: string) => (useColor ? pc.bold(pc.green(text)) : text),
	boldYellow: (text: string) => (useColor ? pc.bold(pc.yellow(text)) : text),
	bgGreen: c(pc.bgGreen),
	bgYellow: c(pc.bgYellow),
	reset: useColor ? pc.reset : "",
	colored: c,
};

/**
 * Parse and validate an ID number
 * @param value - String value to parse as ID
 * @param name - Name for error messages (default: "ID")
 * @returns Parsed positive integer
 * @throws Error if value is not a valid positive integer
 */
export function parseId(value: string, name = "ID"): number {
	const parsed = parseInt(value, 10);
	if (isNaN(parsed) || parsed < 0) {
		throw new Error(`Invalid ${name}: "${value}" is not a valid number`);
	}
	return parsed;
}

/**
 * Extract entity IDs from an array of entities that may be numbers or objects
 * @param entities - Array of numbers or objects with id property
 * @returns Array of extracted IDs
 */
export function extractEntityIds<T extends number | { id: number }>(
	entities: (T | null | undefined)[],
): number[] {
	return entities
		.filter((e): e is T => e !== null && e !== undefined)
		.map((e) => (typeof e === "number" ? e : e.id));
}

/**
 * Sanitize error message to prevent sensitive info leakage
 * @param message - Raw error message
 * @returns Sanitized message safe for display
 */
export function sanitizeError(message: string): string {
	return message
		.replace(/at\s+[\w.]+\s+\([^)]+\)/g, "[stack trace removed]")
		.replace(/\/[\w/.-]+\.(ts|js):\d+:\d+/g, "[file location removed]")
		.substring(0, 500);
}

/**
 * Format error with status code and hint for common cases
 * @param error - Object with optional statusCode and message
 * @returns Formatted error string with hints
 */
export function formatError(error: {
	statusCode?: number;
	message?: string;
}): string {
	const parts: string[] = [];

	if (error.statusCode) {
		parts.push(`[${error.statusCode}]`);
	}

	if (error.message) {
		parts.push(sanitizeError(error.message));
	}

	let hint = "";
	if (error.statusCode === 401) {
		hint = "Check your KIMAI_API_KEY in auth.json";
	} else if (error.statusCode === 403) {
		hint = "You don't have permission for this action";
	} else if (error.statusCode === 404) {
		hint = "The resource was not found";
	}

	if (hint) {
		parts.push(styles.yellow(`Hint: ${hint}`));
	}

	return parts.join(" ");
}

/**
 * Create a styled header box
 * @param title - Main header text
 * @param subtitle - Optional subtitle text
 * @returns Formatted box string
 */
export function styledHeader(title: string, subtitle?: string): string {
	const width = TABLE_WIDTH;
	const padding = Math.max(0, (width - title.length - 4) / 2);
	const padStr = " ".repeat(padding);

	let output = styles.boldCyan(`┌${"─".repeat(width)}┐\n`);
	output += styles.boldCyan(`│${padStr} ${title} ${padStr}│\n`);
	if (subtitle) {
		const subPad = Math.max(0, (width - subtitle.length - 4) / 2);
		output += `│${styles.gray(" ".repeat(subPad))} ${subtitle} ${styles.gray(" ".repeat(subPad))}│\n`;
	}
	output += styles.boldCyan(`└${"─".repeat(width)}┘`);
	return output;
}

/**
 * Create a styled info row with label and value
 * @param label - Row label
 * @param value - Row value
 * @param color - Optional color function (default: white)
 * @returns Formatted row string
 */
export function styledRow(
	label: string,
	value: string,
	color = styles.white,
): string {
	return `  ${styles.bold(label.padEnd(LABEL_WIDTH))}${color(value)}`;
}

/**
 * Styled success message with checkmark
 * @param msg - Message text
 * @returns Formatted success string
 */
export function styledSuccess(msg: string): string {
	return `${styles.green("✓")} ${msg}`;
}

/**
 * Styled error message with X mark
 * @param msg - Error message
 * @returns Formatted error string
 */
export function styledError(msg: string): string {
	return `${styles.red("✗")} ${msg}`;
}

/**
 * Styled warning message with warning sign
 * @param msg - Warning message
 * @returns Formatted warning string
 */
export function styledWarning(msg: string): string {
	return `${styles.yellow("⚠")} ${msg}`;
}

/**
 * Styled info message with arrow
 * @param msg - Info message
 * @returns Formatted info string
 */
export function styledInfo(msg: string): string {
	return `${styles.cyan("➤")} ${msg}`;
}

/**
 * Colorize duration based on length (green >= 8h, yellow >= 6h, red < 6h)
 * @param seconds - Duration in seconds
 * @returns Colored duration string
 */
export function colorizeDuration(seconds: number | null): string {
	if (!seconds) return styles.gray("-");
	const hours = seconds / 3600;
	if (hours >= 8) return styles.green(formatDuration(seconds));
	if (hours >= 6) return styles.yellow(formatDuration(seconds));
	return styles.red(formatDuration(seconds));
}

/**
 * Colorize status for pause detection
 * @param hasPause - Whether pause was detected
 * @param totalHours - Total hours in seconds
 * @returns Colored status string
 */
export function colorizeStatus(hasPause: boolean, totalHours: number): string {
	if (!hasPause) {
		const hours = Math.round((totalHours / 3600) * 10) / 10;
		return styles.red(`⚠ Keine Pause (${hours}h)`);
	}
	return styles.green(`✓ Pause vorhanden`);
}

/**
 * Get ISO calendar week number (KW in German)
 * @param date - Date to get week number for
 * @returns Week number (1-53)
 */
export function getCalendarWeek(date: Date): number {
	const d = new Date(
		Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
	);
	d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	const weekNo = Math.ceil(
		((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
	);
	return weekNo;
}

/**
 * Format duration in human-readable format
 * @param seconds - Duration in seconds
 * @returns Formatted duration (e.g., "1h 30m 45s")
 */
export function formatDuration(seconds: number | null): string {
	if (seconds === null || seconds === 0) return "-";

	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	if (hours === 0 && minutes === 0) return `${secs}s`;
	if (hours === 0) return `${minutes}m ${secs}s`;
	if (minutes === 0) return `${hours}h ${secs}s`;
	return `${hours}h ${minutes}m ${secs}s`;
}

/**
 * Format date in German locale
 * @param isoString - ISO date string
 * @returns Formatted date (e.g., "21.05.2026")
 */
export function formatDate(isoString: string | null): string {
	if (!isoString) return "-";

	try {
		const date = new Date(isoString);
		return date.toLocaleDateString("de-DE", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
	} catch {
		return isoString;
	}
}

/**
 * Format time in German locale
 * @param isoString - ISO datetime string
 * @returns Formatted time (e.g., "09:30")
 */
export function formatTime(isoString: string | null): string {
	if (!isoString) return "-";

	try {
		const date = new Date(isoString);
		return date.toLocaleTimeString("de-DE", {
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return isoString;
	}
}

/**
 * Format datetime in German locale
 * @param isoString - ISO datetime string
 * @returns Formatted datetime (e.g., "21.05.2026, 09:30")
 */
export function formatDateTime(isoString: string | null): string {
	if (!isoString) return "-";

	try {
		const date = new Date(isoString);
		return date.toLocaleString("de-DE", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return isoString;
	}
}

/**
 * Format a timesheet as a single-line display string
 * @param ts - Timesheet to format
 * @returns Formatted timesheet string
 */
export function formatTimesheet(ts: Timesheet): string {
	const projectName = getProjectName(ts.project);
	const activityName = getActivityName(ts.activity);
	const start = formatTime(ts.begin);
	const end = formatTime(ts.end);
	const duration = ts.duration || 0;
	const description = ts.description || "-";

	const durationStr = colorizeDuration(duration);
	const projectStr =
		projectName.length > 28
			? projectName.substring(0, 25) + "..."
			: projectName.padEnd(28);
	const activityStr =
		activityName.length > 18
			? activityName.substring(0, 15) + "..."
			: activityName.padEnd(18);

	return `${styles.gray(formatDate(ts.begin))} │ ${styles.white(start)}-${styles.white(end)} │ ${durationStr} │ ${styles.cyan(projectStr)} │ ${styles.magenta(activityStr)} │ ${description}`;
}

/**
 * Get project display name from project reference
 * @param project - Project ID or object
 * @returns Display name
 */
export function getProjectName(project: number | Project | null): string {
	if (!project) return "-";
	if (typeof project === "number") return `#${project}`;
	return project.name;
}

/**
 * Get activity display name from activity reference
 * @param activity - Activity ID or object
 * @returns Display name
 */
export function getActivityName(activity: number | Activity | null): string {
	if (!activity) return "-";
	if (typeof activity === "number") return `#${activity}`;
	return activity.name;
}

/**
 * Get customer display name from customer reference
 * @param customer - Customer ID or object
 * @returns Display name
 */
export function getCustomerName(customer: number | Customer | null): string {
	if (!customer) return "-";
	if (typeof customer === "number") return `#${customer}`;
	return customer.name;
}

/**
 * Extract entity ID from number or object with id property
 * @param entity - Entity as number or object
 * @returns Entity ID or null
 */
export function getEntityId(
	entity: number | { id: number } | null | undefined,
): number | null {
	if (typeof entity === "number") return entity;
	if (entity && typeof entity === "object" && "id" in entity)
		return (entity as { id: number }).id;
	return null;
}

/**
 * Print the header row for timesheet table
 */
export function printTimesheetHeader(): void {
	console.log(
		`${styles.gray("Date     | Start-End  | ")}${styles.bold("Duration")}${styles.gray(" | Project                       | Activity               | Description")}`,
	);
	console.log(
		styles.gray(
			"──────────+────────────+──────────+──────────────────────────────+────────────────────────+──────────────────────────────",
		),
	);
}

/**
 * Print multiple timesheets as a table
 * @param timesheets - Array of timesheets to print
 */
export function printTimesheets(timesheets: Timesheet[]): void {
	if (timesheets.length === 0) {
		console.log("No timesheets found.");
		return;
	}

	printTimesheetHeader();
	for (const ts of timesheets) {
		console.log(formatTimesheet(ts));
	}
}

/**
 * Print projects as a table
 * @param projects - Array of projects to print
 */
export function printProjects(projects: Project[]): void {
	if (projects.length === 0) {
		console.log("No projects found.");
		return;
	}

	console.log(
		"ID    | Name                                           | Customer",
	);
	console.log(
		"------+------------------------------------------------+-------------------------------",
	);
	for (const p of projects) {
		const customerName = getCustomerName(p.customer);
		console.log(
			`#${p.id.toString().padEnd(4)} | ${p.name.substring(0, 46).padEnd(46)} | ${customerName}`,
		);
	}
}

/**
 * Print activities as a table
 * @param activities - Array of activities to print
 */
export function printActivities(activities: Activity[]): void {
	if (activities.length === 0) {
		console.log("No activities found.");
		return;
	}

	console.log("ID    | Name");
	console.log("------+------------------------------------------------");
	for (const a of activities) {
		const projectInfo =
			a.project && typeof a.project !== "number" ? ` (${a.project.name})` : "";
		console.log(`#${a.id.toString().padEnd(4)} | ${a.name}${projectInfo}`);
	}
}

/**
 * Print customers as a table
 * @param customers - Array of customers to print
 */
export function printCustomers(customers: Customer[]): void {
	if (customers.length === 0) {
		console.log("No customers found.");
		return;
	}

	console.log(
		"ID    | Name                                           | Country | Currency",
	);
	console.log(
		"------+------------------------------------------------+---------+---------",
	);
	for (const c of customers) {
		console.log(
			`#${c.id.toString().padEnd(4)} | ${c.name.substring(0, 46).padEnd(46)} | ${c.country.padEnd(7)} | ${c.currency}`,
		);
	}
}

/**
 * Print tags as a comma-separated list
 * @param tags - Array of tag names
 */
export function printTags(tags: string[]): void {
	if (tags.length === 0) {
		console.log("No tags found.");
		return;
	}

	console.log("Tags:");
	console.log(tags.join(", "));
}

/**
 * Get current timestamp as ISO string
 * @returns ISO formatted current datetime
 */
export function nowIso(): string {
	return new Date().toISOString();
}

/**
 * Parse a date string to API format (YYYY-MM-DDTHH:MM:SS)
 * @param dateStr - Date string (YYYY-MM-DD or ISO format)
 * @returns Parsed date string
 * @throws Error if date format is invalid
 */
export function parseDate(dateStr: string): string {
	if (!dateStr || typeof dateStr !== "string") {
		throw new Error("parseDate: input must be a non-empty string");
	}
	if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
		return `${dateStr}T00:00:00`;
	}
	const date = new Date(dateStr);
	if (isNaN(date.getTime())) {
		throw new Error(`parseDate: invalid date format "${dateStr}"`);
	}
	return dateStr;
}

/**
 * Parse an end date string to API format (YYYY-MM-DDTHH:MM:SS)
 * Uses end of day for date-only strings
 * @param dateStr - Date string (YYYY-MM-DD or ISO format)
 * @returns Parsed date string
 * @throws Error if date format is invalid
 */
export function parseEndDate(dateStr: string): string {
	if (!dateStr || typeof dateStr !== "string") {
		throw new Error("parseEndDate: input must be a non-empty string");
	}
	if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
		return `${dateStr}T23:59:59`;
	}
	const date = new Date(dateStr);
	if (isNaN(date.getTime())) {
		throw new Error(`parseEndDate: invalid date format "${dateStr}"`);
	}
	return dateStr;
}

/**
 * Get date part (YYYY-MM-DD) from ISO string
 * @param isoString - ISO datetime string
 * @returns Date part or null
 */
export function getDatePart(isoString: string | null): string | null {
	if (!isoString) return null;
	try {
		return isoString.split("T")[0];
	} catch {
		return null;
	}
}

/**
 * Check if a day's timesheets have ANY gap between entries
 * @param timesheets - Array of timesheets for a day
 * @returns Gap analysis result with hasGap, gapMinutes, gapStart, gapEnd, totalHours
 */
export function checkDayGap(timesheets: Timesheet[]): {
	hasGap: boolean;
	gapMinutes?: number;
	gapStart?: string;
	gapEnd?: string;
	totalHours: number;
} {
	if (timesheets.length === 0) {
		return { hasGap: true, totalHours: 0 };
	}

	const sorted = [...timesheets].sort(
		(a, b) => new Date(a.begin).getTime() - new Date(b.begin).getTime(),
	);

	const entries = sorted.map((ts) => ({
		start: ts.begin,
		end: ts.end || ts.begin,
		duration: ts.duration || 0,
	}));

	const totalHours = entries.reduce((sum, e) => sum + e.duration, 0);

	for (let i = 0; i < sorted.length - 1; i++) {
		const currentEnd = sorted[i].end || sorted[i].begin;
		const nextStart = sorted[i + 1].begin;
		const gapMs =
			new Date(nextStart).getTime() - new Date(currentEnd).getTime();
		const gapMinutes = gapMs / 60000;

		// Only report significant gaps (>= MIN_GAP_MINUTES)
		if (gapMinutes >= MIN_GAP_MINUTES) {
			return {
				hasGap: true,
				gapMinutes,
				gapStart: currentEnd,
				gapEnd: nextStart,
				totalHours,
			};
		}
	}

	return { hasGap: false, totalHours };
}

/**
 * @deprecated Use checkDayGap instead
 */
export function checkDayBreak(timesheets: Timesheet[]) {
	const result = checkDayGap(timesheets);
	return {
		hasBreak: result.hasGap,
		missing: result.hasGap ? undefined : "gap",
		totalHours: result.totalHours,
		entries: [],
	};
}

/**
 * Format break warning message
 * @param check - Day gap check result
 * @param date - Date string for message
 * @returns Formatted warning or empty string
 */
export function formatBreakWarning(
	check: ReturnType<typeof checkDayBreak>,
	date: string,
): string {
	if (check.hasBreak) return "";

	const hours = Math.round(check.totalHours / 36) / 100;
	let msg = `\n⚠️  Warnung: Keine Pause am ${date} (${hours}h total)`;

	if (check.missing === "lunch") {
		msg += `\n   Tipp: 30min Mittagspause (12:00-12:30) einbauen!`;
	}

	return msg;
}

/**
 * Validate day and month are within valid range
 */
function isValidDate(day: number, month: number): boolean {
	return day >= 1 && day <= 31 && month >= 1 && month <= 12;
}

/**
 * Parse date range like "19.05-21.05" into array of dates
 * @param rangeStr - Range string (e.g., "19.05-21.05" or "19.05,20.05")
 * @returns Array of date strings (YYYY-MM-DD)
 */
export function parseDateRange(rangeStr: string): string[] {
	const dates: string[] = [];

	if (rangeStr.includes("-")) {
		const currentYear = new Date().getFullYear();

		const dotMatch = rangeStr.match(
			/^(\d{1,2})\.(\d{1,2})-(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?$/,
		);
		if (dotMatch) {
			const [, sDay, sMonth, eDay, eMonth, year] = dotMatch;
			const d = parseInt(sDay);
			const m = parseInt(sMonth);
			const ed = parseInt(eDay);
			const em = parseInt(eMonth);

			if (!isValidDate(d, m) || !isValidDate(ed, em)) {
				console.warn(`⚠️  Ungültiges Datum ignoriert: ${rangeStr}`);
				return dates;
			}

			const y = year ? parseInt(year) : currentYear;

			const startDate = new Date(y, m - 1, d);
			const endDate = new Date(y, em - 1, ed);

			if (startDate.getDate() !== d || startDate.getMonth() !== m - 1) {
				console.warn(`⚠️  Ungültiges Startdatum: ${sDay}.${sMonth}`);
				return dates;
			}
			if (endDate.getDate() !== ed || endDate.getMonth() !== em - 1) {
				console.warn(`⚠️  Ungültiges Enddatum: ${eDay}.${eMonth}`);
				return dates;
			}

			for (
				let current = new Date(startDate);
				current <= endDate;
				current.setDate(current.getDate() + 1)
			) {
				dates.push(current.toISOString().split("T")[0]);
			}
		}
	} else if (rangeStr.includes(",")) {
		const currentYear = new Date().getFullYear();
		for (const part of rangeStr.split(",")) {
			const trimmed = part.trim();
			if (trimmed.includes(".")) {
				const [day, month] = trimmed.split(".").map(Number);
				if (!isValidDate(day, month)) {
					continue;
				}
				const d = new Date(currentYear, month - 1, day);
				if (d.getDate() === day && d.getMonth() === month - 1) {
					dates.push(
						`${currentYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
					);
				}
			} else {
				dates.push(trimmed);
			}
		}
	} else {
		dates.push(rangeStr);
	}

	return dates;
}

/**
 * Parse time range like "09:00-18:00" into start and end times
 * @param timeStr - Time range string
 * @returns Parsed times or null if invalid
 */
export function parseTimeRange(
	timeStr: string,
): { start: string; end: string } | null {
	const match = timeStr.match(/^(\d{1,2}):?(\d{2})?-(\d{1,2}):?(\d{2})?$/);
	if (!match) {
		const simple = timeStr.match(/^(\d{1,2})-(\d{1,2})$/);
		if (simple) {
			return {
				start: `${String(simple[1]).padStart(2, "0")}:00:00`,
				end: `${String(simple[2]).padStart(2, "0")}:00:00`,
			};
		}
		return null;
	}

	const startHour = match[1].padStart(2, "0");
	const startMin = (match[2] || "00").padStart(2, "0");
	const endHour = (match[3] || match[1]).padStart(2, "0");
	const endMin = (match[4] || "00").padStart(2, "0");

	return {
		start: `${startHour}:${startMin}:00`,
		end: `${endHour}:${endMin}:00`,
	};
}

/**
 * Parse break time like "12:30" or "12:30-13:00"
 * @param breakStr - Break time string
 * @returns Parsed break times or null if invalid
 */
export function parseBreak(
	breakStr: string,
): { start: string; end: string } | null {
	const parts = breakStr.split("-");
	if (parts.length === 2) {
		return {
			start: `${parts[0]}:00`,
			end: `${parts[1]}:00`,
		};
	} else if (parts.length === 1) {
		return {
			start: `${parts[0]}:00`,
			end: `${parts[0].split(":")[0].padStart(2, "0")}:30:00`,
		};
	}
	return null;
}

/**
 * Calculate total duration from time range
 * @param startTime - Start time (HH:MM or HH:MM:SS)
 * @param endTime - End time (HH:MM or HH:MM:SS)
 * @returns Duration in seconds
 */
export function calculateDuration(startTime: string, endTime: string): number {
	const [startH, startM] = startTime.split(":").map(Number);
	const [endH, endM] = endTime.split(":").map(Number);
	const totalMinutes = endH * 60 + endM - (startH * 60 + startM);
	return totalMinutes * 60;
}
