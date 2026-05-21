#!/usr/bin/env node

import { Command } from "commander";
import { loadAuthConfig } from "./config.js";
import { KimaiApi, KimaiApiError } from "./api.js";
import {
	printTimesheets,
	printProjects,
	printActivities,
	printCustomers,
	printTags,
	printTimesheetHeader,
	formatTimesheet,
	formatDuration,
	nowIso,
	parseDate,
	parseEndDate,
	getProjectName,
	getActivityName,
	formatDateTime,
	formatDate,
	formatTime,
	getEntityId,
	checkDayGap,
	getDatePart,
	getCalendarWeek,
	parseDateRange,
	parseTimeRange,
	parseBreak,
	styledHeader,
	styledRow,
	styledSuccess,
	styledError as _styledError,
	styledWarning as _styledWarning,
	styledInfo as _styledInfo,
	colorizeDuration,
	colorizeStatus,
	styles,
} from "./utils.js";
import type { ListTimesheetsOptions } from "./types.js";

const program = new Command();

// Show help reference on error
function showQuickHelp(errorMsg?: string): void {
	if (errorMsg) {
		console.error(`\n❌ ${errorMsg}\n`);
	}
	console.error(`
📖 Quick Reference:
`);
	console.error(
		`  kimai-cli log <text>                  Quick entry (uses last P/A)`,
	);
	console.error(
		`  kimai-cli quick <text>                Even quicker (auto date)`,
	);
	console.error(
		`  kimai-cli timer                       Start interactive timer`,
	);
	console.error(`  kimai-cli copy <id> [days]            Duplicate entry`);
	console.error(`  kimai-cli status                      Check API status`);
	console.error(`  kimai-cli start -p <id> -a <id>      Start timesheet`);
	console.error(`  kimai-cli add -p <id> -a <id>        Add completed entry`);
	console.error(`  kimai-cli current                     Show running`);
	console.error(`  kimai-cli stop                        Stop running`);
	console.error(`  kimai-cli today | week | month        View timesheets`);
	console.error(`  kimai-cli --help                      Full help\n`);
}

// Exit override to show help on errors
program.exitOverride((err) => {
	if (err) {
		if (err.code === "commander.missingArgument") {
			showQuickHelp(`Missing argument: ${err.message}`);
		} else if (err.code === "commander.unknownOption") {
			showQuickHelp(`Unknown option: ${err.message}`);
		} else if (err.code === "commander.optionMissingArgument") {
			showQuickHelp(`Option missing argument: ${err.message}`);
		} else {
			showQuickHelp(err.message);
		}
	}
	process.exit(1);
});

// Helper to create API instance
function createApi(): KimaiApi {
	const config = loadAuthConfig();
	return new KimaiApi(config);
}

// Helper to handle errors
function handleError(error: unknown, showHelp = true): never {
	if (error instanceof KimaiApiError) {
		console.error(`\n❌ API Error [${error.statusCode}]: ${error.message}`);
		if (showHelp) {
			showQuickHelp();
		}
		process.exit(1);
	} else if (error instanceof Error) {
		console.error(`\n❌ Error: ${error.message}`);
		if (showHelp) {
			showQuickHelp();
		}
		process.exit(1);
	}
	console.error("Unknown error:", error);
	process.exit(1);
}

// =====================
// SYSTEM COMMANDS
// =====================

program
	.name("kimai-cli")
	.description("CLI tool for Kimai time-tracking API")
	.option("-c, --config <path>", "Path to auth.json config file");

// Status command
program
	.command("status")
	.description("Show API status (ping, version, plugins)")
	.action(async () => {
		try {
			const api = createApi();

			console.log("🔄 Pinging API...");
			const ping = await api.ping();
			console.log(`✅ Server: ${ping.message}`);

			console.log("\n📋 Version:");
			const version = await api.version();
			console.log(`   Kimai ${version.version} (${version.versionId})`);
			console.log(`   ${version.copyright}`);

			console.log("\n🔌 Plugins:");
			const plugins = await api.plugins();
			if (plugins.length === 0) {
				console.log("   No plugins installed");
			} else {
				for (const plugin of plugins) {
					console.log(`   - ${plugin.name} v${plugin.version}`);
				}
			}
		} catch (error) {
			handleError(error);
		}
	});

// =====================
// TIMESHEET COMMANDS
// =====================

// List timesheets
program
	.command("list")
	.alias("ls")
	.description("List timesheets")
	.option("-p, --project <id>", "Filter by project ID", (v) => parseInt(v, 10))
	.option("-a, --activity <id>", "Filter by activity ID", (v) =>
		parseInt(v, 10),
	)
	.option("-u, --user <id>", "Filter by user ID", (v) => parseInt(v, 10))
	.option("-b, --begin <date>", "Start date (YYYY-MM-DD)")
	.option("-e, --end <date>", "End date (YYYY-MM-DD)")
	.option("-s, --state <state>", "State filter (active/stopped/all)")
	.option("-t, --tag <tag>", "Filter by tag")
	.option("--billable", "Filter billable only")
	.option("--exported", "Filter exported only")
	.option("--full", "Include full entity details")
	.option(
		"-n, --limit <count>",
		"Number of results (default: 50)",
		(v) => parseInt(v, 10),
		50,
	)
	.option("--json", "Output as JSON")
	.action(async (options) => {
		try {
			const api = createApi();

			const listOptions: ListTimesheetsOptions = {
				project: options.project,
				activity: options.activity,
				user: options.user,
				begin: options.begin ? parseDate(options.begin) : undefined,
				end: options.end ? parseEndDate(options.end) : undefined,
				state: options.state as "active" | "stopped" | undefined,
				billable: options.billable ? true : undefined,
				exported: options.exported ? true : undefined,
				full: options.full,
				size: options.limit,
			};

			const timesheets = await api.getTimesheets(listOptions);

			// Filter by tag client-side if needed
			let filtered = timesheets;
			if (options.tag) {
				filtered = timesheets.filter(
					(ts) => ts.tags && ts.tags.includes(options.tag),
				);
			}

			if (options.json) {
				console.log(JSON.stringify(filtered, null, 2));
			} else {
				printTimesheets(filtered);
				if (filtered.length > 0) {
					const totalDuration = filtered.reduce(
						(sum, ts) => sum + (ts.duration || 0),
						0,
					);
					console.log(
						`\nTotal: ${filtered.length} entries, ${formatDuration(totalDuration)}`,
					);
				}
			}
		} catch (error) {
			handleError(error);
		}
	});

