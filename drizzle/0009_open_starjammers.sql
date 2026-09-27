CREATE TABLE `event_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`duration_minutes` integer,
	`buffer_minutes` integer,
	`audience` text NOT NULL,
	`location_mode` text DEFAULT 'jitsi' NOT NULL,
	`custom_url` text,
	`colour` text DEFAULT '#22d3ee' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_types_slug_unique` ON `event_types` (`slug`);--> statement-breakpoint
-- Built-in event types.
INSERT INTO `event_types` (`name`, `slug`, `duration_minutes`, `audience`, `location_mode`, `colour`, `sort_order`, `created_at`, `updated_at`) VALUES
  ('Discovery call', 'discovery-call', 30, 'invite_only', 'jitsi', '#a78bfa', 0, strftime('%s','now') * 1000, strftime('%s','now') * 1000),
  ('1:1 coaching', 'coaching-1-1', NULL, 'clients_with_credits', 'jitsi', '#22d3ee', 1, strftime('%s','now') * 1000, strftime('%s','now') * 1000);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_coaching_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer,
	`event_type_id` integer,
	`discovery_call_id` integer,
	`invitee_name` text,
	`invitee_email` text,
	`location_mode` text DEFAULT 'custom' NOT NULL,
	`location_text` text,
	`manage_token_hash` text,
	`notes` text,
	`client_package_id` integer,
	`title` text NOT NULL,
	`starts_at` integer NOT NULL,
	`duration_minutes` integer NOT NULL,
	`meeting_url` text,
	`booked_by` text DEFAULT 'admin' NOT NULL,
	`cancelled_at` integer,
	`cancelled_by` text,
	`reminder_24h_sent_at` integer,
	`reminder_1h_sent_at` integer,
	`ics_sequence` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_type_id`) REFERENCES `event_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`discovery_call_id`) REFERENCES `discovery_calls`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_package_id`) REFERENCES `client_packages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_coaching_sessions`("id", "client_id", "client_package_id", "title", "starts_at", "duration_minutes", "meeting_url", "booked_by", "cancelled_at", "cancelled_by", "reminder_24h_sent_at", "reminder_1h_sent_at", "ics_sequence", "created_at", "updated_at") SELECT "id", "client_id", "client_package_id", "title", "starts_at", "duration_minutes", "meeting_url", "booked_by", "cancelled_at", "cancelled_by", "reminder_24h_sent_at", "reminder_1h_sent_at", "ics_sequence", "created_at", "updated_at" FROM `coaching_sessions`;--> statement-breakpoint
DROP TABLE `coaching_sessions`;--> statement-breakpoint
ALTER TABLE `__new_coaching_sessions` RENAME TO `coaching_sessions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `coaching_sessions_manage_token_hash_unique` ON `coaching_sessions` (`manage_token_hash`);--> statement-breakpoint
-- Existing sessions are 1:1 coaching and keep their own meeting links.
UPDATE `coaching_sessions` SET `event_type_id` = (SELECT `id` FROM `event_types` WHERE `slug` = 'coaching-1-1') WHERE `event_type_id` IS NULL;