import { ensureDatabase, getDatabase } from "@/db/runtime";

export type Scope = "all" | "personal" | "business";

export type TransactionListItem = {
  id: string;
  merchant: string;
  postedAt: string;
  amountCents: number;
  category: string | null;
  categoryId: string | null;
  bucket: string | null;
  entity: string;
  entityId: string;
  accountId: string;
  accountName: string;
  isPending: boolean;
  isTransfer: boolean;
  isSelected?: boolean;
};

const EFFECTIVE_TRANSACTIONS = `
  WITH effective_transactions AS (
    SELECT
      t.id,
      t.posted_at,
      t.amount_cents,
      t.category_id,
      t.bucket,
      t.entity_id,
      t.is_pending,
      t.is_transfer
    FROM transactions t
    WHERE NOT EXISTS (
      SELECT 1 FROM transaction_splits s WHERE s.transaction_id = t.id
    )
    UNION ALL
    SELECT
      t.id,
      t.posted_at,
      s.amount_cents,
      s.category_id,
      COALESCE(c.default_bucket, t.bucket),
      s.entity_id,
      t.is_pending,
      t.is_transfer
    FROM transaction_splits s
    JOIN transactions t ON t.id = s.transaction_id
    LEFT JOIN categories c ON c.id = s.category_id
  )
`;

function monthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, monthNumber, 1));
  return { start: `${month}-01`, end: next.toISOString().slice(0, 10) };
}

function scopeSql(scope: Scope, column = "entity_id") {
  if (scope === "personal") return { clause: `${column} = ?`, values: ["entity_personal"] };
  if (scope === "business") return { clause: `${column} = ?`, values: ["entity_business"] };
  return { clause: "1 = 1", values: [] as string[] };
}

export async function getHomeData(month: string, scope: Scope) {
  await ensureDatabase();
  const db = getDatabase();
  const { start, end } = monthBounds(month);
  const scoped = scopeSql(scope, "entity_id");

  const totals = await db
    .prepare(`${EFFECTIVE_TRANSACTIONS}
      SELECT
        COALESCE(SUM(CASE WHEN bucket = 'income' AND amount_cents > 0 THEN amount_cents ELSE 0 END), 0) AS income_cents,
        COALESCE(-SUM(CASE WHEN bucket IN ('need', 'want') THEN amount_cents ELSE 0 END), 0) AS spend_cents,
        COALESCE(SUM(CASE WHEN bucket NOT IN ('transfer', 'ignore') THEN amount_cents ELSE 0 END), 0) AS net_cents
      FROM effective_transactions
      WHERE posted_at >= ? AND posted_at < ?
        AND is_pending = 0
        AND bucket NOT IN ('transfer', 'ignore')
        AND ${scoped.clause}`)
    .bind(start, end, ...scoped.values)
    .first<{ income_cents: number; spend_cents: number; net_cents: number }>();

  const budget = await db
    .prepare("SELECT total_cents FROM budgets WHERE month = ?")
    .bind(start)
    .first<{ total_cents: number }>();

  const review = await db
    .prepare(`SELECT COUNT(*) AS count FROM transactions
      WHERE (category_id IS NULL OR ai_confidence < 85)
        AND posted_at >= ? AND posted_at < ?
        AND ${scopeSql(scope, "entity_id").clause}`)
    .bind(start, end, ...scopeSql(scope, "entity_id").values)
    .first<{ count: number }>();

  const accounts = await db
    .prepare(`SELECT id, name, type, current_balance_cents
      FROM accounts WHERE is_active = 1 ORDER BY sort_order`)
    .all<{ id: string; name: string; type: string; current_balance_cents: number | null }>();

  const recent = await db
    .prepare(`SELECT
        t.id,
        COALESCE(t.merchant_clean, t.description_raw) AS merchant,
        t.posted_at,
        t.amount_cents,
        c.name AS category,
        t.category_id,
        t.bucket,
        e.name AS entity,
        t.entity_id,
        t.account_id,
        a.name AS account_name,
        t.is_pending,
        t.is_transfer
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      JOIN entities e ON e.id = t.entity_id
      JOIN accounts a ON a.id = t.account_id
      WHERE ${scopeSql(scope, "t.entity_id").clause}
      ORDER BY t.posted_at DESC, t.created_at DESC
      LIMIT 6`)
    .bind(...scopeSql(scope, "t.entity_id").values)
    .all<Record<string, unknown>>();

  return {
    totals: {
      incomeCents: totals?.income_cents ?? 0,
      spendCents: totals?.spend_cents ?? 0,
      netCents: totals?.net_cents ?? 0,
    },
    budgetCents: budget?.total_cents ?? null,
    reviewCount: review?.count ?? 0,
    accounts: accounts.results.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      balanceCents: account.current_balance_cents,
    })),
    recent: recent.results.map(mapTransaction),
  };
}