// Current (running) timesheets
program
	.command("current")
	.alias("running")
	.description("Show current running timesheet(s)")
	.option("--json", "Output as JSON")
	.action(async (options) => {
		try {
			const api = createApi();
			const active = await api.getActiveTimesheetsRaw();

			if (active.length === 0) {
				console.log("No running timesheet.");
				return;
			}

			if (options.json) {
				console.log(JSON.stringify(active, null, 2));
			} else {
				console.log(`Found ${active.length} running timesheet(s):\n`);
				printTimesheetHeader();
				for (const ts of active) {
					console.log(formatTimesheet(ts));
				}
			}
		} catch (error) {
			handleError(error);
		}
	});

// Start timesheet
program
	.command("start")
	.description("Start a new timesheet")
	.requiredOption("-p, --project <id>", "Project ID", (v) => parseInt(v, 10))
	.requiredOption("-a, --activity <id>", "Activity ID", (v) => parseInt(v, 10))
	.option("-d, --description <text>", "Description")
	.option("-b, --begin <datetime>", "Start time (ISO format, default: now)")
	.option("-t, --tags <tags>", "Comma-separated tags")
	.action(async (options) => {
		try {
			const api = createApi();

			const tags = options.tags
				? options.tags.split(",").map((t: string) => t.trim())
				: undefined;

			const timesheet = await api.createTimesheet({
				project: options.project,
				activity: options.activity,
				description: options.description || "Working",
				begin: options.begin || nowIso(),
				tags,
			});

			console.log(`✅ Timesheet started (#${timesheet.id})`);
			console.log(`   Project: ${getProjectName(timesheet.project)}`);
			console.log(`   Activity: ${getActivityName(timesheet.activity)}`);
			if (timesheet.description) {
				console.log(`   Description: ${timesheet.description}`);
			}
			console.log(`   Started: ${formatDateTime(timesheet.begin)}`);
		} catch (error) {
			handleError(error);
		}
	});

// Add timesheet (with end time - fixed duration)
program
	.command("add")
	.description("Add a completed timesheet entry")
	.requiredOption("-p, --project <id>", "Project ID", (v) => parseInt(v, 10))
	.requiredOption("-a, --activity <id>", "Activity ID", (v) => parseInt(v, 10))
	.option("-d, --description <text>", "Description")
	.option("-b, --begin <datetime>", "Start time (ISO format)")
	.option("-e, --end <datetime>", "End time (ISO format)")
	.option("-t, --tags <tags>", "Comma-separated tags")
	.action(async (options) => {
		try {
			const api = createApi();

			const tags = options.tags
				? options.tags.split(",").map((t: string) => t.trim())
				: undefined;

			const timesheet = await api.createTimesheet({
				project: options.project,
				activity: options.activity,
				description: options.description,
				begin: options.begin || nowIso(),
				end: options.end,
				tags,
			});

			console.log(styledSuccess(`Timesheet #${timesheet.id} erstellt`));
			console.log(
				styledRow("Projekt:", getProjectName(timesheet.project), styles.cyan),
			);
			console.log(
				styledRow(
					"Aktivität:",
					getActivityName(timesheet.activity),
					styles.magenta,
				),
			);
			if (timesheet.description) {
				console.log(styledRow("Beschreibung:", timesheet.description));
			}
			console.log(
				styledRow(
					"Zeit:",
					`${formatTime(timesheet.begin)} - ${formatTime(timesheet.end)}`,
				),
			);
			console.log(styledRow("Dauer:", colorizeDuration(timesheet.duration)));

			// Check for gaps in the day
			const dayDate = getDatePart(timesheet.begin);
			if (dayDate) {
				const dayTimesheets = await api.getTimesheets({
					begin: `${dayDate}T00:00:00`,
					end: `${dayDate}T23:59:59`,
					size: 200,
				});
				const gapCheck = checkDayGap(dayTimesheets);
				if (gapCheck.hasGap && gapCheck.gapMinutes) {
					console.log(
						`\nℹ️  Lücke erkannt: ${Math.round(gapCheck.gapMinutes)} min (${gapCheck.gapStart?.split("T")[1]?.substring(0, 5)} - ${gapCheck.gapEnd?.split("T")[1]?.substring(0, 5)})`,
					);
				}
			}
		} catch (error) {
			handleError(error);
		}
	});

// Stop timesheet
program
	.command("stop")
	.description("Stop a running timesheet")
	.option("-i, --id <id>", "Timesheet ID to stop")
	.option("-t, --time <datetime>", "End time (ISO format, default: now)")
	.option("-y, --yes", "Skip confirmation")
	.action(async (options) => {
		try {
			const api = createApi();
			const endTime = options.time || nowIso();

			if (options.id) {
				// Stop specific timesheet
				const timesheet = await api.stopTimesheet(
					parseInt(options.id, 10),
					endTime,
				);
				console.log(`✅ Timesheet #${options.id} stopped`);
				console.log(`   Duration: ${formatDuration(timesheet.duration)}`);
			} else {
				// Find and stop all running timesheets
				const active = await api.getActiveTimesheetsRaw();
				if (active.length === 0) {
					console.log("No running timesheet found.");
					return;
				}

				for (const ts of active) {
					await api.stopTimesheet(ts.id, endTime);
					console.log(`✅ Stopped #${ts.id} (${formatDate(ts.begin)})`);
				}
			}
		} catch (error) {
			handleError(error);
		}
	});

