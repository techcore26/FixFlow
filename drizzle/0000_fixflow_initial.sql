CREATE TABLE `approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`incident_id` text NOT NULL,
	`investigation_id` text NOT NULL,
	`decision` text NOT NULL,
	`actor` text NOT NULL,
	`rationale` text,
	`proposed_action_snapshot` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`investigation_id`) REFERENCES `investigations`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "approvals_decision_check" CHECK("approvals"."decision" in ('APPROVED', 'REJECTED', 'NO_ACTION_REQUIRED'))
);
--> statement-breakpoint
CREATE INDEX `approvals_incident_idx` ON `approvals` (`incident_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `approvals_investigation_unique` ON `approvals` (`investigation_id`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`incident_id` text NOT NULL,
	`actor` text NOT NULL,
	`event_type` text NOT NULL,
	`previous_status` text,
	`new_status` text,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `audit_events_incident_created_idx` ON `audit_events` (`incident_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_events_type_idx` ON `audit_events` (`event_type`);--> statement-breakpoint
CREATE TABLE `executions` (
	`id` text PRIMARY KEY NOT NULL,
	`incident_id` text NOT NULL,
	`approval_id` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`idempotency_key` text NOT NULL,
	`request_summary` text,
	`result_summary` text,
	`error_message` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`started_at` integer,
	`finished_at` integer,
	FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`approval_id`) REFERENCES `approvals`(`id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT "executions_status_check" CHECK("executions"."status" in ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED'))
);
--> statement-breakpoint
CREATE INDEX `executions_incident_idx` ON `executions` (`incident_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `executions_approval_unique` ON `executions` (`approval_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `executions_idempotency_key_unique` ON `executions` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`severity` text NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`closed_at` integer,
	CONSTRAINT "incidents_version_positive" CHECK("incidents"."version" >= 1),
	CONSTRAINT "incidents_status_check" CHECK("incidents"."status" in ('OPEN', 'INVESTIGATING', 'AWAITING_APPROVAL', 'APPROVED', 'EXECUTING', 'RESOLVED', 'CLOSED', 'REJECTED', 'FAILED', 'NO_ACTION_REQUIRED')),
	CONSTRAINT "incidents_severity_check" CHECK("incidents"."severity" in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);
--> statement-breakpoint
CREATE INDEX `incidents_status_idx` ON `incidents` (`status`);--> statement-breakpoint
CREATE INDEX `incidents_created_at_idx` ON `incidents` (`created_at`);--> statement-breakpoint
CREATE TABLE `investigations` (
	`id` text PRIMARY KEY NOT NULL,
	`incident_id` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`external_reference` text,
	`findings` text,
	`proposed_resolution` text,
	`error_message` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "investigations_status_check" CHECK("investigations"."status" in ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED'))
);
--> statement-breakpoint
CREATE INDEX `investigations_incident_idx` ON `investigations` (`incident_id`);--> statement-breakpoint
CREATE INDEX `investigations_status_idx` ON `investigations` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `investigations_external_reference_unique` ON `investigations` (`external_reference`);