function mapTransaction(row: Record<string, unknown>): TransactionListItem {
  return {
    id: String(row.id),
    merchant: String(row.merchant),
    postedAt: String(row.posted_at),
    amountCents: Number(row.amount_cents),
    category: row.category ? String(row.category) : null,
    categoryId: row.category_id ? String(row.category_id) : null,
    bucket: row.bucket ? String(row.bucket) : null,
    entity: String(row.entity),
    entityId: String(row.entity_id),
    accountId: row.account_id ? String(row.account_id) : "",
    accountName: row.account_name ? String(row.account_name) : "",
    isPending: Boolean(row.is_pending),
    isTransfer: Boolean(row.is_transfer),
  };
}

export async function getTransactions(scope: Scope, search = "") {
  await ensureDatabase();
  const scoped = scopeSql(scope, "t.entity_id");
  const query = search.trim().toUpperCase();
  const searched = query ? "AND UPPER(COALESCE(t.merchant_clean, t.description_raw)) LIKE ?" : "";
  const values: unknown[] = [...scoped.values];
  if (query) values.push(`%${query}%`);

  const result = await getDatabase()
    .prepare(`SELECT
        t.id,
        COALESCE(t.merchant_clean, t.description_raw) AS merchant,
        t.posted_at,
        t.amount_cents,
        c.name AS category,
        t.category_id,
        t.bucket,
        e.name AS entity,
        t.entity_id,
        t.account_id,
        a.name AS account_name,
        t.is_pending,
        t.is_transfer
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      JOIN entities e ON e.id = t.entity_id
      JOIN accounts a ON a.id = t.account_id
      WHERE ${scoped.clause} ${searched}
      ORDER BY t.posted_at DESC, t.created_at DESC
      LIMIT 5000`)
    .bind(...values)
    .all<Record<string, unknown>>();
  return result.results.map(mapTransaction);
}

export async function getBudgetData(month: string, scope: Scope = "personal") {
  await ensureDatabase();
  const { start, end } = monthBounds(month);
  const scoped = scopeSql(scope, "entity_id");
  const budget = await getDatabase()
    .prepare("SELECT id, total_cents FROM budgets WHERE month = ?")
    .bind(start)
    .first<{ id: string; total_cents: number }>();
  if (!budget) return { totalCents: null, lines: [] };

  const result = await getDatabase()
    .prepare(`${EFFECTIVE_TRANSACTIONS}, actuals AS (
        SELECT category_id, COALESCE(-SUM(amount_cents), 0) AS spent_cents
        FROM effective_transactions
        WHERE posted_at >= ? AND posted_at < ?
          AND is_pending = 0
          AND bucket NOT IN ('transfer', 'ignore', 'income')
          AND ${scoped.clause}
        GROUP BY category_id
      )
      SELECT bl.id, c.id AS category_id, c.name, c.color_token, bl.amount_cents,
        bl.rollover_enabled, bl.rollover_cents, COALESCE(a.spent_cents, 0) AS spent_cents
      FROM budget_lines bl
      JOIN categories c ON c.id = bl.category_id
      LEFT JOIN actuals a ON a.category_id = c.id
      WHERE bl.budget_id = ?
      ORDER BY CASE WHEN bl.amount_cents = 0 THEN 0 ELSE CAST(COALESCE(a.spent_cents, 0) AS REAL) / bl.amount_cents END DESC`)
    .bind(start, end, ...scoped.values, budget.id)
    .all<Record<string, unknown>>();

  return {
    totalCents: budget.total_cents,
    lines: result.results.map((line) => ({
      id: String(line.id),
      categoryId: String(line.category_id),
      name: String(line.name),
      colorToken: String(line.color_token),
      amountCents: Number(line.amount_cents),
      spentCents: Number(line.spent_cents),
      rolloverEnabled: Boolean(line.rollover_enabled),
      rolloverCents: Number(line.rollover_cents),
    })),
  };
}

