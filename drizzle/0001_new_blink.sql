CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actorId` integer,
	`action` text NOT NULL,
	`resource` text NOT NULL,
	`resourceId` text,
	`metadata` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_logs_resource_idx` ON `audit_logs` (`resource`,`resourceId`);--> statement-breakpoint
CREATE INDEX `audit_logs_actor_idx` ON `audit_logs` (`actorId`);--> statement-breakpoint
CREATE TABLE `billing_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`billingTypeId` text NOT NULL,
	`periodKey` text NOT NULL,
	`dueAt` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`billingTypeId`) REFERENCES `billing_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_periods_type_period_idx` ON `billing_periods` (`billingTypeId`,`periodKey`);--> statement-breakpoint
CREATE TABLE `billing_types` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`description` text,
	`unit` text DEFAULT 'household' NOT NULL,
	`defaultAmount` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `billing_types_org_idx` ON `billing_types` (`organizationId`);--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`targetAmount` integer DEFAULT 0 NOT NULL,
	`startsAt` integer,
	`endsAt` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `campaigns_org_idx` ON `campaigns` (`organizationId`);--> statement-breakpoint
CREATE UNIQUE INDEX `campaigns_slug_idx` ON `campaigns` (`organizationId`,`slug`);--> statement-breakpoint
CREATE TABLE `donations` (
	`id` text PRIMARY KEY NOT NULL,
	`campaignId` text NOT NULL,
	`donorId` integer,
	`amount` integer NOT NULL,
	`visibility` text DEFAULT 'named' NOT NULL,
	`proofFileId` text,
	`status` text DEFAULT 'submitted' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`donorId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `donations_campaign_idx` ON `donations` (`campaignId`);--> statement-breakpoint
CREATE INDEX `donations_status_idx` ON `donations` (`status`);--> statement-breakpoint
CREATE TABLE `event_registrations` (
	`eventId` text NOT NULL,
	`userId` integer NOT NULL,
	`status` text DEFAULT 'registered' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_registrations_pk` ON `event_registrations` (`eventId`,`userId`);--> statement-breakpoint
CREATE INDEX `event_registrations_user_idx` ON `event_registrations` (`userId`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`rtId` text,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`location` text,
	`startsAt` integer NOT NULL,
	`endsAt` integer,
	`capacity` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rtId`) REFERENCES `rt_units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `events_org_idx` ON `events` (`organizationId`);--> statement-breakpoint
CREATE INDEX `events_starts_idx` ON `events` (`startsAt`);--> statement-breakpoint
CREATE UNIQUE INDEX `events_slug_idx` ON `events` (`organizationId`,`slug`);--> statement-breakpoint
CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`ownerId` integer,
	`storageProvider` text DEFAULT 'supabase' NOT NULL,
	`bucket` text NOT NULL,
	`path` text NOT NULL,
	`filename` text NOT NULL,
	`mimeType` text NOT NULL,
	`size` integer NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `files_path_idx` ON `files` (`bucket`,`path`);--> statement-breakpoint
CREATE INDEX `files_owner_idx` ON `files` (`ownerId`);--> statement-breakpoint
CREATE TABLE `forum_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`topicId` text NOT NULL,
	`authorId` integer NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`topicId`) REFERENCES `forum_topics`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `forum_posts_topic_idx` ON `forum_posts` (`topicId`);--> statement-breakpoint
CREATE INDEX `forum_posts_author_idx` ON `forum_posts` (`authorId`);--> statement-breakpoint
CREATE TABLE `forum_topics` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`scopeType` text DEFAULT 'general' NOT NULL,
	`scopeId` text,
	`title` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `forum_topics_org_idx` ON `forum_topics` (`organizationId`);--> statement-breakpoint
CREATE INDEX `forum_topics_scope_idx` ON `forum_topics` (`scopeType`,`scopeId`);--> statement-breakpoint
CREATE TABLE `fund_usages` (
	`id` text PRIMARY KEY NOT NULL,
	`campaignId` text NOT NULL,
	`amount` integer NOT NULL,
	`description` text NOT NULL,
	`evidenceFileId` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `fund_usages_campaign_idx` ON `fund_usages` (`campaignId`);--> statement-breakpoint
CREATE TABLE `household_members` (
	`householdId` text NOT NULL,
	`userId` integer NOT NULL,
	`relationship` text,
	`isHead` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `household_members_pk` ON `household_members` (`householdId`,`userId`);--> statement-breakpoint
CREATE INDEX `household_members_user_idx` ON `household_members` (`userId`);--> statement-breakpoint
CREATE TABLE `households` (
	`id` text PRIMARY KEY NOT NULL,
	`rtId` text NOT NULL,
	`address` text NOT NULL,
	`block` text,
	`houseNumber` text,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`rtId`) REFERENCES `rt_units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `households_rt_idx` ON `households` (`rtId`);--> statement-breakpoint
CREATE INDEX `households_address_idx` ON `households` (`address`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`householdId` text NOT NULL,
	`billingPeriodId` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'unpaid' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`billingPeriodId`) REFERENCES `billing_periods`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `invoices_household_idx` ON `invoices` (`householdId`);--> statement-breakpoint
CREATE INDEX `invoices_period_idx` ON `invoices` (`billingPeriodId`);--> statement-breakpoint
CREATE INDEX `invoices_status_idx` ON `invoices` (`status`);--> statement-breakpoint
CREATE TABLE `notification_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`notificationId` text NOT NULL,
	`providerMessageId` text,
	`status` text NOT NULL,
	`errorCode` text,
	`payload` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`notificationId`) REFERENCES `notifications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notification_deliveries_notification_idx` ON `notification_deliveries` (`notificationId`);--> statement-breakpoint
CREATE INDEX `notification_deliveries_provider_idx` ON `notification_deliveries` (`providerMessageId`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`recipientId` integer NOT NULL,
	`channel` text NOT NULL,
	`template` text NOT NULL,
	`entityType` text,
	`entityId` text,
	`scheduledAt` integer,
	`status` text DEFAULT 'queued' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`recipientId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notifications_recipient_idx` ON `notifications` (`recipientId`);--> statement-breakpoint
CREATE INDEX `notifications_schedule_idx` ON `notifications` (`status`,`scheduledAt`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`timezone` text DEFAULT 'Asia/Jakarta' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_idx` ON `organizations` (`slug`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`invoiceId` text NOT NULL,
	`submittedBy` integer NOT NULL,
	`amount` integer NOT NULL,
	`proofFileId` text,
	`note` text,
	`status` text DEFAULT 'submitted' NOT NULL,
	`verifiedBy` integer,
	`verifiedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`submittedBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`verifiedBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payments_invoice_idx` ON `payments` (`invoiceId`);--> statement-breakpoint
CREATE INDEX `payments_status_idx` ON `payments` (`status`);--> statement-breakpoint
CREATE TABLE `rt_units` (
	`id` text PRIMARY KEY NOT NULL,
	`rwId` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`rwId`) REFERENCES `rw_units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `rt_units_rw_idx` ON `rt_units` (`rwId`);--> statement-breakpoint
CREATE TABLE `rw_units` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `rw_units_org_idx` ON `rw_units` (`organizationId`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openId` text NOT NULL,
	`name` text,
	`email` text,
	`phone` text,
	`loginMethod` text,
	`role` text DEFAULT 'resident' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`lastSignedIn` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `users_phone_idx` ON `users` (`phone`);