// Get single timesheet
program
	.command("timesheet <id>")
	.description("Get details of a specific timesheet")
	.option("--json", "Output as JSON")
	.action(async (id: string, options) => {
		try {
			const api = createApi();
			const timesheets = await api.getTimesheets({ size: 500 });
			const ts = timesheets.find((t) => t.id === parseInt(id, 10));

			if (!ts) {
				console.error(`Timesheet #${id} not found`);
				process.exit(1);
			}

			if (options.json) {
				console.log(JSON.stringify(ts, null, 2));
			} else {
				console.log(`Timesheet #${ts.id}`);
				console.log("─".repeat(50));
				console.log(`Project:   ${getProjectName(ts.project)}`);
				console.log(`Activity:  ${getActivityName(ts.activity)}`);
				console.log(`Start:     ${formatDateTime(ts.begin)}`);
				console.log(`End:       ${formatDateTime(ts.end)}`);
				console.log(`Duration:  ${formatDuration(ts.duration)}`);
				if (ts.description) console.log(`Description: ${ts.description}`);
				if (ts.tags && ts.tags.length > 0)
					console.log(`Tags: ${ts.tags.join(", ")}`);
				console.log(`Billable: ${ts.billable ? "Yes" : "No"}`);
				console.log(`Exported: ${ts.exported ? "Yes" : "No"}`);
			}
		} catch (error) {
			handleError(error);
		}
	});

// Delete timesheet
program
	.command("delete <id>")
	.alias("rm")
	.description("Delete a timesheet by ID")
	.option("-y, --yes", "Skip confirmation")
	.action(async (id: string, options) => {
		try {
			const api = createApi();
			const timesheetId = parseInt(id, 10);

			if (!options.yes) {
				const readline = await import("readline");
				const rl = readline.createInterface({
					input: process.stdin,
					output: process.stdout,
				});
				const answer = await new Promise<string>((resolve) => {
					rl.question(`Delete timesheet #${id}? [y/N] `, resolve);
				});
				rl.close();

				if (answer.toLowerCase() !== "y") {
					console.log("Cancelled.");
					return;
				}
			}

			await api.deleteTimesheet(timesheetId);
			console.log(`✅ Timesheet #${id} deleted.`);
		} catch (error) {
			handleError(error);
		}
	});

// Edit timesheet (PATCH)
program
	.command("edit <id>")
	.description("Edit a timesheet (update description, project, activity, etc.)")
	.option("-d, --description <text>", "New description")
	.option("-p, --project <id>", "New project ID", (v) => parseInt(v, 10))
	.option("-a, --activity <id>", "New activity ID", (v) => parseInt(v, 10))
	.option("-b, --begin <datetime>", "New start time")
	.option("-e, --end <datetime>", "New end time")
	.action(async (id: string, options) => {
		try {
			const api = createApi();
			const timesheetId = parseInt(id, 10);

			// Get current timesheet first
			const timesheets = await api.getTimesheets({ size: 500 });
			const current = timesheets.find((t) => t.id === timesheetId);

			if (!current) {
				console.error(`Timesheet #${id} not found`);
				process.exit(1);
			}

			// Build update object
			const updates: Record<string, unknown> = {};
			if (options.description !== undefined)
				updates.description = options.description;
			if (options.project !== undefined) updates.project = options.project;
			if (options.activity !== undefined) updates.activity = options.activity;
			if (options.begin !== undefined) updates.begin = options.begin;
			if (options.end !== undefined) updates.end = options.end;

			if (Object.keys(updates).length === 0) {
				console.log(
					"No updates specified. Use --description, --project, --activity, etc.",
				);
				return;
			}

			const updated = await api.updateTimesheet(timesheetId, updates);
			console.log(`✅ Timesheet #${id} updated`);
			console.log(`   Project: ${getProjectName(updated.project)}`);
			console.log(`   Activity: ${getActivityName(updated.activity)}`);
			console.log(`   Description: ${updated.description || "-"}`);
			console.log(`   Duration: ${formatDuration(updated.duration)}`);
		} catch (error) {
			handleError(error);
		}
	});

// =====================
// PROJECT COMMANDS
// =====================

program
	.command("projects")
	.alias("proj")
	.description("List all projects")
	.option("--visible", "Show only visible projects")
	.option("--full", "Include full details")
	.option("--json", "Output as JSON")
	.action(async (options) => {
		try {
			const api = createApi();
			let projects = await api.getProjects(options.full);

			// Filter visible if requested
			if (options.visible) {
				projects = projects.filter((p) => p.visible);
			}

			if (options.json) {
				console.log(JSON.stringify(projects, null, 2));
			} else {
				printProjects(projects);
				console.log(`\nTotal: ${projects.length} projects`);
			}
		} catch (error) {
			handleError(error);
		}
	});

