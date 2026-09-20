CREATE TABLE `event_reminder_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`eventId` text NOT NULL,
	`organizationId` text NOT NULL,
	`templateName` text NOT NULL,
	`minutesBefore` integer DEFAULT 1440 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`scheduleCronTaskUid` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `event_reminder_rules_event_idx` ON `event_reminder_rules` (`eventId`);--> statement-breakpoint
CREATE INDEX `event_reminder_rules_task_idx` ON `event_reminder_rules` (`scheduleCronTaskUid`);