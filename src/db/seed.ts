type SeedStatement = {
  sql: string;
  values: unknown[];
};

const categories = [
  ["cat_income", "Income", null, "WalletCards", "category-1", "income", 0],
  ["cat_paycheck", "Paycheck", "cat_income", "BriefcaseBusiness", "category-1", "income", 1],
  ["cat_creator", "Contract/Creator Income", "cat_income", "Gamepad2", "category-2", "income", 2],
  ["cat_refunds", "Refunds", "cat_income", "Undo2", "category-3", "income", 3],
  ["cat_other_income", "Other Income", "cat_income", "CircleDollarSign", "category-4", "income", 4],
  ["cat_needs", "Needs", null, "House", "category-2", "need", 10],
  ["cat_rent", "Rent", "cat_needs", "House", "category-2", "need", 11],
  ["cat_utilities", "Utilities", "cat_needs", "Zap", "category-3", "need", 12],
  ["cat_phone", "Phone", "cat_needs", "Smartphone", "category-4", "need", 13],
  ["cat_internet", "Internet", "cat_needs", "Wifi", "category-5", "need", 14],
  ["cat_groceries", "Groceries", "cat_needs", "ShoppingBasket", "category-6", "need", 15],
  ["cat_transportation", "Transportation", "cat_needs", "Car", "category-7", "need", 16],
  ["cat_gas", "Gas", "cat_needs", "Fuel", "category-8", "need", 17],
  ["cat_insurance", "Insurance", "cat_needs", "ShieldCheck", "category-1", "need", 18],
  ["cat_healthcare", "Healthcare", "cat_needs", "HeartPulse", "category-2", "need", 19],
  ["cat_debt", "Debt Payment", "cat_needs", "Landmark", "category-3", "need", 20],
  ["cat_wants", "Wants", null, "Sparkles", "category-3", "want", 30],
  ["cat_dining", "Dining Out", "cat_wants", "Utensils", "category-3", "want", 31],
  ["cat_coffee", "Coffee", "cat_wants", "Coffee", "category-4", "want", 32],
  ["cat_shopping", "Shopping", "cat_wants", "ShoppingBag", "category-5", "want", 33],
  ["cat_entertainment", "Entertainment", "cat_wants", "Clapperboard", "category-6", "want", 34],
  ["cat_subscriptions", "Subscriptions", "cat_wants", "RefreshCw", "category-7", "want", 35],
  ["cat_gaming", "Gaming", "cat_wants", "Gamepad2", "category-8", "want", 36],
  ["cat_travel", "Travel", "cat_wants", "Plane", "category-1", "want", 37],
  ["cat_personal_care", "Personal Care", "cat_wants", "Scissors", "category-2", "want", 38],
  ["cat_gifts", "Gifts", "cat_wants", "Gift", "category-3", "want", 39],
  ["cat_contractors", "Contractors", "cat_wants", "BriefcaseBusiness", "category-4", "want", 40],
  ["cat_savings", "Savings", null, "PiggyBank", "category-4", "save", 50],
  ["cat_investment", "Investment Contribution", "cat_savings", "ChartNoAxesCombined", "category-4", "save", 51],
  ["cat_emergency", "Emergency Fund", "cat_savings", "BadgeDollarSign", "category-5", "save", 52],
  ["cat_system", "System", null, "Settings2", "category-8", "ignore", 90],
  ["cat_transfer", "Transfer", "cat_system", "ArrowLeftRight", "category-8", "transfer", 91],
  ["cat_uncategorized", "Uncategorized", "cat_system", "CircleHelp", "category-8", "ignore", 92],
  ["cat_ignore", "Ignore", "cat_system", "CircleOff", "category-8", "ignore", 93],
] as const;

const taxCategories = [
  ["tax_advertising", "advertising", "Advertising", "8", 100, 1],
  ["tax_contract_labor", "contract_labor", "Contract labor", "11", 100, 2],
  ["tax_depreciation", "depreciation", "Depreciation", "13", 100, 3],
  ["tax_insurance", "insurance", "Insurance", "15", 100, 4],
  ["tax_legal", "legal_professional", "Legal and professional", "17", 100, 5],
  ["tax_office", "office_expense", "Office expense", "18", 100, 6],
  ["tax_supplies", "supplies", "Supplies", "22", 100, 7],
  ["tax_travel", "travel", "Travel", "24a", 100, 8],
  ["tax_meals", "meals", "Meals", "24b", 50, 9],
  ["tax_utilities", "utilities", "Utilities", "25", 100, 10],
  ["tax_other", "other", "Other expenses", "27a", 100, 11],
] as const;

