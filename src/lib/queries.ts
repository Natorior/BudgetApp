import { ensureDatabase, getDatabase } from "@/db/runtime";
import { decimalCents, type ExportRow, type ExportTotals } from "@/lib/exporter";
import type { TransactionFilters } from "@/lib/transaction-filters";

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

export async function getBudgetEditorData(month: string, scope: Scope = "personal") {
  await ensureDatabase();
  const { start, end } = monthBounds(month);
  const scoped = scopeSql(scope, "entity_id");
  const [budget, categoriesResult] = await Promise.all([
    getBudgetData(month, scope),
    getDatabase().prepare(`${EFFECTIVE_TRANSACTIONS}, actuals AS (
        SELECT category_id, COALESCE(-SUM(amount_cents), 0) AS spent_cents
        FROM effective_transactions
        WHERE posted_at >= ? AND posted_at < ? AND is_pending = 0
          AND bucket NOT IN ('transfer', 'ignore', 'income') AND ${scoped.clause}
        GROUP BY category_id
      )
      SELECT c.id, c.name, c.color_token, c.default_bucket,
        COALESCE(a.spent_cents, 0) AS spent_cents
      FROM categories c LEFT JOIN actuals a ON a.category_id = c.id
      WHERE c.parent_id IS NOT NULL AND c.is_archived = 0
        AND c.default_bucket IN ('need', 'want', 'save')
      ORDER BY c.sort_order`)
      .bind(start, end, ...scoped.values)
      .all<Record<string, unknown>>(),
  ]);
  const budgetByCategory = new Map(budget.lines.map((line) => [line.categoryId, line]));
  return {
    totalCents: budget.totalCents,
    lines: categoriesResult.results.map((category) => {
      const line = budgetByCategory.get(String(category.id));
      return {
        id: line?.id ?? null,
        categoryId: String(category.id),
        name: String(category.name),
        colorToken: String(category.color_token),
        bucket: String(category.default_bucket),
        amountCents: line?.amountCents ?? 0,
        spentCents: Number(category.spent_cents),
        rolloverEnabled: line?.rolloverEnabled ?? false,
        rolloverCents: line?.rolloverCents ?? 0,
      };
    }),
  };
}

export async function getInsightData(month: string, scope: Scope) {
  const home = await getHomeData(month, scope);
  const end = monthBounds(month).end;
  const [year, monthNumber] = month.split("-").map(Number);
  const twelveMonthStart = new Date(Date.UTC(year, monthNumber - 12, 1)).toISOString().slice(0, 10);
  const sixMonthStart = new Date(Date.UTC(year, monthNumber - 6, 1)).toISOString().slice(0, 10);
  const scoped = scopeSql(scope, "entity_id");
  const [recurring, insights, cashFlow, categorySpend] = await Promise.all([
    getDatabase().prepare("SELECT merchant_key, avg_amount_cents, cadence, status, next_expected_at FROM recurring ORDER BY avg_amount_cents ASC").all<Record<string, unknown>>(),
    getDatabase().prepare("SELECT kind, title, body, model, created_at FROM insights WHERE month = ? AND dismissed_at IS NULL ORDER BY created_at DESC").bind(`${month}-01`).all<Record<string, unknown>>(),
    getDatabase().prepare(`${EFFECTIVE_TRANSACTIONS} SELECT substr(posted_at, 1, 7) AS month,
      COALESCE(SUM(CASE WHEN bucket = 'income' AND amount_cents > 0 THEN amount_cents ELSE 0 END), 0) AS income_cents,
      COALESCE(-SUM(CASE WHEN bucket IN ('need', 'want') THEN amount_cents ELSE 0 END), 0) AS spend_cents,
      COALESCE(SUM(amount_cents), 0) AS net_cents
      FROM effective_transactions WHERE posted_at >= ? AND posted_at < ? AND is_pending = 0
      AND bucket NOT IN ('transfer', 'ignore') AND ${scoped.clause}
      GROUP BY substr(posted_at, 1, 7) ORDER BY month`).bind(twelveMonthStart, end, ...scoped.values).all<Record<string, unknown>>(),
    getDatabase().prepare(`${EFFECTIVE_TRANSACTIONS} SELECT substr(et.posted_at, 1, 7) AS month,
      COALESCE(c.name, 'Uncategorized') AS category, COALESCE(c.color_token, 'category-8') AS color_token,
      COALESCE(-SUM(et.amount_cents), 0) AS spent_cents
      FROM effective_transactions et LEFT JOIN categories c ON c.id = et.category_id
      WHERE et.posted_at >= ? AND et.posted_at < ? AND et.is_pending = 0
      AND et.bucket IN ('need', 'want') AND ${scopeSql(scope, "et.entity_id").clause}
      GROUP BY substr(et.posted_at, 1, 7), c.id, c.name, c.color_token HAVING spent_cents > 0
      ORDER BY month, spent_cents DESC`).bind(sixMonthStart, end, ...scopeSql(scope, "et.entity_id").values).all<Record<string, unknown>>(),
  ]);
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
    cashFlow: cashFlow.results.map((row) => ({ month: String(row.month), incomeCents: Number(row.income_cents), spendCents: Number(row.spend_cents), netCents: Number(row.net_cents) })),
    categorySpend: categorySpend.results.map((row) => ({ month: String(row.month), category: String(row.category), colorToken: String(row.color_token), spentCents: Number(row.spent_cents) })),
  };
}

