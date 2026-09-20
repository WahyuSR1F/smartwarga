CREATE TABLE `announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`publishedAt` integer,
	`createdBy` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `announcements_org_idx` ON `announcements` (`organizationId`);--> statement-breakpoint
CREATE UNIQUE INDEX `announcements_slug_idx` ON `announcements` (`organizationId`,`slug`);--> statement-breakpoint
CREATE INDEX `announcements_status_idx` ON `announcements` (`status`);