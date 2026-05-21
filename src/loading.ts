/**
 * Loading spinner helper using ora
 * Provides consistent loading feedback for async operations
 */

import ora, { type Ora } from "ora";

// ═══════════════════════════════════════════════════════════════════════════════
// SPINNER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const spinnerConfig = {
	color: "cyan" as const,
	spinner: "dots12" as const,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SPINNER FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export interface LoadingContext {
	spinner: Ora | null;
	text: string;
}

/**
 * Create a new spinner with text
 */
export function startLoading(text: string): Ora {
	const spinner = ora({
		text,
		...spinnerConfig,
	}).start();
	return spinner;
}

/**
 * Start loading with success state
 */
export function succeedLoading(text: string): void {
	ora({
		text,
		color: "green",
	}).succeed();
}

/**
 * Start loading with failure state
 */
export function failLoading(text: string): void {
	ora({
		text,
		color: "red",
	}).fail();
}

/**
 * Start loading with warning state
 */
export function warnLoading(text: string): void {
	ora({
		text,
		color: "yellow",
	}).warn();
}

/**
 * Start loading with info state
 */
export function infoLoading(text: string): void {
	ora({
		text,
		color: "cyan",
	}).info();
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK-BASED LOADING (for use with useLoading in commands)
// ═══════════════════════════════════════════════════════════════════════════════

export interface LoadingState {
	start: (text: string) => void;
	succeed: (text?: string) => void;
	fail: (text?: string) => void;
	warn: (text?: string) => void;
	info: (text?: string) => void;
	update: (text: string) => void;
	spinner: Ora | null;
}

/**
 * Create a loading state manager
 * Usage:
 *   const loading = createLoading();
 *   loading.start("Fetching timesheets...");
 *   try {
 *     const data = await api.getTimesheets();
 *     loading.succeed("Fetched!");
 *   } catch (e) {
 *     loading.fail("Failed!");
 *   }
 */
export function createLoading(): LoadingState {
	let spinner: Ora | null = null;

	return {
		get spinner() {
			return spinner;
		},

		start(text: string): void {
			spinner = startLoading(text);
		},

		succeed(text?: string): void {
			if (spinner) {
				spinner.succeed(text || spinner.text);
				spinner = null;
			} else if (text) {
				succeedLoading(text);
			}
		},

		fail(text?: string): void {
			if (spinner) {
				spinner.fail(text || spinner.text);
				spinner = null;
			} else if (text) {
				failLoading(text);
			}
		},

		warn(text?: string): void {
			if (spinner) {
				spinner.warn(text || spinner.text);
				spinner = null;
			} else if (text) {
				warnLoading(text);
			}
		},

		info(text?: string): void {
			if (spinner) {
				spinner.info(text || spinner.text);
				spinner = null;
			} else if (text) {
				infoLoading(text);
			}
		},

		update(text: string): void {
			if (spinner) {
				spinner.text = text;
			}
		},
	};
}

// ═════════════════════════════════════════════════════════════════════════════
// WRAPPER FOR ASYNC OPERATIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Execute an async operation with loading spinner
 * Usage:
 *   const data = await withLoading("Fetching data...", () => api.getData());
 */
export async function withLoading<T>(
	text: string,
	fn: () => Promise<T>,
	options?: {
		successText?: string;
		failText?: string;
		onSuccess?: (result: T) => string;
		onFail?: (error: Error) => string;
	},
): Promise<T> {
	const spinner = startLoading(text);

	try {
		const result = await fn();
		const successMsg =
			options?.onSuccess?.(result) || options?.successText || spinner.text;
		spinner.succeed(successMsg);
		return result;
	} catch (error) {
		const err = error instanceof Error ? error : new Error(String(error));
		const failMsg =
			options?.onFail?.(err) || options?.failText || `Failed: ${err.message}`;
		spinner.fail(failMsg);
		throw error;
	}
}

/**
 * Execute an async operation with persistent spinner
 * Returns the spinner so you can update the text during long operations
 */
export function withLoadingPersistent(text: string): {
	spinner: Ora;
	promise: <T>(fn: () => Promise<T>) => Promise<T>;
} {
	const spinner = startLoading(text);

	const promise = async <T>(fn: () => Promise<T>): Promise<T> => {
		try {
			const result = await fn();
			spinner.succeed();
			return result;
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			spinner.fail(err.message);
			throw error;
		}
	};

	return { spinner, promise };
}
