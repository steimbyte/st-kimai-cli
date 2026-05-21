import type { Timesheet, Project, Customer, Activity } from "./types.js";

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
	const duration = formatDuration(ts.duration);
	const description = ts.description || "-";

	return `${date} | ${start}-${end} | ${duration.padEnd(8)} | ${projectName.padEnd(30)} | ${activityName.padEnd(20)} | ${description}`;
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
		"Date       | Start-End  | Duration  | Project                       | Activity               | Description",
	);
	console.log(
		"-----------+------------+-----------+-------------------------------+------------------------+-------------------------------",
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
