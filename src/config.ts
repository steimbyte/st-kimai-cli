import * as fs from "fs";
import * as path from "path";
import type { AuthConfig } from "./types.js";

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
			console.error(
				`⚠️  Warning: Config file has permissive permissions (${mode.toString(8)}). Consider running: chmod 600 ${configPath}`,
			);
		}
	} catch {
		// Ignore - file might not exist (already handled above)
	}

	try {
		const content = fs.readFileSync(configPath, "utf-8");
		let config: AuthConfig;
		try {
			config = JSON.parse(content) as AuthConfig;
		} catch (error) {
			throw new Error(`Invalid auth.json: ${(error as Error).message}`);
		}

		if (!config.url || !config.apiKey) {
			throw new Error(
				`Invalid auth.json: missing 'url' or 'apiKey'\n` +
					`File: ${configPath}`,
			);
		}

		return config;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			throw new Error(`Config file not found: ${configPath}`);
		}
		// Preserve stack trace for debugging
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Failed to read config: ${message}`);
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
