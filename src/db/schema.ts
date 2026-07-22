import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

const createdAt = integer("created_at", { mode: "timestamp" })
  .notNull()
  .default(sql`(unixepoch())`);

export const entities = sqliteTable("entities", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["personal", "business"] }).notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  taxForm: text("tax_form", { enum: ["schedule_c", "none"] }).notNull().default("none"),
  taxYearStartMonth: integer("tax_year_start_month").notNull().default(1),
  setAsidePct: integer("set_aside_pct").notNull().default(0),
  description: text("description"),
  colorToken: text("color_token").notNull().default("accent"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt,
});

export const institutions = sqliteTable("institutions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  plaidItemId: text("plaid_item_id"),
  accessTokenEncrypted: text("access_token_encrypted"),
  syncCursor: text("sync_cursor"),
  status: text("status", { enum: ["active", "needs_reauth", "error", "disconnected"] })
    .notNull()
    .default("active"),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  lastError: text("last_error"),
  createdAt,
});

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    institutionId: text("institution_id")
      .notNull()
      .references(() => institutions.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    officialName: text("official_name"),
    mask: text("mask"),
    type: text("type", { enum: ["depository", "credit", "investment", "loan", "cash"] }).notNull(),
    subtype: text("subtype"),
    currency: text("currency").notNull().default("USD"),
    currentBalanceCents: integer("current_balance_cents"),
    availableBalanceCents: integer("available_balance_cents"),
    creditLimitCents: integer("credit_limit_cents"),
    defaultEntityId: text("default_entity_id").references(() => entities.id, { onDelete: "set null" }),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    includeInNetWorth: integer("include_in_net_worth", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt,
  },
  (table) => [uniqueIndex("accounts_institution_external_idx").on(table.institutionId, table.externalId)],
);

export const incomeSources = sqliteTable("income_sources", {
  id: text("id").primaryKey(),
  entityId: text("entity_id")
    .notNull()
    .references(() => entities.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: text("kind", {
    enum: ["employment", "contract", "creator_payout", "royalty", "reimbursement", "refund", "gift", "interest", "other"],
  }).notNull(),
  payerName: text("payer_name"),
  expectedCadence: text("expected_cadence", {
    enum: ["weekly", "biweekly", "monthly", "irregular", "none"],
  }).notNull().default("none"),
  issues1099: integer("issues_1099", { mode: "boolean" }).notNull().default(false),
  notes: text("notes"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt,
});

export const taxCategories = sqliteTable("tax_categories", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  label: text("label").notNull(),
  scheduleCLine: text("schedule_c_line"),
  defaultDeductiblePct: integer("default_deductible_pct").notNull().default(100),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  parentId: text("parent_id").references((): AnySQLiteColumn => categories.id, { onDelete: "set null" }),
  icon: text("icon"),
  colorToken: text("color_token").notNull(),
  defaultBucket: text("default_bucket", {
    enum: ["need", "want", "save", "income", "transfer", "ignore"],
  }).notNull(),
  isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt,
});

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    source: text("source", { enum: ["plaid", "csv", "ofx", "manual", "demo"] }).notNull(),
    postedAt: text("posted_at").notNull(),
    authorizedAt: text("authorized_at"),
    amountCents: integer("amount_cents").notNull(),
    descriptionRaw: text("description_raw").notNull(),
    merchantRaw: text("merchant_raw"),
    merchantClean: text("merchant_clean"),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    bucket: text("bucket", { enum: ["need", "want", "save", "income", "transfer", "ignore"] }),
    entityId: text("entity_id")
      .notNull()
      .default("entity_personal")
      .references(() => entities.id),
    incomeSourceId: text("income_source_id").references(() => incomeSources.id, { onDelete: "set null" }),
    taxCategoryId: text("tax_category_id").references(() => taxCategories.id, { onDelete: "set null" }),
    deductiblePct: integer("deductible_pct").notNull().default(0),
    counterparty: text("counterparty"),
    isPending: integer("is_pending", { mode: "boolean" }).notNull().default(false),
    isTransfer: integer("is_transfer", { mode: "boolean" }).notNull().default(false),
    transferGroupId: text("transfer_group_id"),
    notes: text("notes"),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    isSplitParent: integer("is_split_parent", { mode: "boolean" }).notNull().default(false),
    parentTransactionId: text("parent_transaction_id").references((): AnySQLiteColumn => transactions.id, {
      onDelete: "cascade",
    }),
    categorySource: text("category_source", { enum: ["user", "rule", "memory", "ai", "import", "default"] }),
    aiConfidence: integer("ai_confidence"),
    aiRationale: text("ai_rationale"),
    entitySource: text("entity_source", { enum: ["user", "rule", "memory", "ai", "default"] })
      .notNull()
      .default("default"),
    userLocked: integer("user_locked", { mode: "boolean" }).notNull().default(false),
    createdAt,
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("transactions_account_external_idx").on(table.accountId, table.externalId),
    index("transactions_posted_at_idx").on(table.postedAt),
    index("transactions_category_posted_idx").on(table.categoryId, table.postedAt),
    index("transactions_transfer_group_idx").on(table.transferGroupId),
    index("transactions_entity_posted_idx").on(table.entityId, table.postedAt),
    index("transactions_income_source_idx").on(table.incomeSourceId),
  ],
);

