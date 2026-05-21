import type { Timesheet, Project, Customer, Activity } from "./types.js";

// ═══════════════════════════════════════════════════════════════════════════════
// ANSI COLOR STYLES
// ═══════════════════════════════════════════════════════════════════════════════

export const styles = {
	// Colors
	cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
	yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
	green: (text: string) => `\x1b[32m${text}\x1b[0m`,
	red: (text: string) => `\x1b[31m${text}\x1b[0m`,
	magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
	blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
	gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
	white: (text: string) => `\x1b[97m${text}\x1b[0m`,

	// Bold
	bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
	boldCyan: (text: string) => `\x1b[1m\x1b[36m${text}\x1b[0m`,
	boldGreen: (text: string) => `\x1b[1m\x1b[32m${text}\x1b[0m`,
	boldYellow: (text: string) => `\x1b[1m\x1b[33m${text}\x1b[0m`,

	// Backgrounds
	bgGreen: (text: string) => `\x1b[42m${text}\x1b[0m`,
	bgYellow: (text: string) => `\x1b[43m${text}\x1b[0m`,

	// Reset
	reset: "\x1b[0m",
};

/**
 * Create a styled header box
 */
export function styledHeader(title: string, subtitle?: string): string {
	const width = 70;
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
 * Create a styled info row
 */
export function styledRow(
	label: string,
	value: string,
	color = styles.white,
): string {
	const labelWidth = 14;
	return `  ${styles.bold(label.padEnd(labelWidth))}${color(value)}`;
}

/**
 * Create a divider line
 */
export function styledDivider(color = styles.gray): string {
	return color("─".repeat(70));
}

/**
 * Styled success message
 */
export function styledSuccess(msg: string): string {
	return `${styles.green("✓")} ${msg}`;
}

/**
 * Styled error message
 */
export function styledError(msg: string): string {
	return `${styles.red("✗")} ${msg}`;
}

/**
 * Styled warning message
 */
export function styledWarning(msg: string): string {
	return `${styles.yellow("⚠")} ${msg}`;
}

/**
 * Styled info message
 */
export function styledInfo(msg: string): string {
	return `${styles.cyan("➤")} ${msg}`;
}

/**
 * Colorize duration based on length
 */
export function colorizeDuration(seconds: number | null): string {
	if (!seconds) return styles.gray("-");
	const hours = seconds / 3600;
	if (hours >= 8) return styles.green(formatDuration(seconds));
	if (hours >= 6) return styles.yellow(formatDuration(seconds));
	return styles.red(formatDuration(seconds));
}

/**
 * Colorize status (pause detection)
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

export function formatTimesheet(ts: Timesheet): string {
	const projectName = getProjectName(ts.project);
	const activityName = getActivityName(ts.activity);
	const date = formatDate(ts.begin);
	const start = formatTime(ts.begin);
	const end = formatTime(ts.end);
	const duration = ts.duration || 0;
	const description = ts.description || "-";

	// Colorize based on duration
	const durationStr = colorizeDuration(duration);
	const projectStr =
		projectName.length > 28
			? projectName.substring(0, 25) + "..."
			: projectName.padEnd(28);
	const activityStr =
		activityName.length > 18
			? activityName.substring(0, 15) + "..."
			: activityName.padEnd(18);

	return `${styles.gray(date)} │ ${styles.white(start)}-${styles.white(end)} │ ${durationStr} │ ${styles.cyan(projectStr)} │ ${styles.magenta(activityStr)} │ ${description}`;
}

export function getProjectName(project: number | Project | null): string {
	if (!project) return "-";
	if (typeof project === "number") return `#${project}`;
	return project.name;
}

export function getActivityName(activity: number | Activity | null): string {
	if (!activity) return "-";
	if (typeof activity === "number") return `#${activity}`;
	return activity.name;
}

export function getCustomerName(customer: number | Customer | null): string {
	if (!customer) return "-";
	if (typeof customer === "number") return `#${customer}`;
	return customer.name;
}

export function getEntityId(
	entity: number | { id: number } | null | undefined,
): number | null {
	if (typeof entity === "number") return entity;
	if (entity && typeof entity === "object" && "id" in entity)
		return (entity as { id: number }).id;
	return null;
}

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

export function printTags(tags: string[]): void {
	if (tags.length === 0) {
		console.log("No tags found.");
		return;
	}

	console.log("Tags:");
	console.log(tags.join(", "));
}

export function nowIso(): string {
	return new Date().toISOString();
}

export function todayIso(): string {
	const now = new Date();
	return now.toISOString().split("T")[0];
}

export function parseDate(dateStr: string): string {
	// Support formats: YYYY-MM-DD, YYYY-MM-DDTHH:MM:SS
	if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
		return `${dateStr}T00:00:00`;
	}
	return dateStr;
}

export function parseEndDate(dateStr: string): string {
	// For end dates, use end of day
	if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
		return `${dateStr}T23:59:59`;
	}
	return dateStr;
}

/**
 * Get date part (YYYY-MM-DD) from ISO string
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
 * Get time part (HH:MM) from ISO string
 */
export function getTimePart(isoString: string | null): string | null {
	if (!isoString) return null;
	try {
		const time = isoString.split("T")[1];
		return time ? time.substring(0, 5) : null;
	} catch {
		return null;
	}
}

/**
 * Check if a day's timesheets have ANY gap (empty section) between entries
 * Returns { hasGap: true } if there's empty time, { hasGap: false } if entries are back-to-back
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

	// Sort by start time
	const sorted = [...timesheets].sort(
		(a, b) => new Date(a.begin).getTime() - new Date(b.begin).getTime(),
	);

	const entries = sorted.map((ts) => ({
		start: ts.begin,
		end: ts.end || ts.begin,
		duration: ts.duration || 0,
	}));

	const totalHours = entries.reduce((sum, e) => sum + e.duration, 0);

	// Check for any gap between consecutive entries
	for (let i = 0; i < sorted.length - 1; i++) {
		const currentEnd = sorted[i].end || sorted[i].begin;
		const nextStart = sorted[i + 1].begin;
		const gapMs =
			new Date(nextStart).getTime() - new Date(currentEnd).getTime();
		const gapMinutes = gapMs / 60000;

		if (gapMinutes > 0) {
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

/** @deprecated Use checkDayGap instead */
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
 * Parse date range like "19.05-21.05" or "19.05-21.05.2026" into array of dates
 */
export function parseDateRange(rangeStr: string): string[] {
	const dates: string[] = [];

	if (rangeStr.includes("-")) {
		const currentYear = new Date().getFullYear();

		// Handle DD.MM-DD.MM format
		const dotMatch = rangeStr.match(
			/^(\d{1,2})\.(\d{1,2})-(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?$/,
		);
		if (dotMatch) {
			const [, sDay, sMonth, eDay, eMonth, year] = dotMatch;
			const d = parseInt(sDay);
			const m = parseInt(sMonth);
			const ed = parseInt(eDay);
			const em = parseInt(eMonth);

			// Validate dates
			if (!isValidDate(d, m) || !isValidDate(ed, em)) {
				console.warn(`⚠️  Ungültiges Datum ignoriert: ${rangeStr}`);
				return dates;
			}

			const y = year ? parseInt(year) : currentYear;

			// Use proper Date math to handle month boundaries
			const startDate = new Date(y, m - 1, d);
			const endDate = new Date(y, em - 1, ed);

			// Validate the dates are correct after construction
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
		// Comma-separated dates
		const currentYear = new Date().getFullYear();
		for (const part of rangeStr.split(",")) {
			const trimmed = part.trim();
			if (trimmed.includes(".")) {
				const [day, month] = trimmed.split(".").map(Number);
				if (!isValidDate(day, month)) {
					continue;
				}
				// Use proper Date constructor to validate
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
 */
export function parseTimeRange(
	timeStr: string,
): { start: string; end: string } | null {
	const match = timeStr.match(/^(\d{1,2}):?(\d{2})?-(\d{1,2}):?(\d{2})?$/);
	if (!match) {
		// Try simple format like "9-18"
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
		// Default: 30 min break starting at given time
		return {
			start: `${parts[0]}:00`,
			end: `${parts[0].split(":")[0].padStart(2, "0")}:30:00`,
		};
	}
	return null;
}

/**
 * Calculate total duration from time range
 */
export function calculateDuration(startTime: string, endTime: string): number {
	const [startH, startM] = startTime.split(":").map(Number);
	const [endH, endM] = endTime.split(":").map(Number);
	const totalMinutes = endH * 60 + endM - (startH * 60 + startM);
	return totalMinutes * 60; // Return seconds
}
