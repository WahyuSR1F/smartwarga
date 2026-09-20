CREATE TABLE `forum_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`postId` text NOT NULL,
	`reporterId` integer NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`postId`) REFERENCES `forum_posts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reporterId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `forum_reports_post_idx` ON `forum_reports` (`postId`);--> statement-breakpoint
CREATE INDEX `forum_reports_status_idx` ON `forum_reports` (`status`);