export async function getBusinessData(year: string, quarter = "all") {
  await ensureDatabase();
  const quarterNumber = quarter.match(/^q([1-4])$/i)?.[1];
  const startMonth = quarterNumber ? (Number(quarterNumber) - 1) * 3 + 1 : 1;
  const endMonth = quarterNumber ? startMonth + 3 : 13;
  const start = `${year}-${String(startMonth).padStart(2, "0")}-01`;
  const end = endMonth === 13 ? `${Number(year) + 1}-01-01` : `${year}-${String(endMonth).padStart(2, "0")}-01`;
  const effective = `WITH business_effective AS (
    SELECT t.id, t.posted_at, t.amount_cents, t.bucket, t.entity_id,
      t.income_source_id, t.tax_category_id, t.deductible_pct, t.is_pending, t.is_transfer
    FROM transactions t WHERE NOT EXISTS (SELECT 1 FROM transaction_splits s WHERE s.transaction_id = t.id)
    UNION ALL
    SELECT t.id, t.posted_at, s.amount_cents, COALESCE(c.default_bucket, t.bucket), s.entity_id,
      t.income_source_id, s.tax_category_id, s.deductible_pct, t.is_pending, t.is_transfer
    FROM transaction_splits s JOIN transactions t ON t.id = s.transaction_id
    LEFT JOIN categories c ON c.id = s.category_id
  )`;
  const [totals, revenue, expenses, monthly, entity] = await Promise.all([
    getDatabase().prepare(`${effective} SELECT
      COALESCE(SUM(CASE WHEN amount_cents > 0 THEN amount_cents ELSE 0 END), 0) AS revenue_cents,
      COALESCE(-SUM(CASE WHEN amount_cents < 0 THEN amount_cents ELSE 0 END), 0) AS expense_cents
      FROM business_effective WHERE entity_id = 'entity_business' AND posted_at >= ? AND posted_at < ?
      AND is_pending = 0 AND is_transfer = 0 AND bucket NOT IN ('transfer', 'ignore')`).bind(start, end).first<{ revenue_cents: number; expense_cents: number }>(),
    getDatabase().prepare(`${effective} SELECT COALESCE(i.name, 'Other business income') AS name, SUM(b.amount_cents) AS amount_cents
      FROM business_effective b LEFT JOIN income_sources i ON i.id = b.income_source_id
      WHERE b.entity_id = 'entity_business' AND b.posted_at >= ? AND b.posted_at < ? AND b.amount_cents > 0
      AND b.is_pending = 0 AND b.is_transfer = 0 AND b.bucket NOT IN ('transfer', 'ignore')
      GROUP BY i.id, i.name ORDER BY amount_cents DESC`).bind(start, end).all<Record<string, unknown>>(),
    getDatabase().prepare(`${effective} SELECT COALESCE(tc.label, 'Unassigned') AS label,
      tc.schedule_c_line, -SUM(b.amount_cents) AS amount_cents,
      -SUM(CAST(b.amount_cents * b.deductible_pct AS INTEGER) / 100) AS deductible_cents
      FROM business_effective b LEFT JOIN tax_categories tc ON tc.id = b.tax_category_id
      WHERE b.entity_id = 'entity_business' AND b.posted_at >= ? AND b.posted_at < ? AND b.amount_cents < 0
      AND b.is_pending = 0 AND b.is_transfer = 0 AND b.bucket NOT IN ('transfer', 'ignore')
      GROUP BY tc.id, tc.label, tc.schedule_c_line ORDER BY amount_cents DESC`).bind(start, end).all<Record<string, unknown>>(),
    getDatabase().prepare(`${effective} SELECT substr(posted_at, 1, 7) AS month,
      COALESCE(SUM(CASE WHEN amount_cents > 0 THEN amount_cents ELSE 0 END), 0) AS revenue_cents,
      COALESCE(-SUM(CASE WHEN amount_cents < 0 THEN amount_cents ELSE 0 END), 0) AS expense_cents
      FROM business_effective WHERE entity_id = 'entity_business' AND posted_at >= ? AND posted_at < ?
      AND is_pending = 0 AND is_transfer = 0 AND bucket NOT IN ('transfer', 'ignore')
      GROUP BY substr(posted_at, 1, 7) ORDER BY month`).bind(start, end).all<Record<string, unknown>>(),
    getDatabase().prepare("SELECT name, set_aside_pct FROM entities WHERE id = 'entity_business' AND is_active = 1").first<{ name: string; set_aside_pct: number }>(),
  ]);
  const revenueCents = totals?.revenue_cents ?? 0;
  const expenseCents = totals?.expense_cents ?? 0;
  return {
    start, end, entityName: entity?.name ?? "Business", setAsidePct: entity?.set_aside_pct ?? 0,
    revenueCents, expenseCents, profitCents: revenueCents - expenseCents,
    reserveCents: Math.round((revenueCents * (entity?.set_aside_pct ?? 0)) / 100),
    revenue: revenue.results.map((row) => ({ name: String(row.name), amountCents: Number(row.amount_cents) })),
    expenses: expenses.results.map((row) => ({ label: String(row.label), scheduleCLine: row.schedule_c_line ? String(row.schedule_c_line) : null, amountCents: Number(row.amount_cents), deductibleCents: Number(row.deductible_cents) })),
    monthly: monthly.results.map((row) => ({ month: String(row.month), revenueCents: Number(row.revenue_cents), expenseCents: Number(row.expense_cents) })),
  };
}

