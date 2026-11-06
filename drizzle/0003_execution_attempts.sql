CREATE TABLE `execution_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`execution_id` text NOT NULL,
	`attempt_number` integer NOT NULL,
	`source` text DEFAULT 'LIVE' NOT NULL,
	`status` text DEFAULT 'RUNNING' NOT NULL,
	`request_summary` text,
	`result_summary` text,
	`error_message` text,
	`started_at` integer,
	`finished_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`execution_id`) REFERENCES `executions`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "execution_attempts_number_nonnegative" CHECK("execution_attempts"."attempt_number" >= 0),
	CONSTRAINT "execution_attempts_status_check" CHECK("execution_attempts"."status" in ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED')),
	CONSTRAINT "execution_attempts_source_check" CHECK("execution_attempts"."source" in ('LIVE', 'LEGACY_AGGREGATE'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `execution_attempts_execution_number_unique` ON `execution_attempts` (`execution_id`,`attempt_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `execution_attempts_one_running_unique` ON `execution_attempts` (`execution_id`) WHERE "execution_attempts"."status" = 'RUNNING';--> statement-breakpoint
CREATE INDEX `execution_attempts_execution_number_idx` ON `execution_attempts` (`execution_id`,`attempt_number`);--> statement-breakpoint
INSERT INTO `execution_attempts` (`id`,`execution_id`,`attempt_number`,`source`,`status`,`request_summary`,`result_summary`,`error_message`,`started_at`,`finished_at`,`created_at`)
SELECT 'legacy-attempt-' || `id`, `id`, 0, 'LEGACY_AGGREGATE', `status`, `request_summary`, `result_summary`, `error_message`, `started_at`, `finished_at`, `created_at`
FROM `executions`;
