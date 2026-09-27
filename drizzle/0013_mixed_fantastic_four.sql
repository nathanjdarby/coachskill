PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_discovery_calls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`email` text NOT NULL,
	`company` text NOT NULL,
	`interests` text,
	`audience` text,
	`team_size` text,
	`support` text,
	`start_timeline` text,
	`anything_else` text,
	`persona` text,
	`goal` text,
	`challenges` text,
	`declined_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_discovery_calls`("id", "full_name", "email", "company", "anything_else", "persona", "goal", "challenges", "declined_at", "created_at") SELECT "id", "full_name", "email", "company", "anything_else", "persona", "goal", "challenges", "declined_at", "created_at" FROM `discovery_calls`;--> statement-breakpoint
DROP TABLE `discovery_calls`;--> statement-breakpoint
ALTER TABLE `__new_discovery_calls` RENAME TO `discovery_calls`;--> statement-breakpoint
PRAGMA foreign_keys=ON;