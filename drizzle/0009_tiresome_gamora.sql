ALTER TABLE `announcements` ADD `scopeType` text DEFAULT 'organization';--> statement-breakpoint
ALTER TABLE `announcements` ADD `scopeId` text;--> statement-breakpoint
ALTER TABLE `billing_types` ADD `scopeType` text DEFAULT 'organization';--> statement-breakpoint
ALTER TABLE `billing_types` ADD `scopeId` text;--> statement-breakpoint
ALTER TABLE `events` ADD `scopeType` text DEFAULT 'organization';--> statement-breakpoint
ALTER TABLE `events` ADD `scopeId` text;--> statement-breakpoint
ALTER TABLE `organization_members` ADD `scopeType` text DEFAULT 'organization';--> statement-breakpoint
ALTER TABLE `organization_members` ADD `scopeId` text;