export async function getInsightData(month: string, scope: Scope) {
  const home = await getHomeData(month, scope);
  const recurring = await getDatabase()
    .prepare("SELECT merchant_key, avg_amount_cents, cadence, status, next_expected_at FROM recurring ORDER BY avg_amount_cents ASC")
    .all<Record<string, unknown>>();
  const insights = await getDatabase()
    .prepare("SELECT kind, title, body, model, created_at FROM insights WHERE month = ? AND dismissed_at IS NULL ORDER BY created_at DESC")
    .bind(`${month}-01`)
    .all<Record<string, unknown>>();
  return {
    ...home,
    recurring: recurring.results.map((row) => ({
      merchant: String(row.merchant_key),
      amountCents: Number(row.avg_amount_cents),
      cadence: String(row.cadence),
      status: String(row.status),
      nextExpectedAt: row.next_expected_at ? String(row.next_expected_at) : null,
    })),
    insights: insights.results.map((row) => ({
      kind: String(row.kind),
      title: String(row.title),
      body: String(row.body),
      model: String(row.model),
      createdAt: Number(row.created_at),
    })),
  };
}

export async function getSettingsData() {
  await ensureDatabase();
  const [institutions, categories, entities] = await Promise.all([
    getDatabase().prepare("SELECT name, status, last_synced_at, last_error FROM institutions ORDER BY name").all<Record<string, unknown>>(),
    getDatabase().prepare("SELECT id, name, default_bucket, color_token FROM categories WHERE parent_id IS NOT NULL AND is_archived = 0 ORDER BY sort_order").all<Record<string, unknown>>(),
    getDatabase().prepare("SELECT id, name, kind, set_aside_pct FROM entities WHERE is_active = 1 ORDER BY sort_order").all<Record<string, unknown>>(),
  ]);
  return {
    institutions: institutions.results,
    categories: categories.results,
    entities: entities.results,
  };
}

export async function getCategorySettingsData() {
  await ensureDatabase();
  const result = await getDatabase()
    .prepare(`SELECT id, name, default_bucket, color_token, is_archived
      FROM categories WHERE parent_id IS NOT NULL
      ORDER BY is_archived, sort_order, name`)
    .all<{ id: string; name: string; default_bucket: string; color_token: string; is_archived: number }>();
  return result.results;
}

export async function getRuleSettingsData() {
  await ensureDatabase();
  const [rulesResult, options] = await Promise.all([
    getDatabase().prepare(`SELECT r.id, r.name, r.priority, r.enabled, r.match_field, r.match_op,
      r.match_value, r.set_category_id, r.set_bucket, r.set_entity_id,
      c.name AS category_name, e.name AS entity_name
      FROM rules r
      LEFT JOIN categories c ON c.id = r.set_category_id
      LEFT JOIN entities e ON e.id = r.set_entity_id
      ORDER BY r.priority, r.created_at`).all<Record<string, unknown>>(),
    getEditorOptions(),
  ]);
  return { rules: rulesResult.results, ...options };
}

export async function getImportAccounts() {
  await ensureDatabase();
  const result = await getDatabase()
    .prepare("SELECT id, name, type FROM accounts WHERE is_active = 1 AND type != 'investment' ORDER BY sort_order")
    .all<{ id: string; name: string; type: string }>();
  return result.results;
}

