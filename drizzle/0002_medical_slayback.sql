CREATE TABLE `organization_members` (
	`organizationId` text NOT NULL,
	`userId` integer NOT NULL,
	`role` text DEFAULT 'resident' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organization_members_pk` ON `organization_members` (`organizationId`,`userId`);--> statement-breakpoint
CREATE INDEX `organization_members_user_idx` ON `organization_members` (`userId`);--> statement-breakpoint
CREATE INDEX `organization_members_org_idx` ON `organization_members` (`organizationId`);