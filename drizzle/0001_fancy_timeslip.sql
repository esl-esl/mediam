ALTER TABLE `materials` ADD `lesson_id` text;--> statement-breakpoint
ALTER TABLE `materials` ADD `scope` text DEFAULT 'subject' NOT NULL;