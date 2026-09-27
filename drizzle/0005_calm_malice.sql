CREATE TABLE `availability_blocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`reason` text
);
--> statement-breakpoint
CREATE TABLE `availability_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`weekday` integer NOT NULL,
	`start_minute` integer NOT NULL,
	`end_minute` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `booking_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`buffer_minutes` integer DEFAULT 15 NOT NULL,
	`min_notice_hours` integer DEFAULT 24 NOT NULL,
	`max_advance_days` integer DEFAULT 42 NOT NULL,
	`slot_step_minutes` integer DEFAULT 30 NOT NULL,
	`cancel_cutoff_hours` integer DEFAULT 24 NOT NULL,
	`default_meeting_url` text
);
--> statement-breakpoint
ALTER TABLE `coaching_sessions` ADD `booked_by` text DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE `coaching_sessions` ADD `cancelled_at` integer;--> statement-breakpoint
ALTER TABLE `coaching_sessions` ADD `cancelled_by` text;--> statement-breakpoint
ALTER TABLE `coaching_sessions` ADD `reminder_24h_sent_at` integer;--> statement-breakpoint
ALTER TABLE `coaching_sessions` ADD `reminder_1h_sent_at` integer;--> statement-breakpoint
ALTER TABLE `coaching_sessions` ADD `ics_sequence` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `coaching_sessions` ADD `updated_at` integer;--> statement-breakpoint
INSERT OR IGNORE INTO `booking_settings` (`id`) VALUES (1);--> statement-breakpoint
UPDATE `coaching_sessions` SET `updated_at` = `created_at`;--> statement-breakpoint
-- Sessions already started don't need reminders.
UPDATE `coaching_sessions` SET `reminder_24h_sent_at` = `created_at`, `reminder_1h_sent_at` = `created_at` WHERE `starts_at` <= (strftime('%s','now') * 1000);