// Project details
program
	.command("project <id>")
	.description("Get details of a specific project")
	.option("--json", "Output as JSON")
	.action(async (id: string, options) => {
		try {
			const api = createApi();
			const projects = await api.getProjects(true);
			const project = projects.find((p) => p.id === parseInt(id, 10));

			if (!project) {
				console.error(`Project #${id} not found`);
				process.exit(1);
			}

			if (options.json) {
				console.log(JSON.stringify(project, null, 2));
			} else {
				console.log(`Project #${project.id}: ${project.name}`);
				console.log("─".repeat(50));
				console.log(
					`Customer: ${typeof project.customer === "object" ? (project.customer as { name: string })?.name : `#${project.customer}`}`,
				);
				console.log(`Visible: ${project.visible ? "Yes" : "No"}`);
				console.log(`Billable: ${project.billable ? "Yes" : "No"}`);
				if (project.start) console.log(`Start: ${project.start}`);
				if (project.end) console.log(`End: ${project.end}`);
				if (project.comment) console.log(`Comment: ${project.comment}`);
				if (project.teams && project.teams.length > 0) {
					console.log(`Teams: ${project.teams.map((t) => t.name).join(", ")}`);
				}
			}
		} catch (error) {
			handleError(error);
		}
	});

// =====================
// ACTIVITY COMMANDS
// =====================

program
	.command("activities")
	.alias("acts")
	.description("List all activities")
	.option("--visible", "Show only visible activities")
	.option("--billable", "Show only billable activities")
	.option("--full", "Include full details")
	.option("--json", "Output as JSON")
	.action(async (options) => {
		try {
			const api = createApi();
			let activities = await api.getActivities(options.full);

			if (options.visible) {
				activities = activities.filter((a) => a.visible);
			}
			if (options.billable) {
				activities = activities.filter((a) => a.billable);
			}

			if (options.json) {
				console.log(JSON.stringify(activities, null, 2));
			} else {
				printActivities(activities);
				console.log(`\nTotal: ${activities.length} activities`);
			}
		} catch (error) {
			handleError(error);
		}
	});

// Activity details
program
	.command("activity <id>")
	.description("Get details of a specific activity")
	.option("--json", "Output as JSON")
	.action(async (id: string, options) => {
		try {
			const api = createApi();
			const activities = await api.getActivities(true);
			const activity = activities.find((a) => a.id === parseInt(id, 10));

			if (!activity) {
				console.error(`Activity #${id} not found`);
				process.exit(1);
			}

			if (options.json) {
				console.log(JSON.stringify(activity, null, 2));
			} else {
				console.log(`Activity #${activity.id}: ${activity.name}`);
				console.log("─".repeat(50));
				console.log(`Visible: ${activity.visible ? "Yes" : "No"}`);
				console.log(`Billable: ${activity.billable ? "Yes" : "No"}`);
				if (activity.project && typeof activity.project !== "number") {
					console.log(`Project: ${activity.project.name}`);
				}
				if (activity.comment) console.log(`Comment: ${activity.comment}`);
			}
		} catch (error) {
			handleError(error);
		}
	});

// =====================
// CUSTOMER COMMANDS
// =====================

program
	.command("customers")
	.alias("custs")
	.description("List all customers")
	.option("--visible", "Show only visible customers")
	.option("--full", "Include full details")
	.option("--json", "Output as JSON")
	.action(async (options) => {
		try {
			const api = createApi();
			let customers = await api.getCustomers(options.full);

			if (options.visible) {
				customers = customers.filter((c) => c.visible);
			}

			if (options.json) {
				console.log(JSON.stringify(customers, null, 2));
			} else {
				printCustomers(customers);
				console.log(`\nTotal: ${customers.length} customers`);
			}
		} catch (error) {
			handleError(error);
		}
	});

// Customer details
program
	.command("customer <id>")
	.description("Get details of a specific customer")
	.option("--json", "Output as JSON")
	.action(async (id: string, options) => {
		try {
			const api = createApi();
			const customers = await api.getCustomers(true);
			const customer = customers.find((c) => c.id === parseInt(id, 10));

			if (!customer) {
				console.error(`Customer #${id} not found`);
				process.exit(1);
			}

			if (options.json) {
				console.log(JSON.stringify(customer, null, 2));
			} else {
				console.log(`Customer #${customer.id}: ${customer.name}`);
				console.log("─".repeat(50));
				console.log(`Visible: ${customer.visible ? "Yes" : "No"}`);
				console.log(`Billable: ${customer.billable ? "Yes" : "No"}`);
				console.log(`Country: ${customer.country}`);
				console.log(`Currency: ${customer.currency}`);
				console.log(`Timezone: ${customer.timezone}`);
				if (customer.number) console.log(`Number: ${customer.number}`);
				if (customer.comment) console.log(`Comment: ${customer.comment}`);
			}
		} catch (error) {
			handleError(error);
		}
	});

// =====================
// TAG COMMANDS
// =====================

program
	.command("tags")
	.description("List all tags")
	.option("--json", "Output as JSON")
	.action(async (options) => {
		try {
			const api = createApi();
			const tags = await api.getTags();

			if (options.json) {
				console.log(JSON.stringify(tags, null, 2));
			} else {
				printTags(tags);
				console.log(`\nTotal: ${tags.length} tags`);
			}
		} catch (error) {
			handleError(error);
		}
	});

// Find timesheets by tag
program
	.command("tagged <tag>")
	.description("Find timesheets with a specific tag")
	.option("-b, --begin <date>", "Start date (YYYY-MM-DD)")
	.option("-e, --end <date>", "End date (YYYY-MM-DD)")
	.option("--json", "Output as JSON")
	.action(async (tag: string, options) => {
		try {
			const api = createApi();

			const listOptions: ListTimesheetsOptions = {
				begin: options.begin ? parseDate(options.begin) : undefined,
				end: options.end ? parseEndDate(options.end) : undefined,
				size: 500,
			};

			const timesheets = await api.getTimesheets(listOptions);
			const tagged = timesheets.filter(
				(ts) => ts.tags && ts.tags.includes(tag),
			);

			if (options.json) {
				console.log(JSON.stringify(tagged, null, 2));
			} else {
				console.log(`Timesheets tagged "${tag}":\n`);
				printTimesheets(tagged);
				if (tagged.length > 0) {
					const totalDuration = tagged.reduce(
						(sum, ts) => sum + (ts.duration || 0),
						0,
					);
					console.log(
						`\nTotal: ${tagged.length} entries, ${formatDuration(totalDuration)}`,
					);
				}
			}
		} catch (error) {
			handleError(error);
		}
	});