const transactions = [
  ["txn_paycheck", "account_checking", "demo-paycheck", "2026-07-01", 196344, "ACME PAYROLL DIRECT DEP", "Acme Payroll", "cat_paycheck", "income", "entity_personal", "income_paycheck", null, 0, 0, 0, null, "user", 100, 1],
  ["txn_epic", "account_checking", "demo-epic", "2026-07-03", 238000, "EPIC GAMES CREATOR PAYOUT", "Epic Games", "cat_creator", "income", "entity_business", "income_epic", null, 100, 0, 0, null, "user", 100, 1],
  ["txn_rent", "account_checking", "demo-rent", "2026-07-02", -85000, "ONLINE RENT PAYMENT", "Rent", "cat_rent", "need", "entity_personal", null, null, 0, 0, 0, null, "user", 100, 1],
  ["txn_grocery", "account_chase", "demo-grocery", "2026-07-06", -14362, "KROGER 402 BLACKSBURG VA", "Kroger", "cat_groceries", "need", "entity_personal", null, null, 0, 0, 0, null, "memory", 95, 0],
  ["txn_gas", "account_chase", "demo-gas", "2026-07-08", -4210, "WAWA 8832 BLACKSBURG VA", "Wawa", "cat_gas", "need", "entity_personal", null, null, 0, 0, 0, null, "rule", 100, 0],
  ["txn_chipotle", "account_chase", "demo-chipotle", "2026-07-14", -1268, "CHIPOTLE 2034", "Chipotle", "cat_dining", "want", "entity_personal", null, null, 0, 0, 0, null, "user", 100, 1],
  ["txn_nintendo", "account_capital", "demo-nintendo", "2026-07-21", -3499, "NINTENDO ESHOP", "Nintendo", "cat_gaming", "want", "entity_personal", null, null, 0, 0, 0, null, "ai", 92, 0],
  ["txn_adobe", "account_capital", "demo-adobe", "2026-07-20", -2131, "ADOBE CREATIVE CLOUD", "Adobe", "cat_subscriptions", "want", "entity_business", null, "tax_office", 100, 0, 0, null, "rule", 100, 0],
  ["txn_contract", "account_checking", "demo-contract", "2026-07-11", -90000, "COLLABORATOR PAYMENT", "Contractor", "cat_contractors", "want", "entity_business", null, "tax_contract_labor", 100, 0, 0, null, "user", 100, 1],
  ["txn_streaming", "account_capital", "demo-streaming", "2026-07-12", -1899, "MAX.COM", "Max", "cat_entertainment", "want", "entity_personal", null, null, 0, 0, 0, null, "memory", 95, 0],
  ["txn_coffee", "account_chase", "demo-coffee", "2026-07-22", -575, "TST* TST COFFEE 8829", "TST Coffee", "cat_coffee", "want", "entity_personal", null, null, 0, 1, 0, null, "ai", 78, 0],
  ["txn_refund", "account_chase", "demo-refund", "2026-07-18", 3200, "AMAZON.COM RETURN", "Amazon", "cat_shopping", "want", "entity_personal", null, null, 0, 0, 0, null, "memory", 95, 0],
  ["txn_review", "account_capital", "demo-review", "2026-07-22", -4800, "SQ *NEW MERCHANT", "New Merchant", null, null, "entity_personal", null, null, 0, 0, 0, null, null, null, 0],
  ["txn_transfer_out", "account_checking", "demo-transfer-out", "2026-07-17", -82344, "CHASE CREDIT CRD AUTOPAY", "Chase payment", "cat_transfer", "transfer", "entity_personal", null, null, 0, 0, 1, "transfer_demo_1", "rule", 100, 1],
  ["txn_transfer_in", "account_chase", "demo-transfer-in", "2026-07-18", 82344, "PAYMENT THANK YOU", "Payment", "cat_transfer", "transfer", "entity_personal", null, null, 0, 0, 1, "transfer_demo_1", "rule", 100, 1],
] as const;

