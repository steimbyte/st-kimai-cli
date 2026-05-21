/**
 * Kimai API Type Definitions
 * TypeScript interfaces for Kimai v1 API entities
 */

// Kimai API Types

/**
 * Authentication configuration
 */
export interface AuthConfig {
	url: string;
	apiKey: string;
}

/**
 * Timesheet entry representing a work log
 */
export interface Timesheet {
	id: number;
	activity: number | Activity | null;
	project: number | Project | null;
	user: number | User | null;
	tags: string[];
	begin: string;
	end: string | null;
	duration: number | null;
	break: number;
	description: string | null;
	rate: number;
	internalRate: number;
	exported: boolean;
	billable: boolean;
	metaFields: MetaField[];
}

/**
 * Project entity
 */
export interface Project {
	id: number;
	name: string;
	parentTitle: string | null;
	customer: number | Customer | null;
	color: string;
	visible: boolean;
	billable: boolean;
	start: string | null;
	end: string | null;
	comment: string | null;
	globalActivities: boolean;
	teams: Team[];
	metaFields: MetaField[];
}

/**
 * Customer entity
 */
export interface Customer {
	id: number;
	name: string;
	number: string | null;
	comment: string | null;
	color: string;
	visible: boolean;
	billable: boolean;
	country: string;
	currency: string;
	timezone: string;
	teams: Team[];
	metaFields: MetaField[];
}

/**
 * Activity entity
 */
export interface Activity {
	id: number;
	name: string;
	parentTitle: string | null;
	project: number | Project | null;
	color: string;
	visible: boolean;
	billable: boolean;
	comment: string | null;
	globalActivities: boolean;
	teams: Team[];
	metaFields: MetaField[];
}

/**
 * User entity
 */
export interface User {
	id: number;
	username: string;
	email: string;
	alias: string | null;
	title: string | null;
	enabled: boolean;
	color: string;
	timezone: string;
	locale: string;
	language: string;
	initials: string;
}

/**
 * Team entity
 */
export interface Team {
	id: number;
	name: string;
	color: string;
}

/**
 * Meta field attached to entities
 */
export interface MetaField {
	name: string;
	value: string;
}

/**
 * Options for creating a new timesheet
 */
export interface CreateTimesheetOptions {
	project: number;
	activity: number;
	description?: string;
	begin: string;
	end?: string;
	tags?: string[];
}

/**
 * Query options for listing timesheets
 */
export interface ListTimesheetsOptions {
	project?: number;
	activity?: number;
	user?: number;
	begin?: string;
	end?: string;
	state?: "active" | "stopped";
	billable?: boolean;
	exported?: boolean;
	full?: boolean;
	page?: number;
	size?: number;
}

/**
 * Plugin information
 */
export interface Plugin {
	name: string;
	version: string;
}

/**
 * API version information
 */
export interface Version {
	version: string;
	versionId: number;
	copyright: string;
}
