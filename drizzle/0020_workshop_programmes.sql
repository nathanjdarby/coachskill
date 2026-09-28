CREATE TABLE `workshop_programmes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`intro` text DEFAULT '' NOT NULL,
	`outcomes_json` text DEFAULT '[]' NOT NULL,
	`highlights_json` text DEFAULT '[]' NOT NULL,
	`image_key` text,
	`show_team_section` integer DEFAULT true NOT NULL,
	`duration_minutes` integer DEFAULT 150 NOT NULL,
	`capacity` integer,
	`deposit_pence` integer DEFAULT 2500 NOT NULL,
	`balance_pence` integer DEFAULT 37400 NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workshop_programmes_slug_unique` ON `workshop_programmes` (`slug`);--> statement-breakpoint
ALTER TABLE `workshops` ADD `programme_id` integer REFERENCES workshop_programmes(id);--> statement-breakpoint
INSERT INTO `workshop_programmes` (`slug`,`category`,`title`,`summary`,`intro`,`outcomes_json`,`highlights_json`,`image_key`,`show_team_section`,`duration_minutes`,`capacity`,`deposit_pence`,`balance_pence`,`published`,`created_at`)
SELECT 'value-selling','value_selling','Value Selling Training','Turn feature-heavy pitches into value-led stories that keep customers engaged.','A focused 2.5-hour small-group workshop that transforms how you pitch — from feature-heavy explanations to value-led storytelling that keeps customers engaged. Maximum 5 people, so every pitch gets real feedback.','[{"title": "Pitch for results", "description": "Pitch in a way that can increase your sales by up to 30%."}, {"title": "Clear structure", "description": "A clear value-selling pitch structure that guides the customer through the conversation."}, {"title": "Engaged customers", "description": "Keep customers engaged throughout the entire pitch, not just at the start."}, {"title": "Value-led storytelling", "description": "Replace feature-heavy explanations with value-led storytelling."}, {"title": "Greater confidence", "description": "Build greater confidence in customer conversations."}, {"title": "Simple language", "description": "Use simple, human language so customers instantly understand what you’re offering."}]','[{"title": "Small group, max 5", "description": "Enough people to practise with, small enough that every pitch gets personal feedback."}, {"title": "Learn from each other", "description": "Hear how others sell, swap what works and grow your network."}, {"title": "Keep the momentum", "description": "Continue with group mentoring or 1:1 coaching as part of the wider Coach Skill programme."}]','/assets/value-selling-poster.png',1,
  coalesce((SELECT `duration_minutes` FROM `workshops` ORDER BY `starts_at` DESC LIMIT 1),150),
  coalesce((SELECT `capacity` FROM `workshops` ORDER BY `starts_at` DESC LIMIT 1),5),
  coalesce((SELECT `deposit_pence` FROM `workshops` ORDER BY `starts_at` DESC LIMIT 1),2500),
  coalesce((SELECT `balance_pence` FROM `workshops` ORDER BY `starts_at` DESC LIMIT 1),37400),
  1,1790619688495;--> statement-breakpoint
UPDATE `workshops` SET `programme_id` = (SELECT `id` FROM `workshop_programmes` WHERE `slug` = 'value-selling');