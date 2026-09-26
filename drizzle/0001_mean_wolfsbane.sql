CREATE TABLE `discovery_calls` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`full_name` text NOT NULL,
	`email` text NOT NULL,
	`company` text NOT NULL,
	`persona` text NOT NULL,
	`goal` text NOT NULL,
	`challenges` text NOT NULL,
	`anything_else` text,
	`created_at` integer NOT NULL
);