function statement(sql: string, ...values: unknown[]): SeedStatement {
  return { sql, values };
}

export function getSeedStatements(): SeedStatement[] {
  const statements: SeedStatement[] = [
    statement("INSERT OR IGNORE INTO entities (id, name, kind, is_default, tax_form, set_aside_pct, description, color_token, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", "entity_personal", "Personal", "personal", 1, "none", 0, "Everyday personal income and spending.", "accent", 0),
    statement("INSERT OR IGNORE INTO entities (id, name, kind, is_default, tax_form, set_aside_pct, description, color_token, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", "entity_business", "Game Development", "business", 0, "schedule_c", 30, "Solo game development, creator payouts, client work, creative software, assets, and collaborators.", "category-3", 1),
    statement("INSERT OR IGNORE INTO institutions (id, name, status, last_synced_at) VALUES (?, ?, ?, unixepoch())", "inst_pnc", "PNC", "active"),
    statement("INSERT OR IGNORE INTO institutions (id, name, status, last_synced_at) VALUES (?, ?, ?, unixepoch())", "inst_chase", "Chase", "active"),
    statement("INSERT OR IGNORE INTO institutions (id, name, status, last_synced_at) VALUES (?, ?, ?, unixepoch())", "inst_capital", "Capital One", "active"),
    statement("INSERT OR IGNORE INTO institutions (id, name, status, last_synced_at) VALUES (?, ?, ?, unixepoch())", "inst_fidelity", "Fidelity", "active"),
  ];

  for (const category of categories) {
    statements.push(statement("INSERT OR IGNORE INTO categories (id, name, parent_id, icon, color_token, default_bucket, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)", ...category));
  }

  for (const taxCategory of taxCategories) {
    statements.push(statement("INSERT OR IGNORE INTO tax_categories (id, code, label, schedule_c_line, default_deductible_pct, sort_order) VALUES (?, ?, ?, ?, ?, ?)", ...taxCategory));
  }

  statements.push(
    statement("INSERT OR IGNORE INTO accounts (id, institution_id, external_id, name, official_name, mask, type, subtype, current_balance_cents, available_balance_cents, credit_limit_cents, default_entity_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", "account_checking", "inst_pnc", "demo-pnc-checking", "PNC Checking", "Virtual Wallet Spend", "1842", "depository", "checking", 199244, 184120, null, "entity_personal", 0),
    statement("INSERT OR IGNORE INTO accounts (id, institution_id, external_id, name, official_name, mask, type, subtype, current_balance_cents, available_balance_cents, credit_limit_cents, default_entity_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", "account_savings", "inst_pnc", "demo-pnc-savings", "PNC Savings", "Virtual Wallet Growth", "9004", "depository", "savings", 0, 0, null, "entity_personal", 1),
    statement("INSERT OR IGNORE INTO accounts (id, institution_id, external_id, name, official_name, mask, type, subtype, current_balance_cents, available_balance_cents, credit_limit_cents, default_entity_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", "account_chase", "inst_chase", "demo-chase", "Chase •4821", "Freedom Unlimited", "4821", "credit", "credit_card", -8400, 141600, 150000, "entity_personal", 2),
    statement("INSERT OR IGNORE INTO accounts (id, institution_id, external_id, name, official_name, mask, type, subtype, current_balance_cents, available_balance_cents, credit_limit_cents, default_entity_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", "account_capital", "inst_capital", "demo-capital", "Capital One •7710", "Quicksilver", "7710", "credit", "credit_card", -52000, 48000, 100000, "entity_personal", 3),
    statement("INSERT OR IGNORE INTO accounts (id, institution_id, external_id, name, official_name, mask, type, subtype, current_balance_cents, available_balance_cents, credit_limit_cents, default_entity_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", "account_fidelity", "inst_fidelity", "demo-fidelity", "Fidelity", "Individual Brokerage", "9188", "investment", "brokerage", 616800, null, null, "entity_personal", 4),
    statement("INSERT OR IGNORE INTO income_sources (id, entity_id, name, kind, payer_name, expected_cadence, issues_1099) VALUES (?, ?, ?, ?, ?, ?, ?)", "income_paycheck", "entity_personal", "Paycheck", "employment", "Acme", "biweekly", 0),
    statement("INSERT OR IGNORE INTO income_sources (id, entity_id, name, kind, payer_name, expected_cadence, issues_1099) VALUES (?, ?, ?, ?, ?, ?, ?)", "income_epic", "entity_business", "Epic Creator Payout", "creator_payout", "Epic Games", "irregular", 1),
    statement("INSERT OR IGNORE INTO income_sources (id, entity_id, name, kind, payer_name, expected_cadence, issues_1099) VALUES (?, ?, ?, ?, ?, ?, ?)", "income_client", "entity_business", "Client Contract", "contract", null, "irregular", 1),
    statement("INSERT OR IGNORE INTO budgets (id, month, total_cents, note) VALUES (?, ?, ?, ?)", "budget_2026_07", "2026-07-01", 200000, "Demo budget"),
  );

  const budgetLines = [
    ["budget_rent", "cat_rent", 85000],
    ["budget_groceries", "cat_groceries", 30000],
    ["budget_transportation", "cat_transportation", 30000],
    ["budget_dining", "cat_dining", 20000],
    ["budget_subscriptions", "cat_subscriptions", 15000],
    ["budget_entertainment", "cat_entertainment", 10000],
    ["budget_shopping", "cat_shopping", 15000],
    ["budget_gaming", "cat_gaming", 10000],
  ] as const;
  for (const [id, categoryId, amountCents] of budgetLines) {
    statements.push(statement("INSERT OR IGNORE INTO budget_lines (id, budget_id, category_id, amount_cents) VALUES (?, ?, ?, ?)", id, "budget_2026_07", categoryId, amountCents));
  }

  for (const transaction of transactions) {
    statements.push(statement("INSERT OR IGNORE INTO transactions (id, account_id, external_id, source, posted_at, amount_cents, description_raw, merchant_clean, category_id, bucket, entity_id, income_source_id, tax_category_id, deductible_pct, is_pending, is_transfer, transfer_group_id, category_source, ai_confidence, user_locked) VALUES (?, ?, ?, 'demo', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", ...transaction));
  }

  statements.push(
    statement("INSERT OR IGNORE INTO recurring (id, merchant_key, cadence, avg_amount_cents, last_seen_at, next_expected_at, account_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", "recurring_adobe", "ADOBE CREATIVE CLOUD", "monthly", -2131, "2026-07-20", "2026-08-20", "account_capital", "active"),
    statement("INSERT OR IGNORE INTO recurring (id, merchant_key, cadence, avg_amount_cents, last_seen_at, next_expected_at, account_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", "recurring_max", "MAX.COM", "monthly", -1899, "2026-07-12", "2026-08-12", "account_capital", "active"),
    statement("INSERT OR IGNORE INTO insights (id, month, kind, title, body, evidence_json, model) VALUES (?, ?, ?, ?, ?, ?, ?)", "insight_demo_1", "2026-07-01", "watch", "Dining is ahead of pace", "Dining out reached 6% of its July budget by July 14. The pace marker will make any acceleration visible without judging the purchases.", JSON.stringify({ category: "Dining Out", spentCents: 1268, budgetCents: 20000 }), "deterministic"),
    statement("INSERT OR IGNORE INTO export_presets (id, name, filters_json, format, grouping) VALUES (?, ?, ?, ?, ?)", "preset_business_ytd", "Business YTD", JSON.stringify({ scope: "business", range: "year_to_date" }), "csv", "none"),
    statement("INSERT OR IGNORE INTO credit_scores (id, provider, bureau, model, score, pulled_on, source) VALUES (?, ?, ?, ?, ?, ?, ?)", "score_chase_june", "Chase Credit Journey", "transunion", "vantage_3", 724, "2026-06-01", "manual"),
  );

  return statements;
}

export async function seedDatabase(db: D1Database) {
  const statements = getSeedStatements();
  for (let offset = 0; offset < statements.length; offset += 75) {
    const batch = statements.slice(offset, offset + 75).map(({ sql, values }) => db.prepare(sql).bind(...values));
    await db.batch(batch);
  }
}
