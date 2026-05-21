/**
 * Design System for kimai-cli
 * Provides consistent layout, colors, and icons across the CLI
 */

import pc from "picocolors";

// ═══════════════════════════════════════════════════════════════════════════════
// LAYOUT CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const LAYOUT = {
	// Standard widths
	TABLE_WIDTH: 70,
	LABEL_WIDTH: 14,
	INDENT: "  ",

	// Column widths
	COL_ID: 6,
	COL_NAME: 46,
	COL_SHORT: 20,
	COL_STATUS: 10,
	COL_DATE: 12,
	COL_TIME: 8,
	COL_DURATION: 10,
	COL_PROJECT: 28,
	COL_ACTIVITY: 20,

	// Table settings
	DIVIDER_CHAR: "─",
	PADDING: 2,

	// List settings
	DEFAULT_LIMIT: 50,
	MAX_LIMIT: 500,

	// Spacing
	SECTION_GAP: 1,
} as const;

// Divider function (defined after LAYOUT constants)
export function divider(
	char: string = LAYOUT.DIVIDER_CHAR,
	width: number = LAYOUT.TABLE_WIDTH,
): string {
	return char.repeat(width);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEMANTIC COLOR TOKENS (using picocolors)
// ═══════════════════════════════════════════════════════════════════════════════

// Color support detection (respects NO_COLOR and FORCE_COLOR)
const useColor =
	process.env.FORCE_COLOR !== undefined ||
	(!process.env.NO_COLOR &&
		process.stdout.isTTY &&
		!process.argv.includes("--no-color"));

function colorize(fn: (s: string) => string): (text: string) => string {
	return useColor ? fn : (s: string) => s;
}

export const COLORS = {
	// Primary - Trust blue for main actions
	primary: colorize(pc.blue),
	primaryBold: colorize((s: string) => pc.bold(pc.blue(s))),

	// Success - Green for confirmations
	success: colorize(pc.green),
	successBold: colorize((s: string) => pc.bold(pc.green(s))),

	// Warning - Yellow for cautions
	warning: colorize(pc.yellow),
	warningBold: colorize((s: string) => pc.bold(pc.yellow(s))),

	// Error - Red for failures
	error: colorize(pc.red),
	errorBold: colorize((s: string) => pc.bold(pc.red(s))),

	// Info - Cyan for informational
	info: colorize(pc.cyan),
	infoBold: colorize((s: string) => pc.bold(pc.cyan(s))),

	// Project color (typically associated with projects)
	project: colorize(pc.cyan),

	// Activity color (typically associated with activities)
	activity: colorize(pc.magenta),

	// Customer color
	customer: colorize(pc.blue),

	// Tag color
	tag: colorize(pc.yellow),

	// Duration colors
	durationGood: colorize(pc.green), // 8h+
	durationOk: colorize(pc.yellow), // 6-8h
	durationBad: colorize(pc.red), // <6h

	// Neutral
	muted: colorize(pc.gray),
	bold: colorize(pc.bold),
	white: colorize(pc.white),

	// Reset
	reset: useColor ? pc.reset : "",
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ICON CONSTANTS (emoji for cross-platform support)
// ═══════════════════════════════════════════════════════════════════════════════

export const ICONS = {
	// Status icons
	status: {
		ok: "✓",
		error: "✗",
		warning: "⚠",
		info: "➤",
		loading: "◐",
		pending: "○",
	},

	// Entity icons
	entity: {
		timesheet: "⏱",
		project: "📁",
		activity: "🎯",
		customer: "🏢",
		tag: "🏷",
		user: "👤",
		team: "👥",
		plugin: "🔌",
		version: "ℹ️",
	},

	// Action icons
	action: {
		start: "▶",
		stop: "⏹",
		add: "➕",
		edit: "✏",
		delete: "🗑",
		copy: "📋",
		search: "🔍",
		list: "📋",
		export: "📤",
		import: "📥",
		refresh: "🔄",
		save: "💾",
		cancel: "✖",
		help: "📖",
		timer: "⏱",
		clock: "🕐",
		calendar: "📅",
		chart: "📊",
		stats: "📈",
		check: "✅",
		cross: "❌",
	},

	// Time icons
	time: {
		hourglass: "⏳",
		alarm: "⏰",
		play: "▶",
		pause: "⏸",
		rewind: "⏪",
		fastForward: "⏩",
	},

	// Misc
	misc: {
		sparkle: "✨",
		star: "⭐",
		bullet: "•",
		arrow: "→",
		pipe: "│",
		dot: "·",
		gap: "⚠",
	},
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pad a string to a specific length (truncates if too long)
 */
export function pad(str: string, length: number, char = " "): string {
	return str.length >= length
		? str.substring(0, length)
		: str.padEnd(length, char);
}

/**
 * Truncate a string with ellipsis
 */
export function truncate(str: string, length: number): string {
	return str.length > length ? str.substring(0, length - 1) + "…" : str;
}

/**
 * Create a styled section header
 */
export function sectionHeader(
	title: string,
	options?: { subtitle?: string; width?: number },
): string {
	const width = options?.width || LAYOUT.TABLE_WIDTH;
	const padding = Math.max(0, Math.floor((width - title.length - 4) / 2));
	const padStr = " ".repeat(padding);

	let output = COLORS.infoBold(`┌${divider("─", width)}┐\n`);
	output += COLORS.infoBold(`│${padStr} ${title} ${padStr}│\n`);
	if (options?.subtitle) {
		const subPad = Math.max(
			0,
			Math.floor((width - options.subtitle.length - 4) / 2),
		);
		output += `│${COLORS.muted(" ".repeat(subPad))} ${options.subtitle} ${COLORS.muted(" ".repeat(subPad))}│\n`;
	}
	output += COLORS.infoBold(`└${divider("─", width)}┘`);
	return output;
}

/**
 * Colorize duration based on daily target (8h)
 */
export function colorizeDurationByQuality(
	seconds: number | null,
	targetHours = 8,
): string {
	if (!seconds) return COLORS.muted("-");
	const hours = seconds / 3600;
	if (hours >= targetHours) return COLORS.durationGood("█");
	if (hours >= targetHours - 2) return COLORS.durationOk("█");
	return COLORS.durationBad("█");
}

/**
 * Check if color support is enabled
 */
export function isColorEnabled(): boolean {
	return useColor;
}
