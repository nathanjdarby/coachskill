CREATE TABLE `meeting_attendance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`appointment_id` integer,
	`workshop_id` integer,
	`signup_id` integer,
	`role` text NOT NULL,
	`name` text NOT NULL,
	`session_key` text NOT NULL,
	`joined_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`left_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meeting_attendance_session_key_unique` ON `meeting_attendance` (`session_key`);--> statement-breakpoint
CREATE INDEX `meeting_attendance_appointment_idx` ON `meeting_attendance` (`appointment_id`);--> statement-breakpoint
CREATE INDEX `meeting_attendance_workshop_idx` ON `meeting_attendance` (`workshop_id`);--> statement-breakpoint
ALTER TABLE `coaching_sessions` ADD `waiting_alert_sent_at` integer;