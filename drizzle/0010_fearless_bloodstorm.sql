CREATE TABLE `booking_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`secret` text NOT NULL,
	`event_type_id` integer NOT NULL,
	`discovery_call_id` integer,
	`invitee_name` text NOT NULL,
	`invitee_email` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`appointment_id` integer,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_type_id`) REFERENCES `event_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`discovery_call_id`) REFERENCES `discovery_calls`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`appointment_id`) REFERENCES `coaching_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