// =====================
// STATISTICS COMMANDS
// =====================

// Summary command
program
	.command("summary")
	.alias("sum")
	.description("Show summary of timesheets")
	.option(
		"-b, --begin <date>",
		"Start date (YYYY-MM-DD, default: first of current month)",
	)
	.option("-e, --end <date>", "End date (YYYY-MM-DD, default: today)")
	.option("-u, --user <id>", "Filter by user ID", (v) => parseInt(v, 10))
	.option("-p, --project <id>", "Filter by project", (v) => parseInt(v, 10))
	.option("-a, --activity <id>", "Filter by activity", (v) => parseInt(v, 10))
	.option("--json", "Output as JSON")
	.action(async (options) => {
		try {
			const api = createApi();

			// Default to first of month to today
			const now = new Date();
			const begin =
				options.begin ||
				`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
			const end = options.end || now.toISOString().split("T")[0];

			const listOptions: ListTimesheetsOptions = {
				begin: parseDate(begin),
				end: parseEndDate(end),
				user: options.user,
				project: options.project,
				activity: options.activity,
				size: 500,
			};

			const timesheets = await api.getTimesheets(listOptions);

			// Calculate statistics
			const totalDuration = timesheets.reduce(
				(sum, ts) => sum + (ts.duration || 0),
				0,
			);
			const byProject: Record<string, number> = {};
			const byActivity: Record<string, number> = {};

			for (const ts of timesheets) {
				const projectName = getProjectName(ts.project);
				const activityName = getActivityName(ts.activity);
				byProject[projectName] =
					(byProject[projectName] || 0) + (ts.duration || 0);
				byActivity[activityName] =
					(byActivity[activityName] || 0) + (ts.duration || 0);
			}

			if (options.json) {
				console.log(
					JSON.stringify(
						{
							period: { begin, end },
							total: { entries: timesheets.length, duration: totalDuration },
							byProject,
							byActivity,
						},
						null,
						2,
					),
				);
			} else {
				console.log(`📊 Summary: ${begin} to ${end}`);
				console.log("═".repeat(50));
				console.log(`Total entries: ${timesheets.length}`);
				console.log(`Total time: ${formatDuration(totalDuration)}`);

				console.log("\n📁 By Project:");
				const sortedProjects = Object.entries(byProject).sort(
					(a, b) => b[1] - a[1],
				);
				for (const [name, duration] of sortedProjects) {
					const pct = Math.round((duration / totalDuration) * 100);
					console.log(
						`   ${name.padEnd(35)} ${formatDuration(duration).padEnd(10)} ${pct}%`,
					);
				}

				console.log("\n🎯 By Activity:");
				const sortedActivities = Object.entries(byActivity).sort(
					(a, b) => b[1] - a[1],
				);
				for (const [name, duration] of sortedActivities) {
					const pct = Math.round((duration / totalDuration) * 100);
					console.log(
						`   ${name.padEnd(35)} ${formatDuration(duration).padEnd(10)} ${pct}%`,
					);
				}
			}
		} catch (error) {
			handleError(error);
		}
	});

// Today command
program
	.command("today")
	.description("Show timesheets for today")
	.option("--json", "Output as JSON")
	.action(async (options) => {
		try {
			const api = createApi();
			const today = new Date().toISOString().split("T")[0];

			const timesheets = await api.getTimesheets({
				begin: `${today}T00:00:00`,
				size: 100,
			});

			if (options.json) {
				console.log(JSON.stringify(timesheets, null, 2));
			} else {
				console.log(
					`📅 Timesheets for ${formatDate(timesheets[0]?.begin || today)}`,
				);
				console.log("═".repeat(50));
				printTimesheets(timesheets);

				if (timesheets.length > 0) {
					const totalDuration = timesheets.reduce(
						(sum, ts) => sum + (ts.duration || 0),
						0,
					);
					console.log(`\nTotal today: ${formatDuration(totalDuration)}`);
				}
			}
		} catch (error) {
			handleError(error);
		}
	});

// Week command
program
	.command("week")
	.description("Show timesheets for current week (Mon-Sun)")
	.option("--json", "Output as JSON")
	.action(async (options) => {
		try {
			const api = createApi();
			const now = new Date();
			const dayOfWeek = now.getDay();
			const monday = new Date(now);
			monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
			const sunday = new Date(monday);
			sunday.setDate(monday.getDate() + 6);

			const begin = monday.toISOString().split("T")[0];
			const end = sunday.toISOString().split("T")[0];

			const timesheets = await api.getTimesheets({
				begin: parseDate(begin),
				end: `${end}T23:59:59`,
				size: 500,
			});

			if (options.json) {
				console.log(JSON.stringify(timesheets, null, 2));
			} else {
				const kw = getCalendarWeek(monday);
				console.log(
					styledHeader(`KW ${kw}`, `${formatDate(begin)} - ${formatDate(end)}`),
				);
				console.log("");
				printTimesheets(timesheets);

				if (timesheets.length > 0) {
					const totalDuration = timesheets.reduce(
						(sum, ts) => sum + (ts.duration || 0),
						0,
					);
					console.log("");
					console.log(styledRow("Gesamt:", colorizeDuration(totalDuration)));
				}
			}
		} catch (error) {
			handleError(error);
		}
	});

// Month command
program
	.command("month")
	.alias("monthly")
	.description("Show timesheets for current month")
	.option("-m, --month <YYYY-MM>", "Specific month (default: current)")
	.option("--json", "Output as JSON")
	.action(async (options) => {
		try {
			const api = createApi();

			let year: number, month: number;
			if (options.month) {
				const parts = options.month.split("-");
				if (parts.length !== 2) {
					throw new Error("Invalid month format. Use YYYY-MM (e.g., 2026-05)");
				}
				const [parsedYear, parsedMonth] = parts.map(Number);
				if (
					isNaN(parsedYear) ||
					isNaN(parsedMonth) ||
					parsedMonth < 1 ||
					parsedMonth > 12 ||
					parsedYear < 2000 ||
					parsedYear > 2100
				) {
					throw new Error(
						"Invalid month. Use YYYY-MM with year 2000-2100 and month 1-12",
					);
				}
				year = parsedYear;
				month = parsedMonth;
			} else {
				const now = new Date();
				year = now.getFullYear();
				month = now.getMonth() + 1;
			}

			const begin = `${year}-${String(month).padStart(2, "0")}-01`;
			const lastDay = new Date(year, month, 0).getDate();
			const end = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

			const timesheets = await api.getTimesheets({
				begin: parseDate(begin),
				end: `${end}T23:59:59`,
				size: 500,
			});

			if (options.json) {
				console.log(JSON.stringify(timesheets, null, 2));
			} else {
				console.log(
					`📅 Timesheets for ${year}-${String(month).padStart(2, "0")}`,
				);
				console.log("═".repeat(50));
				printTimesheets(timesheets);

				if (timesheets.length > 0) {
					const totalDuration = timesheets.reduce(
						(sum, ts) => sum + (ts.duration || 0),
						0,
					);
					console.log(`\nTotal this month: ${formatDuration(totalDuration)}`);
				}
			}
		} catch (error) {
			handleError(error);
		}
	});

// =====================
// SEARCH COMMANDS
// =====================

// Search timesheets by description
program
	.command("search <query>")
	.description("Search timesheets by description")
	.option("-b, --begin <date>", "Start date")
	.option("-e, --end <date>", "End date")
	.option("--json", "Output as JSON")
	.action(async (query: string, options) => {
		try {
			const api = createApi();

			const listOptions: ListTimesheetsOptions = {
				begin: options.begin ? parseDate(options.begin) : undefined,
				end: options.end ? parseEndDate(options.end) : undefined,
				size: 500,
			};

			const timesheets = await api.getTimesheets(listOptions);
			const matches = timesheets.filter(
				(ts) =>
					ts.description &&
					ts.description.toLowerCase().includes(query.toLowerCase()),
			);

			if (options.json) {
				console.log(JSON.stringify(matches, null, 2));
			} else {
				console.log(`Search results for "${query}":\n`);
				printTimesheets(matches);
				console.log(`\nFound: ${matches.length} matches`);
			}
		} catch (error) {
			handleError(error);
		}
	});

// =====================
// INTERACTIVE COMMANDS
// =====================

// Quick log - just description, uses last project/activity
program
	.command("log <description>")
	.description("Quick log with last used project/activity")
	.option("-d, --duration <duration>", "Duration in minutes", (v) =>
		parseInt(v, 10),
	)
	.action(async (description: string, options) => {
		try {
			const api = createApi();

			// Get last timesheet to reuse project/activity
			const lastTimesheets = await api.getTimesheets({ size: 1 });

			if (lastTimesheets.length === 0) {
				console.error(
					"No previous timesheets found. Please specify project/activity with start command.",
				);
				process.exit(1);
			}

			const last = lastTimesheets[0];
			const projectId =
				typeof last.project === "number"
					? last.project
					: getEntityId(last.project ?? null);
			const activityId =
				typeof last.activity === "number"
					? last.activity
					: getEntityId(last.activity ?? null);

			if (projectId === null || activityId === null) {
				console.error(
					"Could not determine project/activity from last timesheet.",
				);
				process.exit(1);
			}

			const now = new Date();
			const begin = now.toISOString();
			let end: string;

			if (options.duration) {
				const endDate = new Date(now.getTime() + options.duration * 60000);
				end = endDate.toISOString();
			} else {
				end = now.toISOString();
			}

			const timesheet = await api.createTimesheet({
				project: projectId,
				activity: activityId,
				description,
				begin,
				end,
			});

			console.log(`✅ Logged: "${description}"`);
			console.log(`   Duration: ${formatDuration(timesheet.duration)}`);
		} catch (error) {
			handleError(error);
		}
	});

// Quick - ultra fast entry with automatic project/activity and work-from time
program
	.command("quick <description>")
	.description(
		"Ultra quick log - uses last P/A, defaults to work hours (08:00 or last end time)",
	)
	.option("-m, --minutes <mins>", "Duration in minutes", (v) => parseInt(v, 10))
	.option("-d, --date <YYYY-MM-DD>", "Date (default: today)")
	.action(async (description: string, options) => {
		try {
			const api = createApi();

			// Get last timesheet to reuse project/activity
			const lastTimesheets = await api.getTimesheets({ size: 1 });

			if (lastTimesheets.length === 0) {
				console.error(
					"No previous timesheets found. Use: kimai-cli start -p <id> -a <id>",
				);
				process.exit(1);
			}

			const last = lastTimesheets[0];
			const projectId = getEntityId(last.project ?? null);
			const activityId = getEntityId(last.activity ?? null);

			if (projectId === null || activityId === null) {
				console.error("Could not determine project/activity.");
				process.exit(1);
			}

			// Determine start time
			const targetDate = options.date || new Date().toISOString().split("T")[0];
			let startTime: string;

			// If last entry was yesterday or earlier, start at 08:00
			// Otherwise continue from where we left off
			const lastDate = (last.end || last.begin).split("T")[0];
			if (lastDate < targetDate) {
				startTime = `${targetDate}T08:00:00`;
			} else {
				// Continue from last end time
				const lastEnd = new Date(last.end || last.begin);
				lastEnd.setMinutes(lastEnd.getMinutes() + 1); // 1 min gap
				startTime = lastEnd.toISOString();
			}

			// Calculate end time
			const minutes = options.minutes || 60;
			const endDate = new Date(new Date(startTime).getTime() + minutes * 60000);
			const endTime = endDate.toISOString();

			const timesheet = await api.createTimesheet({
				project: projectId,
				activity: activityId,
				description,
				begin: startTime,
				end: endTime,
			});

			console.log(`✅ Quick logged: "${description}"`);
			console.log(
				`   ${formatDateTime(timesheet.begin)} - ${formatTime(timesheet.end)}`,
			);
			console.log(`   Duration: ${formatDuration(timesheet.duration)}`);

			// Check for gaps
			const dayDate = targetDate;
			const dayTimesheets = await api.getTimesheets({
				begin: `${dayDate}T00:00:00`,
				end: `${dayDate}T23:59:59`,
				size: 50,
			});
			const gapCheck = checkDayGap(dayTimesheets);
			if (gapCheck.hasGap && gapCheck.gapMinutes && gapCheck.gapMinutes > 5) {
				console.log(
					`\nℹ️  Lücke: ${Math.round(gapCheck.gapMinutes)} min (${gapCheck.gapStart?.split("T")[1]?.substring(0, 5)} - ${gapCheck.gapEnd?.split("T")[1]?.substring(0, 5)})`,
				);
			}
		} catch (error) {
			handleError(error);
		}
	});

// Copy - duplicate an entry, optionally offset by days
program
	.command("copy <id>")
	.description("Copy a timesheet entry")
	.option(
		"-d, --days <num>",
		"Days to offset (default: 1)",
		(v) => parseInt(v, 10),
		1,
	)
	.option(
		"-c, --copy-count <num>",
		"Number of copies (default: 1)",
		(v) => parseInt(v, 10),
		1,
	)
	.action(async (id: string, options) => {
		try {
			const api = createApi();

			// Get the source timesheet
			const timesheets = await api.getTimesheets({ size: 1000 });
			const source = timesheets.find((t) => t.id === parseInt(id, 10));

			if (!source) {
				console.error(`Timesheet #${id} not found.`);
				process.exit(1);
			}

			const projectId = getEntityId(source.project);
			const activityId = getEntityId(source.activity);

			if (projectId === null || activityId === null) {
				console.error("Could not determine project/activity.");
				process.exit(1);
			}

			// Parse source times
			const duration = source.duration || 0;

			// Extract time portion from source (preserving timezone)
			const timePart =
				source.begin.split("T")[1]?.substring(0, 8) || "08:00:00";
			const endTimePart =
				(source.end || source.begin).split("T")[1]?.substring(0, 8) ||
				"16:30:00";

			console.log(
				`📋 Source: ${formatDateTime(source.begin)} - ${formatTime(source.end)} (${formatDuration(duration)})`,
			);
			console.log(`   "${source.description}"`);
			console.log("");

			// Create copies with proper Date math
			for (let i = 0; i < options.copyCount; i++) {
				const offsetDays = (i + 1) * options.days;
				const sourceDate = new Date(source.begin);
				sourceDate.setDate(sourceDate.getDate() + offsetDays);
				const newDateStr = sourceDate.toISOString().split("T")[0];

				const newBegin = `${newDateStr}T${timePart}`;
				const newEnd = `${newDateStr}T${endTimePart}`;

				try {
					const newTimesheet = await api.createTimesheet({
						project: projectId,
						activity: activityId,
						description: source.description || "",
						begin: newBegin,
						end: newEnd,
					});

					console.log(
						`✅ Copied #${newTimesheet.id}: ${formatDate(newTimesheet.begin)} ${formatTime(newTimesheet.begin)}-${formatTime(newTimesheet.end)}`,
					);
				} catch (err) {
					console.log(`❌ Failed: ${newDateStr} - ${(err as Error).message}`);
				}
			}
		} catch (error) {
			handleError(error);
		}
	});

