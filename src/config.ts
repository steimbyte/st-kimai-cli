import * as fs from "fs";
import * as path from "path";
import type { AuthConfig } from "./types.js";

/**
 * Type guard to check if error is a Node.js error with code property
 */
function isNodeError(error: unknown): error is NodeJS.ErrnoException {
	return error instanceof Error && "code" in error;
}

/**
 * Type guard to validate AuthConfig structure
 */
function isAuthConfig(value: unknown): value is AuthConfig {
	if (value === null || typeof value !== "object") {
		return false;
	}
	const obj = value as Record<string, unknown>;
	return typeof obj.url === "string" && typeof obj.apiKey === "string";
}

const CONFIG_FILES = [
	"./auth.json",
	path.join(process.env.HOME || "", ".kimai-cli", "auth.json"),
];

export function loadAuthConfig(configFile?: string): AuthConfig {
	const configPaths = configFile ? [path.resolve(configFile)] : CONFIG_FILES;

	// Check for environment variables first
	const envUrl = process.env.KIMAI_URL || process.env.KIMAI_API_URL;
	const envApiKey = process.env.KIMAI_API_KEY;

	if (envApiKey) {
		console.error(`Using API key from KIMAI_API_KEY environment variable`);
		return {
			url: envUrl || "https://kimai.example.com",
			apiKey: envApiKey,
		};
	}

	// Find config file
	const resolvedPaths = configPaths.map((p) =>
		p.startsWith("/") ? p : path.resolve(p),
	);
	let foundPath: string | null = null;
	for (const p of resolvedPaths) {
		if (fs.existsSync(p)) {
			foundPath = p;
			break;
		}
	}

	if (!foundPath) {
		throw new Error(
			`No auth.json found. Please create one of:\n` +
				resolvedPaths.map((f) => `  - ${f}`).join("\n") +
				`\n\nSee auth.json.example for the required format.`,
		);
	}

	const configPath = foundPath;

	// Check file permissions (Unix-like systems)
	try {
		const stats = fs.statSync(configPath);
		const mode = stats.mode & 0o777;
		if (mode & 0o077) {
			const permStr = mode.toString(8);
			// Strict mode: exit with error for insecure permissions
			if (process.env.KIMAI_STRICT_PERMS === "1") {
				throw new Error(
					`SECURITY: Config file has insecure permissions (${permStr}). ` +
						`API key may be readable by others. Run: chmod 600 ${configPath}`,
				);
			}
			console.error(
				`⚠️  Warning: Config file has permissive permissions (${permStr}). ` +
					`Consider running: chmod 600 ${configPath}`,
			);
		}
	} catch (error) {
		// Re-throw security errors
		if (error instanceof Error && error.message.includes("SECURITY")) {
			throw error;
		}
		// Ignore - file might not exist (already handled above)
	}

	try {
		const content = fs.readFileSync(configPath, "utf-8");
		let config: AuthConfig;
		try {
			const parsed = JSON.parse(content);
			if (isAuthConfig(parsed)) {
				config = parsed;
			} else {
				throw new Error("Invalid auth.json: missing 'url' or 'apiKey'");
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			throw new Error(`Invalid auth.json: ${errorMessage}`);
		}

		if (!config.url || !config.apiKey) {
			throw new Error(
				`Invalid auth.json: missing 'url' or 'apiKey'\n` +
					`File: ${configPath}`,
			);
		}

		return config;
	} catch (error) {
		if (isNodeError(error) && error.code === "ENOENT") {
			throw new Error(`Config file not found: ${configPath}`);
		}
		if (error instanceof Error) {
			throw new Error(`Failed to read config: ${error.message}`);
		}
		throw new Error(`Failed to read config: ${String(error)}`);
	}
}

function findConfigFile(): string | null {
	for (const configFile of CONFIG_FILES) {
		const resolved = path.resolve(configFile);
		if (fs.existsSync(resolved)) {
			return resolved;
		}
	}
	return null;
}

export function getConfigPath(): string | null {
	return findConfigFile();
}
