CREATE TABLE `switch_investigation_jobs` (
  `id` text PRIMARY KEY NOT NULL, `request_id` text NOT NULL, `incident_id` text NOT NULL, `investigation_id` text NOT NULL,
  `status` text DEFAULT 'PENDING' NOT NULL, `expected_room_id` text NOT NULL, `expected_sender_id` text NOT NULL,
  `outbound_event_id` text, `reply_message_id` text, `candidate_json` text, `response_evidence` text, `error_code` text, `error_message` text,
  `attempts` integer DEFAULT 0 NOT NULL, `lease_owner` text, `lease_expires_at` integer, `deadline_at` integer NOT NULL, `sent_at` integer, `received_at` integer,
  `created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL, `updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`id`) ON UPDATE cascade ON DELETE cascade,
  FOREIGN KEY (`investigation_id`) REFERENCES `investigations`(`id`) ON UPDATE cascade ON DELETE cascade,
  CONSTRAINT "switch_jobs_attempts_nonnegative" CHECK("switch_investigation_jobs"."attempts" >= 0),
  CONSTRAINT "switch_jobs_status_check" CHECK("switch_investigation_jobs"."status" in ('PENDING', 'DISPATCHING', 'SENT', 'DELIVERY_UNKNOWN', 'RESPONSE_RECEIVED', 'RESPONSE_REJECTED', 'TIMED_OUT', 'FAILED'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `switch_jobs_request_unique` ON `switch_investigation_jobs` (`request_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `switch_jobs_investigation_unique` ON `switch_investigation_jobs` (`investigation_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `switch_jobs_reply_message_unique` ON `switch_investigation_jobs` (`reply_message_id`);--> statement-breakpoint
CREATE INDEX `switch_jobs_status_deadline_idx` ON `switch_investigation_jobs` (`status`,`deadline_at`);--> statement-breakpoint
CREATE INDEX `switch_jobs_incident_idx` ON `switch_investigation_jobs` (`incident_id`);
