import type {
	AuthConfig,
	Timesheet,
	Project,
	Customer,
	Activity,
	User,
	Team,
	Plugin,
	Version,
	CreateTimesheetOptions,
	ListTimesheetsOptions,
} from "./types.js";

export class KimaiApi {
	private baseUrl: string;
	private apiKey: string;
	private headers: Record<string, string>;

	constructor(config: AuthConfig) {
		this.baseUrl = `${config.url}/api`.replace(/\/+$/, "");
		this.apiKey = config.apiKey;
		this.headers = {
			Authorization: `Bearer ${this.apiKey}`,
			Accept: "application/json",
			"Content-Type": "application/json",
		};
	}

	private async request<T>(
		endpoint: string,
		options: RequestInit = {},
	): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`;
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 30000);

		let response: Response;
		try {
			response = await fetch(url, {
				...options,
				headers: {
					...this.headers,
					...options.headers,
				},
				signal: controller.signal,
			});
		} finally {
			clearTimeout(timeoutId);
		}

		if (!response.ok) {
			const error = await response
				.json()
				.catch(() => ({ message: response.statusText }));
			// Extract detailed error messages from Kimai API
			const errorData = error as {
				message?: string;
				errors?: { errors?: string[] };
			};
			let errorMessage = errorData.message || response.statusText;
			if (errorData.errors?.errors && errorData.errors.errors.length > 0) {
				errorMessage = errorData.errors.errors.join("; ");
			}
			throw new KimaiApiError(response.status, errorMessage);
		}

		// Handle 204 No Content
		if (response.status === 204) {
			return {} as T;
		}

		return response.json() as Promise<T>;
	}

	// System endpoints
	async ping(): Promise<{ message: string }> {
		return this.request("/ping");
	}

	async version(): Promise<Version> {
		return this.request("/version");
	}

	async plugins(): Promise<Plugin[]> {
		return this.request("/plugins");
	}

	// Timesheet endpoints
	async getTimesheets(
		options: ListTimesheetsOptions = {},
	): Promise<Timesheet[]> {
		const params = new URLSearchParams();

		if (options.project) params.set("project", options.project.toString());
		if (options.activity) params.set("activity", options.activity.toString());
		if (options.user) params.set("user", options.user.toString());
		if (options.begin) params.set("begin", options.begin);
		if (options.end) params.set("end", options.end);
		if (options.state === "active") params.set("active", "1");
		if (options.state === "stopped") params.set("state", "1");
		if (options.billable !== undefined)
			params.set("billable", options.billable.toString());
		if (options.exported !== undefined)
			params.set("exported", options.exported.toString());
		if (options.full) params.set("full", "true");
		if (options.page) params.set("page", options.page.toString());
		if (options.size) params.set("size", options.size.toString());

		const query = params.toString();
		return this.request(`/timesheets${query ? `?${query}` : ""}`);
	}

	async getActiveTimesheetsRaw(): Promise<Timesheet[]> {
		const params = new URLSearchParams();
		params.set("active", "1");
		return this.request(`/timesheets?${params.toString()}`);
	}

	async createTimesheet(options: CreateTimesheetOptions): Promise<Timesheet> {
		const body: Record<string, unknown> = {
			project: options.project,
			activity: options.activity,
		};

		if (options.description) body.description = options.description;
		if (options.begin) body.begin = options.begin;
		if (options.end) body.end = options.end;
		if (options.tags) body.tags = options.tags;

		return this.request("/timesheets", {
			method: "POST",
			body: JSON.stringify(body),
		});
	}

	async stopTimesheet(id: number, endTime: string): Promise<Timesheet> {
		return this.request(`/timesheets/${id}`, {
			method: "PATCH",
			body: JSON.stringify({ end: endTime }),
		});
	}

	async deleteTimesheet(id: number): Promise<void> {
		return this.request(`/timesheets/${id}`, {
			method: "DELETE",
		});
	}

	async updateTimesheet(
		id: number,
		updates: Record<string, unknown>,
	): Promise<Timesheet> {
		return this.request(`/timesheets/${id}`, {
			method: "PATCH",
			body: JSON.stringify(updates),
		});
	}

	// Project endpoints
	async getProjects(full = false): Promise<Project[]> {
		const query = full ? "?full=true" : "";
		return this.request(`/projects${query}`);
	}

	async getProject(id: number): Promise<Project> {
		return this.request(`/projects/${id}`);
	}

	// Customer endpoints
	async getCustomers(full = false): Promise<Customer[]> {
		const query = full ? "?full=true" : "";
		return this.request(`/customers${query}`);
	}

	async getCustomer(id: number): Promise<Customer> {
		return this.request(`/customers/${id}`);
	}

	// Activity endpoints
	async getActivities(full = false): Promise<Activity[]> {
		const query = full ? "?full=true" : "";
		return this.request(`/activities${query}`);
	}

	async getActivity(id: number): Promise<Activity> {
		return this.request(`/activities/${id}`);
	}

	// Tags endpoints
	async getTags(): Promise<string[]> {
		return this.request("/tags");
	}

	// User endpoints
	async getUsers(): Promise<User[]> {
		return this.request("/users");
	}

	// Teams endpoints
	async getTeams(): Promise<Team[]> {
		return this.request("/teams");
	}
}

export class KimaiApiError extends Error {
	constructor(
		public statusCode: number,
		message: string,
	) {
		super(message);
		this.name = "KimaiApiError";
	}
}