// Timer - interactive running timer
program
	.command("timer")
	.description("Start an interactive timer session")
	.option("-p, --project <id>", "Project ID")
	.option("-a, --activity <id>", "Activity ID")
	.option("-d, --description <text>", "Description")
	.action(async (options) => {
		try {
			const api = createApi();

			let projectId = options.project;
			let activityId = options.activity;

			// If no project specified, use last timesheet's project/activity
			if (!projectId || !activityId) {
				const lastTimesheets = await api.getTimesheets({ size: 1 });
				if (lastTimesheets.length > 0) {
					const last = lastTimesheets[0];
					if (!projectId) projectId = getEntityId(last.project)?.toString();
					if (!activityId) activityId = getEntityId(last.activity)?.toString();
				}
			}

			if (!projectId || !activityId) {
				console.error(
					"Please specify project and activity: kimai-cli timer -p <project> -a <activity>",
				);
				console.error("Or: kimai-cli start -p <project> -a <activity>");
				process.exit(1);
			}

			console.log("\n⏱️  Timer started!");
			console.log(`   Project: #${projectId}`);
			console.log(`   Activity: #${activityId}`);
			if (options.description) {
				console.log(`   Description: ${options.description}`);
			}
			console.log(`   Started: ${new Date().toLocaleString("de-DE")}`);
			console.log("\n   Press Ctrl+C to stop...\n");

			// Start the timesheet
			const timesheet = await api.createTimesheet({
				project: parseInt(projectId, 10),
				activity: parseInt(activityId, 10),
				description: options.description || "Working",
				begin: new Date().toISOString(),
			});

			console.log(`   Timesheet ID: #${timesheet.id}`);

			// Wait for interrupt
			await new Promise<void>((resolve) => {
				process.on("SIGINT", async () => {
					console.log("\n\n🛑 Stopping timer...");
					try {
						const stopped = await api.stopTimesheet(
							timesheet.id,
							new Date().toISOString(),
						);
						console.log(
							`\n✅ Stopped! Duration: ${formatDuration(stopped.duration)}`,
						);
					} catch {
						// Ignore
					}
					resolve();
				});
			});
		} catch (error) {
			handleError(error);
		}
	});

