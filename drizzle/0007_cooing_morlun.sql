CREATE TABLE `payment_status_history` (
	`id` text PRIMARY KEY NOT NULL,
	`paymentId` text NOT NULL,
	`invoiceId` text NOT NULL,
	`status` text NOT NULL,
	`actorId` integer,
	`note` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payment_status_history_payment_idx` ON `payment_status_history` (`paymentId`);--> statement-breakpoint
CREATE INDEX `payment_status_history_invoice_idx` ON `payment_status_history` (`invoiceId`);--> statement-breakpoint
CREATE INDEX `payment_status_history_created_idx` ON `payment_status_history` (`createdAt`);