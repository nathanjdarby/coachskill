ALTER TABLE `client_notes` ADD `session_id` integer;--> statement-breakpoint
ALTER TABLE `coaching_sessions` ADD `recap` text;--> statement-breakpoint
ALTER TABLE `coaching_sessions` ADD `follow_up_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `coaching_sessions` ADD `follow_up_sent_at` integer;