export const transactionSplits = sqliteTable(
  "transaction_splits",
  {
    id: text("id").primaryKey(),
    transactionId: text("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    entityId: text("entity_id")
      .notNull()
      .default("entity_personal")
      .references(() => entities.id),
    taxCategoryId: text("tax_category_id").references(() => taxCategories.id, { onDelete: "set null" }),
    deductiblePct: integer("deductible_pct").notNull().default(0),
    note: text("note"),
  },
  (table) => [index("transaction_splits_transaction_idx").on(table.transactionId)],
);

export const rules = sqliteTable("rules", {
  id: text("id").primaryKey(),
  priority: integer("priority").notNull().default(100),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  name: text("name").notNull(),
  matchField: text("match_field", { enum: ["merchant", "description", "amount", "account"] }).notNull(),
  matchOp: text("match_op", { enum: ["contains", "equals", "regex", "between"] }).notNull(),
  matchValue: text("match_value").notNull(),
  setCategoryId: text("set_category_id").references(() => categories.id, { onDelete: "set null" }),
  setBucket: text("set_bucket", { enum: ["need", "want", "save", "income", "transfer", "ignore"] }),
  setIsTransfer: integer("set_is_transfer", { mode: "boolean" }),
  setNotes: text("set_notes"),
  setEntityId: text("set_entity_id").references(() => entities.id, { onDelete: "set null" }),
  setIncomeSourceId: text("set_income_source_id").references(() => incomeSources.id, { onDelete: "set null" }),
  setTaxCategoryId: text("set_tax_category_id").references(() => taxCategories.id, { onDelete: "set null" }),
  setDeductiblePct: integer("set_deductible_pct"),
  createdAt,
});

export const merchantMemory = sqliteTable("merchant_memory", {
  id: text("id").primaryKey(),
  merchantKey: text("merchant_key").notNull().unique(),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  bucket: text("bucket", { enum: ["need", "want", "save", "income", "transfer", "ignore"] }),
  entityId: text("entity_id").references(() => entities.id, { onDelete: "set null" }),
  incomeSourceId: text("income_source_id").references(() => incomeSources.id, { onDelete: "set null" }),
  taxCategoryId: text("tax_category_id").references(() => taxCategories.id, { onDelete: "set null" }),
  deductiblePct: integer("deductible_pct"),
  hitCount: integer("hit_count").notNull().default(0),
  lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
  confidence: integer("confidence").notNull().default(100),
});

export const budgets = sqliteTable("budgets", {
  id: text("id").primaryKey(),
  month: text("month").notNull().unique(),
  totalCents: integer("total_cents").notNull(),
  note: text("note"),
  createdAt,
});

export const budgetLines = sqliteTable(
  "budget_lines",
  {
    id: text("id").primaryKey(),
    budgetId: text("budget_id")
      .notNull()
      .references(() => budgets.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    rolloverEnabled: integer("rollover_enabled", { mode: "boolean" }).notNull().default(false),
    rolloverCents: integer("rollover_cents").notNull().default(0),
  },
  (table) => [uniqueIndex("budget_lines_budget_category_idx").on(table.budgetId, table.categoryId)],
);

export const balanceSnapshots = sqliteTable(
  "balance_snapshots",
  {
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    asOf: text("as_of").notNull(),
    balanceCents: integer("balance_cents").notNull(),
  },
  (table) => [primaryKey({ columns: [table.accountId, table.asOf] })],
);

export const recurring = sqliteTable("recurring", {
  id: text("id").primaryKey(),
  merchantKey: text("merchant_key").notNull(),
  cadence: text("cadence", { enum: ["weekly", "biweekly", "monthly", "quarterly", "annual"] }).notNull(),
  avgAmountCents: integer("avg_amount_cents").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
  nextExpectedAt: text("next_expected_at"),
  accountId: text("account_id").references(() => accounts.id, { onDelete: "set null" }),
  status: text("status", { enum: ["active", "ended", "price_changed"] }).notNull().default("active"),
  previousAmountCents: integer("previous_amount_cents"),
});

export const insights = sqliteTable("insights", {
  id: text("id").primaryKey(),
  month: text("month").notNull(),
  kind: text("kind", { enum: ["win", "watch", "action"] }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  evidenceJson: text("evidence_json", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  model: text("model").notNull(),
  createdAt,
  dismissedAt: integer("dismissed_at", { mode: "timestamp" }),
});

export const aiRuns = sqliteTable("ai_runs", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: ["categorize", "insight"] }).notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  estCostCents: integer("est_cost_cents").notNull().default(0),
  itemCount: integer("item_count").notNull().default(0),
  createdAt,
  error: text("error"),
});

export const exportPresets = sqliteTable("export_presets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  filtersJson: text("filters_json", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  format: text("format", { enum: ["csv", "csv_per_category", "csv_per_entity", "summary_csv", "json", "tax_package"] }).notNull(),
  grouping: text("grouping", { enum: ["none", "category", "entity", "month", "tax_category"] }).notNull().default("none"),
  lastRunAt: integer("last_run_at", { mode: "timestamp" }),
  createdAt,
});

export const creditScores = sqliteTable("credit_scores", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  bureau: text("bureau", { enum: ["equifax", "experian", "transunion"] }).notNull(),
  model: text("model", { enum: ["fico_8", "fico_9", "vantage_3", "vantage_4", "other"] }).notNull(),
  score: integer("score").notNull(),
  pulledOn: text("pulled_on").notNull(),
  source: text("source", { enum: ["manual", "import"] }).notNull().default("manual"),
  note: text("note"),
  createdAt,
});

export const loginAttempts = sqliteTable(
  "login_attempts",
  {
    id: text("id").primaryKey(),
    fingerprint: text("fingerprint").notNull(),
    attemptedAt: integer("attempted_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [index("login_attempts_fingerprint_time_idx").on(table.fingerprint, table.attemptedAt)],
);