export async function getEditorOptions() {
  await ensureDatabase();
  const [categories, entities, accounts] = await Promise.all([
    getDatabase().prepare("SELECT id, name, default_bucket, color_token FROM categories WHERE parent_id IS NOT NULL AND is_archived = 0 ORDER BY sort_order").all<{ id: string; name: string; default_bucket: string; color_token: string }>(),
    getDatabase().prepare("SELECT id, name, kind FROM entities WHERE is_active = 1 ORDER BY sort_order").all<{ id: string; name: string; kind: string }>(),
    getDatabase().prepare("SELECT id, name FROM accounts WHERE is_active = 1 ORDER BY sort_order").all<{ id: string; name: string }>(),
  ]);
  return { categories: categories.results, entities: entities.results, accounts: accounts.results };
}

export async function getTransactionDetail(id: string) {
  await ensureDatabase();
  const transaction = await getDatabase()
    .prepare(`SELECT
      t.*, a.name AS account_name, c.name AS category_name, e.name AS entity_name
      FROM transactions t
      JOIN accounts a ON a.id = t.account_id
      LEFT JOIN categories c ON c.id = t.category_id
      JOIN entities e ON e.id = t.entity_id
      WHERE t.id = ?`)
    .bind(id)
    .first<Record<string, unknown>>();
  if (!transaction) return null;
  const splits = await getDatabase()
    .prepare("SELECT id, amount_cents, category_id, entity_id, tax_category_id, deductible_pct, note FROM transaction_splits WHERE transaction_id = ? ORDER BY rowid")
    .bind(id)
    .all<Record<string, unknown>>();
  return {
    id: String(transaction.id),
    accountName: String(transaction.account_name),
    merchant: String(transaction.merchant_clean ?? transaction.description_raw),
    descriptionRaw: String(transaction.description_raw),
    postedAt: String(transaction.posted_at),
    amountCents: Number(transaction.amount_cents),
    categoryId: transaction.category_id ? String(transaction.category_id) : null,
    bucket: transaction.bucket ? String(transaction.bucket) : null,
    entityId: String(transaction.entity_id),
    notes: transaction.notes ? String(transaction.notes) : "",
    tags: typeof transaction.tags === "string" ? JSON.parse(transaction.tags) as string[] : [],
    isPending: Boolean(transaction.is_pending),
    isTransfer: Boolean(transaction.is_transfer),
    userLocked: Boolean(transaction.user_locked),
    splits: splits.results.map((split) => ({
      id: String(split.id),
      amountCents: Number(split.amount_cents),
      categoryId: split.category_id ? String(split.category_id) : null,
      entityId: String(split.entity_id),
      taxCategoryId: split.tax_category_id ? String(split.tax_category_id) : null,
      deductiblePct: Number(split.deductible_pct),
      note: split.note ? String(split.note) : "",
    })),
  };
}

export async function getReviewQueue(scope: Scope = "all") {
  await ensureDatabase();
  const scoped = scopeSql(scope, "t.entity_id");
  const result = await getDatabase()
    .prepare(`SELECT
      t.id, COALESCE(t.merchant_clean, t.description_raw) AS merchant,
      t.description_raw, t.posted_at, t.amount_cents, t.account_id,
      a.name AS account_name, t.category_id, t.bucket, t.entity_id,
      e.name AS entity, t.is_pending, t.is_transfer
      FROM transactions t
      JOIN accounts a ON a.id = t.account_id
      JOIN entities e ON e.id = t.entity_id
      WHERE (t.category_id IS NULL OR t.ai_confidence < 85)
        AND ${scoped.clause}
      ORDER BY t.posted_at DESC`)
    .bind(...scoped.values)
    .all<Record<string, unknown>>();
  return result.results.map((row) => ({
    ...mapTransaction({ ...row, category: null }),
    descriptionRaw: String(row.description_raw),
    accountName: String(row.account_name),
  }));
}