// =====================
// SMART COMMANDS
// =====================

// Range command - add entries for date range with time and break
program
	.command("range")
	.description("Add entries for a date range with time and break")
	.requiredOption("-d, --dates <range>", 'Date range like "19.05-21.05"')
	.requiredOption("-p, --project <id>", "Project ID", (v) => parseInt(v, 10))
	.requiredOption("-a, --activity <id>", "Activity ID", (v) => parseInt(v, 10))
	.option("-t, --text <description>", "Description")
	.option("--hours <range>", 'Time range like "9-18"')
	.option("--break <time>", 'Break like "12:30"')
	.action(async (options) => {
		try {
			const api = createApi();
			const dates = parseDateRange(options.dates);
			const timeRange = options.hours
				? parseTimeRange(options.hours) || {
						start: "08:00:00",
						end: "16:30:00",
					}
				: { start: "08:00:00", end: "16:30:00" };
			const breakTime = options.break
				? parseBreak(options.break) || { start: "12:00:00", end: "12:30:00" }
				: { start: "12:00:00", end: "12:30:00" };

			console.log(`📅 Creating entries for ${dates.length} days...`);
			for (const date of dates) {
				const desc = options.text || "";
				// Morning
				await api.createTimesheet({
					project: options.project,
					activity: options.activity,
					description: desc,
					begin: `${date}T${timeRange.start}`,
					end: `${date}T${breakTime.start}`,
				});
				// Afternoon
				await api.createTimesheet({
					project: options.project,
					activity: options.activity,
					description: desc,
					begin: `${date}T${breakTime.end}`,
					end: `${date}T${timeRange.end}`,
				});
				console.log(
					`✅ ${date}: ${timeRange.start.substring(0, 5)}-${timeRange.end.substring(0, 5)}`,
				);
			}
			console.log(`\n🎉 ${dates.length * 2} entries created!`);
		} catch (error) {
			handleError(error);
		}
	});

