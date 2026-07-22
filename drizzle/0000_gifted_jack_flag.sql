CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`institution_id` text NOT NULL,
	`external_id` text NOT NULL,
	`name` text NOT NULL,
	`official_name` text,
	`mask` text,
	`type` text NOT NULL,
	`subtype` text,
	`currency` text DEFAULT 'USD' NOT NULL,
	`current_balance_cents` integer,
	`available_balance_cents` integer,
	`credit_limit_cents` integer,
	`default_entity_id` text,
	`is_active` integer DEFAULT true NOT NULL,
	`include_in_net_worth` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`default_entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_institution_external_idx` ON `accounts` (`institution_id`,`external_id`);--> statement-breakpoint
CREATE TABLE `ai_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`model` text NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`est_cost_cents` integer DEFAULT 0 NOT NULL,
	`item_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `balance_snapshots` (
	`account_id` text NOT NULL,
	`as_of` text NOT NULL,
	`balance_cents` integer NOT NULL,
	PRIMARY KEY(`account_id`, `as_of`),
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `budget_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`budget_id` text NOT NULL,
	`category_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`rollover_enabled` integer DEFAULT false NOT NULL,
	`rollover_cents` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budget_lines_budget_category_idx` ON `budget_lines` (`budget_id`,`category_id`);--> statement-breakpoint
CREATE TABLE `budgets` (
	`id` text PRIMARY KEY NOT NULL,
	`month` text NOT NULL,
	`total_cents` integer NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budgets_month_unique` ON `budgets` (`month`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`parent_id` text,
	`icon` text,
	`color_token` text NOT NULL,
	`default_bucket` text NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `credit_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`bureau` text NOT NULL,
	`model` text NOT NULL,
	`score` integer NOT NULL,
	`pulled_on` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `entities` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`tax_form` text DEFAULT 'none' NOT NULL,
	`tax_year_start_month` integer DEFAULT 1 NOT NULL,
	`set_aside_pct` integer DEFAULT 0 NOT NULL,
	`description` text,
	`color_token` text DEFAULT 'accent' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `export_presets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`filters_json` text NOT NULL,
	`format` text NOT NULL,
	`grouping` text DEFAULT 'none' NOT NULL,
	`last_run_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `income_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_id` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`payer_name` text,
	`expected_cadence` text DEFAULT 'none' NOT NULL,
	`issues_1099` integer DEFAULT false NOT NULL,
	`notes` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `insights` (
	`id` text PRIMARY KEY NOT NULL,
	`month` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`evidence_json` text NOT NULL,
	`model` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`dismissed_at` integer
);
--> statement-breakpoint
CREATE TABLE `institutions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`plaid_item_id` text,
	`access_token_encrypted` text,
	`sync_cursor` text,
	`status` text DEFAULT 'active' NOT NULL,
	`last_synced_at` integer,
	`last_error` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL,
	`attempted_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `login_attempts_fingerprint_time_idx` ON `login_attempts` (`fingerprint`,`attempted_at`);--> statement-breakpoint
CREATE TABLE `merchant_memory` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant_key` text NOT NULL,
	`category_id` text,
	`bucket` text,
	`entity_id` text,
	`income_source_id` text,
	`tax_category_id` text,
	`deductible_pct` integer,
	`hit_count` integer DEFAULT 0 NOT NULL,
	`last_used_at` integer,
	`confidence` integer DEFAULT 100 NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`income_source_id`) REFERENCES `income_sources`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`tax_category_id`) REFERENCES `tax_categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `merchant_memory_merchant_key_unique` ON `merchant_memory` (`merchant_key`);--> statement-breakpoint
CREATE TABLE `recurring` (
	`id` text PRIMARY KEY NOT NULL,
	`merchant_key` text NOT NULL,
	`cadence` text NOT NULL,
	`avg_amount_cents` integer NOT NULL,
	`last_seen_at` text NOT NULL,
	`next_expected_at` text,
	`account_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`previous_amount_cents` integer,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `rules` (
	`id` text PRIMARY KEY NOT NULL,
	`priority` integer DEFAULT 100 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`name` text NOT NULL,
	`match_field` text NOT NULL,
	`match_op` text NOT NULL,
	`match_value` text NOT NULL,
	`set_category_id` text,
	`set_bucket` text,
	`set_is_transfer` integer,
	`set_notes` text,
	`set_entity_id` text,
	`set_income_source_id` text,
	`set_tax_category_id` text,
	`set_deductible_pct` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`set_category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`set_entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`set_income_source_id`) REFERENCES `income_sources`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`set_tax_category_id`) REFERENCES `tax_categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `tax_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`label` text NOT NULL,
	`schedule_c_line` text,
	`default_deductible_pct` integer DEFAULT 100 NOT NULL,
	`notes` text,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tax_categories_code_unique` ON `tax_categories` (`code`);--> statement-breakpoint
CREATE TABLE `transaction_splits` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`category_id` text,
	`entity_id` text DEFAULT 'entity_personal' NOT NULL,
	`tax_category_id` text,
	`deductible_pct` integer DEFAULT 0 NOT NULL,
	`note` text,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tax_category_id`) REFERENCES `tax_categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `transaction_splits_transaction_idx` ON `transaction_splits` (`transaction_id`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`external_id` text NOT NULL,
	`source` text NOT NULL,
	`posted_at` text NOT NULL,
	`authorized_at` text,
	`amount_cents` integer NOT NULL,
	`description_raw` text NOT NULL,
	`merchant_raw` text,
	`merchant_clean` text,
	`category_id` text,
	`bucket` text,
	`entity_id` text DEFAULT 'entity_personal' NOT NULL,
	`income_source_id` text,
	`tax_category_id` text,
	`deductible_pct` integer DEFAULT 0 NOT NULL,
	`counterparty` text,
	`is_pending` integer DEFAULT false NOT NULL,
	`is_transfer` integer DEFAULT false NOT NULL,
	`transfer_group_id` text,
	`notes` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`is_split_parent` integer DEFAULT false NOT NULL,
	`parent_transaction_id` text,
	`category_source` text,
	`ai_confidence` integer,
	`ai_rationale` text,
	`entity_source` text DEFAULT 'default' NOT NULL,
	`user_locked` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`income_source_id`) REFERENCES `income_sources`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`tax_category_id`) REFERENCES `tax_categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`parent_transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_account_external_idx` ON `transactions` (`account_id`,`external_id`);--> statement-breakpoint
CREATE INDEX `transactions_posted_at_idx` ON `transactions` (`posted_at`);--> statement-breakpoint
CREATE INDEX `transactions_category_posted_idx` ON `transactions` (`category_id`,`posted_at`);--> statement-breakpoint
CREATE INDEX `transactions_transfer_group_idx` ON `transactions` (`transfer_group_id`);--> statement-breakpoint
CREATE INDEX `transactions_entity_posted_idx` ON `transactions` (`entity_id`,`posted_at`);--> statement-breakpoint
CREATE INDEX `transactions_income_source_idx` ON `transactions` (`income_source_id`);