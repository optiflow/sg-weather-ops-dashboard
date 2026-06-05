ALTER TABLE `locations` ADD `label` text;--> statement-breakpoint
ALTER TABLE `locations` ADD `is_favorite` integer DEFAULT false NOT NULL;