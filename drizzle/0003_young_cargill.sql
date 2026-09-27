CREATE TABLE `stripe_events` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`received_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `signups` ADD `deposit_paid_at` integer;--> statement-breakpoint
ALTER TABLE `signups` ADD `amount_paid_pence` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `signups` ADD `confirmation_sent_at` integer;--> statement-breakpoint
ALTER TABLE `signups` ADD `balance_request_sent_at` integer;--> statement-breakpoint
ALTER TABLE `signups` ADD `balance_reminder_sent_at` integer;--> statement-breakpoint
ALTER TABLE `signups` ADD `balance_checkout_session_id` text;--> statement-breakpoint
ALTER TABLE `signups` ADD `balance_paid_at` integer;--> statement-breakpoint
ALTER TABLE `workshops` ADD `starts_at` integer;--> statement-breakpoint
ALTER TABLE `workshops` ADD `duration_minutes` integer DEFAULT 150 NOT NULL;--> statement-breakpoint
ALTER TABLE `workshops` ADD `location` text;--> statement-breakpoint
ALTER TABLE `workshops` ADD `capacity` integer;--> statement-breakpoint
ALTER TABLE `workshops` ADD `deposit_pence` integer DEFAULT 2500 NOT NULL;--> statement-breakpoint
ALTER TABLE `workshops` ADD `balance_pence` integer DEFAULT 37400 NOT NULL;--> statement-breakpoint
ALTER TABLE `workshops` ADD `published` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `workshops` ADD `updated_at` integer;--> statement-breakpoint
-- Existing Stripe signups paid the £25 deposit; don't send them a retroactive confirmation.
UPDATE `signups` SET `deposit_paid_at` = `created_at`, `amount_paid_pence` = 2500, `confirmation_sent_at` = `created_at` WHERE `source` = 'stripe';--> statement-breakpoint
UPDATE `workshops` SET `updated_at` = `created_at`;
