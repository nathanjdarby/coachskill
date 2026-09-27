CREATE TABLE `client_packages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`package_id` integer NOT NULL,
	`name` text NOT NULL,
	`price_pence` integer NOT NULL,
	`session_count` integer NOT NULL,
	`session_minutes` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`source` text NOT NULL,
	`stripe_session_id` text,
	`paid_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`package_id`) REFERENCES `packages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `client_packages_stripe_session_id_unique` ON `client_packages` (`stripe_session_id`);--> statement-breakpoint
CREATE TABLE `packages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price_pence` integer NOT NULL,
	`session_count` integer NOT NULL,
	`session_minutes` integer DEFAULT 60 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `coaching_sessions` ADD `client_package_id` integer REFERENCES client_packages(id);