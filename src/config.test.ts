import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { loadAuthConfig, getConfigPath } from "./config";

// Mock fs module
vi.mock("fs");

// Helper to create temp config file
function createTempConfig(content: string, path: string): void {
	vi.mocked(fs.existsSync).mockReturnValue(true);
	vi.mocked(fs.readFileSync).mockReturnValue(content);
	vi.mocked(fs.statSync).mockReturnValue({
		mode: 0o644,
		isFile: () => true,
	} as unknown as fs.Stats);
}

describe("config", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset environment
		delete process.env.KIMAI_API_KEY;
		delete process.env.KIMAI_API_URL;
		delete process.env.KIMAI_URL;
		delete process.env.KIMAI_STRICT_PERMS;
		vi.mocked(fs.existsSync).mockReturnValue(false);
		vi.mocked(fs.readFileSync).mockImplementation(() => {
			throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
		});
		vi.mocked(fs.statSync).mockImplementation(() => {
			throw new Error("ENOENT");
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("environment variable precedence", () => {
		it("should use KIMAI_API_KEY from env when set", () => {
			process.env.KIMAI_API_KEY = "env-api-key-123";
			process.env.KIMAI_URL = "https://env.kimai.example.com";

			const config = loadAuthConfig();

			expect(config.apiKey).toBe("env-api-key-123");
			expect(config.url).toBe("https://env.kimai.example.com");
		});

		it("should use default URL when KIMAI_URL not set but KIMAI_API_KEY is", () => {
			process.env.KIMAI_API_KEY = "env-api-key";

			const config = loadAuthConfig();

			expect(config.apiKey).toBe("env-api-key");
			expect(config.url).toBe("https://kimai.example.com");
		});

		it("should prefer KIMAI_URL over KIMAI_API_URL", () => {
			process.env.KIMAI_API_KEY = "env-api-key";
			process.env.KIMAI_URL = "https://primary.example.com";
			process.env.KIMAI_API_URL = "https://secondary.example.com";

			const config = loadAuthConfig();

			expect(config.url).toBe("https://primary.example.com");
		});

		it("should fall back to KIMAI_API_URL when KIMAI_URL not set", () => {
			process.env.KIMAI_API_KEY = "env-api-key";
			process.env.KIMAI_API_URL = "https://fallback.example.com";

			const config = loadAuthConfig();

			expect(config.url).toBe("https://fallback.example.com");
		});

		it("should skip config file lookup when env var is set", () => {
			process.env.KIMAI_API_KEY = "env-api-key";
			vi.mocked(fs.existsSync).mockReturnValue(true);

			const config = loadAuthConfig();

			expect(config.apiKey).toBe("env-api-key");
			// Should not try to read file
			expect(vi.mocked(fs.readFileSync)).not.toHaveBeenCalled();
		});
	});

	describe("missing config error", () => {
		it("should throw when no config file and no env vars", () => {
			expect(() => loadAuthConfig()).toThrow(/No auth.json found/);
		});

		it("should throw with helpful message listing possible locations", () => {
			try {
				loadAuthConfig();
				throw new Error("Should have thrown");
			} catch (error) {
				expect((error as Error).message).toContain("auth.json");
				expect((error as Error).message).toContain(".kimai-cli/auth.json");
			}
		});

		it("should throw when specified config file does not exist", () => {
			vi.mocked(fs.existsSync).mockReturnValue(false);

			expect(() => loadAuthConfig("/nonexistent/path.json")).toThrow();
		});
	});

	describe("invalid JSON handling", () => {
		it("should throw on invalid JSON syntax", () => {
			createTempConfig("{ invalid json }", "./auth.json");

			expect(() => loadAuthConfig()).toThrow(/Invalid auth.json/);
		});

		it("should throw on empty file", () => {
			createTempConfig("", "./auth.json");

			expect(() => loadAuthConfig()).toThrow(/Invalid auth.json/);
		});

		it("should throw on missing url field", () => {
			createTempConfig('{"apiKey": "test-key"}', "./auth.json");

			expect(() => loadAuthConfig()).toThrow(/missing 'url' or 'apiKey'/);
		});

		it("should throw on missing apiKey field", () => {
			createTempConfig('{"url": "https://kimai.example.com"}', "./auth.json");

			expect(() => loadAuthConfig()).toThrow(/missing 'url' or 'apiKey'/);
		});

		it("should throw on null values", () => {
			createTempConfig(
				'{"url": null, "apiKey": null}',
				"./auth.json",
			);

			expect(() => loadAuthConfig()).toThrow(/missing 'url' or 'apiKey'/);
		});

		it("should throw on empty string values", () => {
			createTempConfig('{"url": "", "apiKey": ""}', "./auth.json");

			expect(() => loadAuthConfig()).toThrow(/missing 'url' or 'apiKey'/);
		});

		it("should accept valid minimal config", () => {
			createTempConfig(
				'{"url": "https://kimai.example.com", "apiKey": "valid-key"}',
				"./auth.json",
			);

			const config = loadAuthConfig();

			expect(config.url).toBe("https://kimai.example.com");
			expect(config.apiKey).toBe("valid-key");
		});
	});

	describe("permission warning", () => {
		it("should warn on world-readable config file", () => {
			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue(
				'{"url": "https://example.com", "apiKey": "key"}',
			);
			vi.mocked(fs.statSync).mockReturnValue({
				mode: 0o644, // rw-r--r--
				isFile: () => true,
			} as unknown as fs.Stats);

			// Capture console.error output
			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			loadAuthConfig();

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("Warning"),
			);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("permissions"),
			);

			consoleSpy.mockRestore();
		});

		it("should warn on group-readable config file", () => {
			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue(
				'{"url": "https://example.com", "apiKey": "key"}',
			);
			vi.mocked(fs.statSync).mockReturnValue({
				mode: 0o664, // rw-rw-r--
				isFile: () => true,
			} as unknown as fs.Stats);

			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			loadAuthConfig();

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("Warning"),
			);

			consoleSpy.mockRestore();
		});

		it("should error in strict mode on insecure permissions", () => {
			process.env.KIMAI_STRICT_PERMS = "1";
			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue(
				'{"url": "https://example.com", "apiKey": "key"}',
			);
			vi.mocked(fs.statSync).mockReturnValue({
				mode: 0o644,
				isFile: () => true,
			} as unknown as fs.Stats);

			expect(() => loadAuthConfig()).toThrow(/SECURITY/);
			expect(() => loadAuthConfig()).toThrow(/insecure permissions/);
			expect(() => loadAuthConfig()).toThrow(/chmod 600/);
		});

		it("should not warn on secure permissions (600)", () => {
			vi.mocked(fs.existsSync).mockReturnValue(true);
			vi.mocked(fs.readFileSync).mockReturnValue(
				'{"url": "https://example.com", "apiKey": "key"}',
			);
			vi.mocked(fs.statSync).mockReturnValue({
				mode: 0o600, // rw-------
				isFile: () => true,
			} as unknown as fs.Stats);

			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			loadAuthConfig();

			expect(consoleSpy).not.toHaveBeenCalled();

			consoleSpy.mockRestore();
		});
	});

	describe("getConfigPath", () => {
		it("should return null when no config exists", () => {
			vi.mocked(fs.existsSync).mockReturnValue(false);

			expect(getConfigPath()).toBeNull();
		});

		it("should return path when config exists", () => {
			vi.mocked(fs.existsSync).mockReturnValue(true);

			const result = getConfigPath();

			expect(result).toBeTruthy();
		});
	});

	describe("config file precedence", () => {
		it("should prefer local auth.json over home directory", () => {
			vi.mocked(fs.existsSync).mockImplementation((p) => {
				const pathStr = typeof p === "string" ? p : String(p);
				return pathStr.includes("workspace") || pathStr.includes(".kimai-cli");
			});
			vi.mocked(fs.readFileSync).mockReturnValue(
				'{"url": "https://local.example.com", "apiKey": "local-key"}',
			);
			vi.mocked(fs.statSync).mockReturnValue({
				mode: 0o600,
				isFile: () => true,
			} as unknown as fs.Stats);

			const config = loadAuthConfig();

			expect(config.url).toContain("local");
		});
	});
});
