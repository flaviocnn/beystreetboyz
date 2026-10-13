PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_members` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`fiscal_code` text NOT NULL,
	`document_number` text NOT NULL,
	`email` text,
	`phone` text,
	`challonge_username` text,
	`challonge_id` text,
	`membership_status` text DEFAULT 'pending' NOT NULL,
	`payment_method` text,
	`payment_paid` integer DEFAULT false NOT NULL,
	`fee_cents` integer,
	`must_change_password` integer DEFAULT false NOT NULL,
	`auth_version` integer DEFAULT 0 NOT NULL,
	`avatar_style` integer DEFAULT 0 NOT NULL,
	`avatar_color` integer DEFAULT 0 NOT NULL,
	`password_salt` text NOT NULL,
	`password_hash` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_members`("id", "first_name", "last_name", "fiscal_code", "document_number", "email", "password_salt", "password_hash", "score", "created_at") SELECT "id", "first_name", "last_name", "fiscal_code", "document_number", "email", "password_salt", "password_hash", "score", "created_at" FROM `members`;--> statement-breakpoint
DROP TABLE `members`;--> statement-breakpoint
ALTER TABLE `__new_members` RENAME TO `members`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `members_email_unique` ON `members` (`email`);
