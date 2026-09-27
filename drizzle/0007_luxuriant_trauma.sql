ALTER TABLE `clients` ADD `kind` text DEFAULT 'client' NOT NULL;--> statement-breakpoint
ALTER TABLE `signups` ADD `client_id` integer;--> statement-breakpoint
-- Link existing bookings to existing clients with the same email.
UPDATE `signups` SET `client_id` = (SELECT `id` FROM `clients` WHERE lower(`clients`.`email`) = lower(`signups`.`email`)) WHERE `client_id` IS NULL;