export async function getExportData(filters: TransactionFilters) {
  await ensureDatabase();
  const clauses: string[] = ["1 = 1"];
  const values: unknown[] = [];
  const addList = (column: string, items: string[]) => {
    if (!items.length) return;
    clauses.push(`${column} IN (${items.map(() => "?").join(",")})`);
    values.push(...items);
  };
  if (filters.search) { clauses.push("UPPER(COALESCE(t.merchant_clean, t.description_raw)) LIKE ?"); values.push(`%${filters.search.toUpperCase()}%`); }
  if (filters.startDate) { clauses.push("t.posted_at >= ?"); values.push(filters.startDate); }
  if (filters.endDate) { clauses.push("t.posted_at <= ?"); values.push(filters.endDate); }
  if (filters.minimumAmountCents !== null) { clauses.push("t.amount_cents >= ?"); values.push(filters.minimumAmountCents); }
  if (filters.maximumAmountCents !== null) { clauses.push("t.amount_cents <= ?"); values.push(filters.maximumAmountCents); }
  addList("t.account_id", filters.accountIds); addList("t.entity_id", filters.entityIds); addList("t.bucket", filters.buckets);
  if (filters.categoryIds.length) {
    const categoryIds = filters.categoryIds.filter((id) => id !== "uncategorized");
    const includesEmpty = filters.categoryIds.includes("uncategorized");
    if (includesEmpty && categoryIds.length) {
      clauses.push(`(t.category_id IS NULL OR t.category_id IN (${categoryIds.map(() => "?").join(",")}))`); values.push(...categoryIds);
    } else if (includesEmpty) clauses.push("t.category_id IS NULL");
    else addList("t.category_id", categoryIds);
  }
  if (filters.pending === "exclude") clauses.push("t.is_pending = 0"); else if (filters.pending === "only") clauses.push("t.is_pending = 1");
  if (filters.transfers === "exclude") clauses.push("t.is_transfer = 0"); else if (filters.transfers === "only") clauses.push("t.is_transfer = 1");
  if (filters.ignored === "exclude") clauses.push("(t.bucket IS NULL OR t.bucket != 'ignore')");
  const result = await getDatabase().prepare(`SELECT t.id, t.authorized_at, t.posted_at, t.amount_cents,
      a.name AS account, a.type AS account_type, a.currency,
      COALESCE(t.merchant_clean, t.description_raw) AS merchant, t.description_raw,
      c.name AS category, pc.name AS parent_category, t.bucket, e.name AS entity,
      i.name AS income_source, t.counterparty, tc.label AS tax_category, tc.schedule_c_line,
      t.deductible_pct, t.is_transfer, t.is_pending, t.is_split_parent, t.parent_transaction_id,
      t.notes, t.tags, t.category_source
    FROM transactions t JOIN accounts a ON a.id = t.account_id
    LEFT JOIN categories c ON c.id = t.category_id LEFT JOIN categories pc ON pc.id = c.parent_id
    JOIN entities e ON e.id = t.entity_id LEFT JOIN income_sources i ON i.id = t.income_source_id
    LEFT JOIN tax_categories tc ON tc.id = t.tax_category_id
    WHERE ${clauses.join(" AND ")} ORDER BY t.posted_at, t.created_at`)
    .bind(...values).all<Record<string, unknown>>();
  let inflowsCents = 0; let outflowsCents = 0;
  const rows = result.results.map((record) => {
    const amountCents = Number(record.amount_cents);
    if (amountCents >= 0) inflowsCents += amountCents; else outflowsCents += amountCents;
    const deductiblePct = Number(record.deductible_pct);
    const row: ExportRow = {
      date: String(record.authorized_at ?? record.posted_at), posted_date: String(record.posted_at), account: String(record.account), account_type: String(record.account_type), merchant: String(record.merchant), description: String(record.description_raw),
      amount: decimalCents(amountCents), currency: String(record.currency), category: record.category ? String(record.category) : "", parent_category: record.parent_category ? String(record.parent_category) : "", bucket: record.bucket ? String(record.bucket) : "", entity: String(record.entity), income_source: record.income_source ? String(record.income_source) : "", counterparty: record.counterparty ? String(record.counterparty) : "", tax_category: record.tax_category ? String(record.tax_category) : "", schedule_c_line: record.schedule_c_line ? String(record.schedule_c_line) : "",
      deductible_pct: deductiblePct, deductible_amount: decimalCents(Math.trunc((amountCents * deductiblePct) / 100)), is_transfer: Boolean(record.is_transfer), is_pending: Boolean(record.is_pending), is_split: Boolean(record.is_split_parent), split_of: record.parent_transaction_id ? String(record.parent_transaction_id) : "", notes: record.notes ? String(record.notes) : "", tags: typeof record.tags === "string" ? (JSON.parse(record.tags) as string[]).join("|") : "", category_source: record.category_source ? String(record.category_source) : "", transaction_id: String(record.id),
    };
    return row;
  });
  const totals: ExportTotals = { count: rows.length, inflowsCents, outflowsCents, netCents: inflowsCents + outflowsCents };
  return { rows, totals, startDate: rows[0]?.posted_date ? String(rows[0].posted_date) : null, endDate: rows.at(-1)?.posted_date ? String(rows.at(-1)?.posted_date) : null };
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
