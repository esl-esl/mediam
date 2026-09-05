CREATE TABLE `materials` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`subject_id` text,
	`name` text NOT NULL,
	`label` text DEFAULT 'Материал' NOT NULL,
	`kind` text DEFAULT 'file' NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`r2_key` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_materials_user_subject` ON `materials` (`user_id`,`subject_id`);--> statement-breakpoint
CREATE INDEX `idx_materials_user_created` ON `materials` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `planner_states` (
	`user_id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
PRAGMA optimize;
