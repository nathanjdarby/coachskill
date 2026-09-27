ALTER TABLE `signups` ADD `reminder_24h_sent_at` integer;--> statement-breakpoint
ALTER TABLE `signups` ADD `reminder_1h_sent_at` integer;--> statement-breakpoint
ALTER TABLE `workshops` ADD `location_mode` text DEFAULT 'in_person' NOT NULL;--> statement-breakpoint
ALTER TABLE `workshops` ADD `meeting_url` text;--> statement-breakpoint
ALTER TABLE `workshops` ADD `ics_sequence` integer DEFAULT 0 NOT NULL;