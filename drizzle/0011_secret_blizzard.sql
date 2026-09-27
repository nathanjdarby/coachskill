CREATE TABLE `calendar_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`url` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`block_all_day` integer DEFAULT true NOT NULL,
	`last_fetched_at` integer,
	`last_success_at` integer,
	`last_error` text,
	`busy_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `external_busy` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_id` integer NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`all_day` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `calendar_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `external_busy_source_idx` ON `external_busy` (`source_id`);--> statement-breakpoint
CREATE INDEX `external_busy_starts_idx` ON `external_busy` (`starts_at`);--> statement-breakpoint
ALTER TABLE `booking_settings` ADD `feed_token` text;