// Day command - show gaps for a specific day
program
	.command("day [date]")
	.description("Show timesheets and gaps for a day")
	.option("--json", "Output as JSON")
	.action(async (date: string | undefined, options) => {
		try {
			const api = createApi();
			const targetDate = date || new Date().toISOString().split("T")[0];
			const timesheets = await api.getTimesheets({
				begin: `${targetDate}T00:00:00`,
				end: `${targetDate}T23:59:59`,
				size: 200,
			});

			if (options.json) {
				console.log(JSON.stringify(timesheets, null, 2));
				return;
			}

			console.log(
				styledHeader(
					`📅 ${formatDate(`${targetDate}T12:00:00`)}`,
					"Tagesübersicht",
				),
			);
			console.log("");
			printTimesheets(timesheets);

			if (timesheets.length > 0) {
				const total = timesheets.reduce(
					(sum, ts) => sum + (ts.duration || 0),
					0,
				);
				console.log("");
				console.log(styledRow("Gesamt:", colorizeDuration(total)));
				const gapCheck = checkDayGap(timesheets);
				console.log(
					styledRow("Status:", colorizeStatus(gapCheck.hasGap, total)),
				);
				if (gapCheck.hasGap) {
					console.log(
						styledRow(
							"Pause:",
							`${Math.round(gapCheck.gapMinutes!)} min (${gapCheck.gapStart?.split("T")[1]?.substring(0, 5)} - ${gapCheck.gapEnd?.split("T")[1]?.substring(0, 5)})`,
						),
					);
				}
			}
		} catch (error) {
			handleError(error);
		}
	});

// Repeat command - copy template to other dates
program
	.command("repeat <id>")
	.description("Copy a timesheet to other dates")
	.option("-d, --dates <range>", 'Date range like "19.05-21.05"')
	.action(async (id: string, options) => {
		try {
			const api = createApi();
			const timesheets = await api.getTimesheets({ size: 1000 });
			const source = timesheets.find((t) => t.id === parseInt(id, 10));
			if (!source) {
				console.error(`Timesheet #${id} not found.`);
				process.exit(1);
			}

			const projectId = getEntityId(source.project);
			const activityId = getEntityId(source.activity);
			const dates = options.dates ? parseDateRange(options.dates) : [];
			const timePart =
				source.begin.split("T")[1]?.substring(0, 8) || "08:00:00";
			const endPart =
				(source.end || source.begin).split("T")[1]?.substring(0, 8) ||
				"16:30:00";

			console.log(
				`📋 Template: ${formatDateTime(source.begin)} - ${formatTime(source.end)}`,
			);
			console.log(`📅 Kopiere auf ${dates.length} Tage...\n`);

			for (const date of dates) {
				try {
					await api.createTimesheet({
						project: projectId!,
						activity: activityId!,
						description: source.description || "",
						begin: `${date}T${timePart}`,
						end: `${date}T${endPart}`,
					});
					console.log(
						`✅ ${date}: ${timePart.substring(0, 5)}-${endPart.substring(0, 5)}`,
					);
				} catch (err) {
					console.log(`❌ ${date}: ${(err as Error).message}`);
				}
			}
		} catch (error) {
			handleError(error);
		}
	});

program.parse();
