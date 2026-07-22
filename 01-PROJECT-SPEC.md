# Personal Budgeting App: Master Spec

Working name: **Ledger** (rename freely)
Owner: Collin Falkowski
Users: 1 (single-tenant, private, self-hosted)
Status: pre-build spec, hand this to Claude Code and Claude Design

---

## 1. What this is

A private budgeting app for one person that:

1. Connects to PNC (checking/savings), Chase (credit), Capital One (two credit cards), and Fidelity (investments), and accepts any bank added later.
2. Pulls transactions automatically, categorizes them, and keeps a clean ledger.
3. Lets you set one monthly budget total, split it into category budgets, and compare plan vs actual visually.
4. Shows money in, money out, and monthly net, correctly, with internal transfers excluded.
5. Uses the Claude API to auto-categorize new transactions based on how you have categorized in the past, and to write a short monthly read on what is going well and what is not.
6. Separates **business** (game development) income and expenses from personal, while still counting both in the total picture. See Section 6.5.
7. Exports any slice of the ledger: one category, several categories, one entity, or everything. See Section 6.6.
8. Looks like a clean modern finance tool. No glows, no gradients-as-decoration, no gamification.

### What it is explicitly not
- Not multi-user. No sharing, no roles, no invites.
- Not a payments app. Read-only data access.
- Not an investment advisor. Fidelity data is for net worth tracking and cash flow context only.

---

## 2. Core design decisions (make these before writing code)

### 2.1 Bank aggregation: use Plaid

**Recommendation: Plaid on the free Trial plan.**

As of April 2026 Plaid offers a free Trial plan for new US/Canada teams that gives real production data at no cost, capped at 10 Production Items, and it bundles Transactions, Balance, Identity, Liabilities, and Investments. Most OAuth institutions (which includes Chase and Capital One) are reachable without full Production approval.

Your account list uses 5 of the 10 Items:

| Institution | Plaid Item | Products needed |
|---|---|---|
| PNC | 1 | transactions, balance |
| Chase credit | 1 | transactions, balance, liabilities |
| Capital One card A | 1 | transactions, balance, liabilities |
| Capital One card B | 1 | transactions, balance, liabilities |
| Fidelity | 1 | investments, balance |

Notes and risks:
- Two Capital One cards on the same login may come back as one Item with two accounts. That is fine and uses fewer Items. Design the schema as Institution 1..N Accounts.
- Plaid Trial terms change. Verify current limits at dashboard.plaid.com before committing, and check the Trial plan is still open to new teams.
- If you outgrow Trial, the pay-as-you-go tier bills roughly per connected Item per month for Transactions. Budget for a few dollars a month, not zero.

**Alternative if Plaid Trial is unavailable to you: SimpleFIN Bridge.** Roughly $15/year, US/Canada, designed for exactly this use case (it is the sync backend that Actual Budget uses). Coverage is broader than you would expect but verify PNC, Chase, Capital One, and Fidelity specifically before paying.

**Mandatory regardless of aggregator: build CSV/OFX import first.** All four institutions export CSV or QFX. Import is your fallback when a connection breaks (it will break), your backfill path for history older than the aggregator returns, and it means the app is useful on day one before any bank integration exists. Treat the aggregator as one importer among several behind a common interface.

### 2.2 Platform: installable PWA first, native shell later

Build a responsive web app that installs to your iPhone home screen. Reasons:
- No $99/year Apple Developer account to get it on your phone.
- One codebase, instant deploys, no App Store review.
- You can wrap the same code in Capacitor later if you want Face ID, real push notifications, or widgets.

Design for a 390pt wide viewport first. Desktop is a bonus, not a target.

### 2.3 Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | API routes keep Plaid and Claude keys server-side; one deploy target |
| Styling | Tailwind CSS + shadcn/ui | Fast, unopinionated enough to take the design system in Section 8 |
| Charts | Recharts | Composable, themeable, no canvas weirdness |
| Database | Postgres (Supabase or Neon free tier) | Real SQL for the aggregation queries; both have free tiers |
| ORM | Drizzle | Typed, migration-friendly, light |
| Auth | Single-user passcode + signed HTTP-only session cookie | Simplest thing that is actually secure for one user |
| Hosting | Vercel free tier | Cron jobs included for nightly sync |
| Jobs | Vercel Cron hitting `/api/sync` | Daily pull, no queue infrastructure needed |

Money is stored as **integer cents**, never floats. Everywhere. No exceptions.

### 2.4 Scope: entity is a separate dimension from category

Business versus personal is **not** a category and **not** a bucket. It is an orthogonal tag called `entity_id` that every transaction carries.

This matters because the alternative (a "Business" category) breaks the moment you want to know how much you spent on software across both a business subscription and a personal one, or how much you earned in total. With a separate dimension you can slice either way:

| Question | Filter |
|---|---|
| What did I earn in total? | all entities, bucket = income |
| What did the game business earn? | entity = Business, bucket = income |
| What did I spend on software everywhere? | all entities, category = Subscriptions |
| What is my business profit? | entity = Business, income minus spend |

Entities are rows in a table, not an enum, so you can add a second business later without a migration.

### 2.5 Sign convention

- `amount_cents` is signed from your perspective: **positive = money into your net worth, negative = money out.**
- Plaid returns positive for outflow on depository accounts. Normalize at the importer boundary, once, and write a test for it.
- Credit card accounts: a purchase is negative, a payment to the card is positive on the card and negative on checking, and the pair nets to zero as a transfer.

---

## 3. Data model

```
institutions
  id, name, plaid_item_id, access_token_encrypted, status,
  last_synced_at, last_error, created_at

accounts
  id, institution_id, external_id, name, official_name, mask,
  type (depository|credit|investment|loan|cash),
  subtype, currency, current_balance_cents, available_balance_cents,
  credit_limit_cents, is_active, include_in_net_worth, sort_order

transactions
  id, account_id, external_id (unique per account), source (plaid|csv|manual),
  posted_at, authorized_at, amount_cents (signed),
  description_raw, merchant_raw, merchant_clean,
  category_id, bucket (need|want|save|income|transfer|ignore),
  entity_id                -> entities.id, NOT NULL, defaults to the Personal entity
  income_source_id         -> income_sources.id, nullable, only set when bucket = income
  tax_category_id          -> tax_categories.id, nullable, only meaningful for business rows
  deductible_pct           smallint 0-100, default 100 on business rows, 0 on personal
  counterparty             text, nullable: who paid you or who you paid, when it differs from merchant
  is_pending, is_transfer, transfer_group_id,
  notes, tags[], is_split_parent, parent_transaction_id,
  category_source (user|rule|memory|ai|import), ai_confidence, ai_rationale,
  entity_source (user|rule|memory|ai|default),
  user_locked (bool), created_at, updated_at

entities
  id, name, kind (personal|business), is_default,
  tax_form (schedule_c|none), tax_year_start_month (default 1),
  set_aside_pct (int, default 0: percent of business income to reserve for taxes),
  color_token, is_active, sort_order

income_sources
  id, entity_id, name, kind (employment|contract|creator_payout|royalty|
      reimbursement|refund|gift|interest|other),
  payer_name, expected_cadence (weekly|biweekly|monthly|irregular|none),
  issues_1099 (bool), notes, is_active

tax_categories             -- Schedule C line mapping, business rows only
  id, code, label, schedule_c_line, default_deductible_pct, notes, sort_order

transaction_splits         -- one parent transaction, many allocations
  id, transaction_id, amount_cents, category_id, entity_id,
  tax_category_id, deductible_pct, note
  -- constraint: SUM(splits.amount_cents) = parent.amount_cents, enforced in code and by test

export_presets
  id, name, filters_json, format (csv|csv_per_category|json|tax_package),
  grouping (none|category|entity|month|tax_category),
  last_run_at, created_at

categories
  id, name, parent_id, icon, color_token, default_bucket, is_archived, sort_order

rules                      -- deterministic, runs before AI
  id, priority, enabled, name,
  match_field (merchant|description|amount|account),
  match_op (contains|equals|regex|between), match_value,
  set_category_id, set_bucket, set_is_transfer, set_notes,
  set_entity_id, set_income_source_id, set_tax_category_id, set_deductible_pct

merchant_memory            -- learned from your corrections
  id, merchant_key (normalized), category_id, bucket, entity_id,
  hit_count, last_used_at, confidence

budgets
  id, month (first day of month), total_cents, note, created_at

budget_lines
  id, budget_id, category_id, amount_cents,
  rollover_enabled, rollover_cents

balance_snapshots          -- one row per account per day, for net worth chart
  account_id, as_of (date), balance_cents

recurring                  -- detected subscriptions and bills
  id, merchant_key, cadence (weekly|biweekly|monthly|quarterly|annual),
  avg_amount_cents, last_seen_at, next_expected_at, account_id,
  status (active|ended|price_changed), previous_amount_cents

insights                   -- Claude-generated monthly read
  id, month, kind (win|watch|action), title, body,
  evidence_json, model, created_at, dismissed_at

ai_runs                    -- cost and audit log
  id, kind (categorize|insight), model, input_tokens, output_tokens,
  est_cost_cents, item_count, created_at, error
```

Indexes that matter: `transactions(posted_at)`, `transactions(account_id, external_id)` unique, `transactions(category_id, posted_at)`, `transactions(transfer_group_id)`, `transactions(entity_id, posted_at)`, `transactions(income_source_id)`, `transaction_splits(transaction_id)`.

Seed `entities` with one row, `Personal`, `is_default = true`. Every existing and future transaction defaults to it, so adding the business dimension never leaves a null.

---

## 4. The transfer problem (do this right, DollarWise does not)

Any movement between two accounts you own must be excluded from income, spend, and budget math, while still appearing in the ledger.

**Matching algorithm, run after every sync:**

1. Find unmatched transactions where `is_transfer` is not already set.
2. For each negative transaction, look for a positive transaction where:
   - absolute amounts are equal (allow a 1 cent tolerance),
   - `posted_at` is within 4 days,
   - accounts differ,
   - neither is already in a transfer group.
3. On match: assign a shared `transfer_group_id`, set `is_transfer = true` and `bucket = 'transfer'` on both.
4. Unmatched candidates that look like transfers (description contains "ACH TRANSFER", "PAYMENT THANK YOU", "AUTOPAY", "ONLINE TRANSFER", "CAPITAL ONE MOBILE PMT", "CHASE CREDIT CRD AUTOPAY", "FID BKG SVC LLC") go into the review queue flagged as **probable transfer**, not silently counted as income.
5. User can manually pair or unpair two transactions in the UI. Manual pairing sets `user_locked` and is never undone by the matcher.

**Special cases to handle explicitly:**
- Credit card payments: outflow from PNC, inflow to the card. Transfer, not spend. The original purchases on the card are the spend.
- Fidelity contributions: outflow from PNC, inflow to Fidelity. This is a transfer for cash flow purposes but should count toward the **savings rate**. Give it `bucket = 'save'` on the destination side and `transfer` treatment on the source. Flag with `tags: ['investment_contribution']`.
- Venmo/Zelle reimbursements: an inflow that is a refund of a specific spend. Let the user link an inflow to an earlier expense so it reduces that category's actual instead of counting as income.
- Refunds and returns: positive amount, same merchant, existing category. Should net against the category, not appear as income.

Every aggregate query in the app must filter `WHERE bucket NOT IN ('transfer','ignore')` by default. Put this in one shared query helper so it cannot be forgotten.

---

## 5. Categorization pipeline

The rule you asked for: you sort manually first, then the AI learns from that. The pipeline enforces it.

**Order of operations for each uncategorized transaction:**

1. **User lock.** If `user_locked`, stop. Nothing overwrites a human decision.
2. **Rules.** First matching rule by priority wins. `category_source = 'rule'`, confidence 1.0.
3. **Merchant memory.** Normalized merchant key exact hit with `hit_count >= 2`. `category_source = 'memory'`, confidence 0.95.
4. **Claude API.** Batch of 25 to 50 transactions in one call. `category_source = 'ai'`, confidence from the model.
5. **Fallback.** Uncategorized, goes to review queue.

Each stage resolves **category, bucket, and entity** together, and records `category_source` and `entity_source` separately. A rule may set entity without setting category, and vice versa. Entity always resolves to something: if no stage is confident, it is Personal and it is flagged for review, never null.

**Review queue** surfaces anything with confidence below 0.85, anything flagged as probable transfer, and anything uncategorized. Badge count in the nav, same as the DollarWise "Review 9" pattern which is the one thing that app got right.

**Learning loop:** every time you change a category in the UI, upsert `merchant_memory` for that merchant key and increment `hit_count`. After the third identical correction for a merchant, prompt: "Always categorize FIVE BELOW as Shopping? [Create rule]". This converts your manual work into deterministic rules over time, so AI spend goes down every month rather than up.

**Merchant normalization** before any of this: uppercase, strip store numbers, strip trailing digits and dates, strip common noise (`SQ *`, `TST*`, `PAYPAL *`, `POS DEBIT`, `#1234`), collapse whitespace. `TST* TST COFFEE 8829` and `TST*TST COFFEE` must produce the same key.

### 5.1 Claude categorization call

- Model: **claude-haiku-4-5** (high volume, cheap, more than good enough for this).
- Batch 25 to 50 transactions per request.
- Use prompt caching on the static prefix (category taxonomy + rules + instructions). It will not change between calls in a sync run.
- Force JSON output. Provide the schema in the prompt and validate the response with Zod before writing anything to the database. On parse failure, retry once, then drop those transactions into the review queue rather than guessing.
- Include, as few-shot examples, the 20 most recent user-confirmed categorizations. This is what makes it match your judgment instead of a generic taxonomy.
- Never send account numbers, balances, access tokens, or your name. Send only: a temporary index, merchant_clean, description_raw, amount, date, account type.

The model also predicts **entity** and, for inflows, **income source**. Give it a short description of each entity in the prompt, written by you in Settings. For example: "Business: solo Fortnite/UEFN game development. Income arrives as Epic creator payouts and occasional client contracts. Expenses are game engine and asset purchases, Adobe and other creative software, contractor payments to collaborators, and hardware."

Entity prediction is deliberately conservative. If confidence in the entity is below 0.9, default to Personal and send it to review. A personal expense wrongly marked business is a tax problem; a business expense wrongly marked personal is a five-second fix in the review queue. Bias toward the recoverable error.

Response shape per item:
```json
{ "id": "t_04", "category": "Dining Out", "bucket": "want",
  "entity": "Personal", "entity_confidence": 0.97,
  "income_source": null, "tax_category": null,
  "confidence": 0.92, "is_transfer": false, "rationale": "Coffee shop, discretionary" }
```

Log every run to `ai_runs` with token counts and estimated cost. Show a running monthly AI spend figure in Settings. You should always know what this costs.

### 5.2 Claude insights call

- Model: **claude-sonnet-5** (better reasoning, runs once or twice a month, cost is negligible).
- Trigger: manually from the Insights screen, plus automatically on the 1st of each month for the closed prior month.
- Input: **aggregates only, never raw transactions.** Category totals this month and prior 3 months, budget vs actual per category, income total, net cash flow, savings rate, top 10 merchants by spend, recurring subscriptions with any price changes, account balances trend.
- Output: 3 to 5 insight objects, each with kind (win / watch / action), a title under 8 words, two sentences of body, and every number cited must come from the supplied data.

Guardrails to put in the system prompt verbatim:
- Use only the numbers provided. Never estimate, extrapolate, or invent a figure.
- No investment advice, no security recommendations, no tax advice.
- Do not moralize about spending. Report the pattern and one concrete action.
- If the data does not support an insight, return fewer insights. An empty array is a valid answer.

That last one matters. Most finance apps manufacture insights to fill space, which is how you get "No actionable insights right now" as a permanent state or, worse, noise you learn to ignore.

---

## 6. Budgeting model

**Top-down, which matches how you described it.**

1. Set a monthly total (example: $2,000).
2. Allocate to categories. A live rail shows Allocated / Unallocated / Over-allocated. You are not forced to zero it out, but the app tells you where you stand.
3. Each category line shows: budgeted, spent, remaining, and **pace**.

**Pace is the feature that makes this better than DollarWise.** On July 22 you are 71% through the month. If you have spent 90% of the Dining Out budget, the bar shows 90% filled with a tick mark at 71%, and the label reads "ahead of pace". A raw percentage bar without a pace marker tells you almost nothing until the month is over.

**Rollover** is per category, off by default. When on, unspent budget carries into next month and overspend carries as a negative. Good for Transportation and irregular categories, bad for Groceries.

**Copy last month** button when creating a new budget. You will use this every month.

**Budget templates** for the 50/30/20 view: since you already think in Needs/Wants/Savings, show a secondary read of the same budget grouped by bucket, with plan vs actual, like the pie in your screenshots. But compute savings as (income minus spend), not as a category, so it cannot show 0% while you are actually saving.

---

## 6.5 Business and personal separation

You run a game development side business. Its money moves through the same accounts as your personal money, and it needs to be separable without being removed from the overall picture.

### Scope switcher

A three-way segmented control lives in the app header on Home, Transactions, and Insights: **All · Personal · Business**. The selection persists across sessions and is reflected in the URL as `?scope=business` so a view is linkable.

Defaults, chosen deliberately:

| Screen | Default scope | Why |
|---|---|---|
| Home | **All** | It is all real money moving through real accounts. Net cash flow must reflect reality. |
| Transactions | **All** | You need to see everything to sort it. |
| Budget | **Personal** | Business spend is revenue-driven and variable. Budgeting it against a fixed monthly allowance is meaningless and would make every good month look like an overspend. |
| Business | **Business** | It is a profit and loss statement, not a budget. |
| Insights | **All**, with a business section | |

That Budget default is the important one. If a $600 asset pack purchase blows through your Wants budget in a month where the business earned $2,000, the budget has told you something false. Business spend is excluded from budget actuals by default, with a toggle labeled "Include business spending" for when you want the combined view.

### Business screen

Not a budget, a P&L:

```
BUSINESS · Game Development                    2026 ▾

Revenue                                      $14,280
Expenses                                     -$3,915
                                             ────────
Net profit                                   $10,365      73% margin

Set aside for taxes (30%)                     $3,110
Actually set aside                            $1,200      short by $1,910

REVENUE BY SOURCE
Epic creator payouts        $11,900   ████████████████
Client contracts             $2,380   ███

EXPENSES BY TAX CATEGORY
Software and subscriptions   $1,464   Schedule C line 18
Contract labor                 $900   Schedule C line 11
Supplies and assets            $786   Schedule C line 22
Advertising                    $445   Schedule C line 8
Other                          $320   Schedule C line 27a

MONTHLY  [ revenue vs expense bars, 12 months, net line ]
```

Additional business-only features:

- **Tax set-aside tracker.** `entities.set_aside_pct` times business income for the period, compared against what you have actually moved to savings or investments. Given that your savings rate currently reads 0%, this is the single most useful number the app can show you. It is a reserve calculation, not tax advice, and the screen should say so.
- **Quarterly view** aligned to estimated tax quarters (Apr 15, Jun 15, Sep 15, Jan 15) since that is the cadence that matters for self-employment income.
- **1099 reconciliation.** Flag income sources marked `issues_1099` and show the annual total per payer, so in January you can check what Epic reports against what you recorded.
- **Deductible percentage** on shared expenses. Your phone and internet are partly business. Set `deductible_pct` to 40 and the P&L counts 40% while cash flow still counts 100%. Splits handle the harder cases like a laptop.

### Income source tracking

Income needs a second dimension too, because "Income $1,963" tells you nothing about stability. Every inflow gets an `income_source_id`. Sources are user-defined, belong to an entity, and record whether the payer issues a 1099.

Suggested seed set for you: `Epic Creator Payout` (business, creator_payout, 1099), `Client Contract` (business, contract, 1099), `Paycheck` (personal, employment), `Reimbursement` (personal), `Refund` (personal), `Interest` (personal).

Charts that fall out of this for free:
- Income by source, stacked bars, 12 months. Shows concentration risk at a glance.
- Source stability: for each source, months active out of the last 12 and the coefficient of variation of the amounts. With irregular creator income this is more honest than a single monthly average.
- Largest source as a percent of total income. A number worth watching during a job search.

### Rules and bulk editing

The initial sort is the work, so make it fast:

- Rules can set entity, income source, tax category, and deductible percent, not just category. One rule handles every future Epic payout.
- The Transactions multi-select action bar gets **Assign to business** and **Assign to personal** alongside bulk recategorize.
- A filter preset for **Uncategorized entity** so you can sweep anything the AI was not confident about.
- When you mark a merchant as business for the third time, offer the rule, same learning loop as categories.

### Practical note

The cleanest long-term fix is a separate checking account and a business card for the game dev work, which makes the entity tag almost automatic by account. Add an optional `default_entity_id` on `accounts` so a dedicated business account tags everything in it on import. Worth doing even before you open one, because it makes the eventual switch a settings change.

The tax category mapping is a bookkeeping convenience, not tax advice. Confirm the Schedule C treatment of anything material with a CPA before filing.

---

## 6.6 Export

Export is a first-class screen at `/export`, not a button buried in Settings.

### Filters

Every export is defined by the same filter object the Transactions screen uses, so anything you can view you can export:

- Date range: preset (this month, last month, quarter, year to date, last year, all) or custom.
- Entity: any combination, or all.
- Category: multi-select with select-all and select-none, grouped by bucket.
- Income source: multi-select.
- Bucket: needs, wants, savings, income, transfer.
- Account: multi-select.
- Tax category: multi-select.
- Toggles: include transfers (default off), include pending (default off), include ignored (default off), include split children instead of parents (default off).

Selecting nothing in a multi-select means "all of it", and the UI says so rather than exporting an empty file.

### Formats

| Format | Output | Use |
|---|---|---|
| **Flat CSV** | one row per transaction, all fields | Spreadsheet analysis, the default |
| **CSV per category** | a zip, one file per category, plus `summary.csv` with totals | When you asked for "by type", this is it |
| **CSV per entity** | a zip, one file per entity, plus a combined file | Handing the business file to a bookkeeper |
| **Summary CSV** | one row per group with totals and counts, grouped by category, entity, month, or tax category | Pivot-ready |
| **JSON** | full fidelity including splits, rules, and categories | Backup and migration |
| **Tax package** | business entity only: expenses grouped by Schedule C line with totals, income grouped by payer with 1099 flags, and a cover sheet | January |

### Columns

Flat CSV column order, fixed so downstream spreadsheets do not break between exports:

```
date, posted_date, account, account_type, merchant, description,
amount, currency, category, parent_category, bucket, entity,
income_source, counterparty, tax_category, schedule_c_line,
deductible_pct, deductible_amount, is_transfer, is_pending,
is_split, split_of, notes, tags, category_source, transaction_id
```

Amounts export as signed decimal strings with two places (`-12.68`), not cents, because that is what spreadsheets and accountants expect. Dates are ISO 8601. Do the cents-to-decimal conversion once, in the export serializer.

### Behavior

- **Preview before download.** Show row count, date range, sum of amounts, and the first 10 rows. An export that silently returns 0 rows because a filter was wrong is a real failure mode.
- **Saved presets.** Name and store a filter set. You will build "Business YTD" and "Tax package" once and reuse them every quarter.
- **Streaming.** Generate CSV as a stream, not by building the whole string in memory, so a multi-year export does not hit the serverless memory limit.
- **Reconciliation footer.** Every export ends with a totals row: count, sum of inflows, sum of outflows, net. It should match what the app showed on screen. If it does not, that is a bug worth catching in the file itself.
- **Filename convention:** `ledger_{scope}_{start}_{end}_{generated}.csv`, for example `ledger_business_2026-01-01_2026-07-22_20260722.csv`.

---

## 6.7 Credit health and score log

There is no API that will hand a private single-user app your credit score. Bureau APIs (Equifax, Experian, TransUnion) are B2B or B2B2C products requiring a company, a signed agreement, FCRA permissible purpose, and a security review. Plaid does not expose a consumer score; its credit-reporting products are lender-side underwriting reports. Scraping a free score provider violates their terms and risks locking you out of accounts you depend on, so this app does not do it.

Two things replace it, and together they cover most of what you actually wanted.

### A. Manual score log

You already have free access to several scores through cards you hold. Logging them takes 30 seconds a month and produces exactly the multi-provider chart you were after.

| Source | Bureau | Model | You have it via |
|---|---|---|---|
| Chase Credit Journey | TransUnion | VantageScore 3.0 | your Chase card |
| Capital One CreditWise | TransUnion | VantageScore 3.0 | your Capital One cards |
| Experian free account | Experian | FICO 8 | free signup |
| Discover Scorecard | TransUnion | FICO 8 | free, no card needed |

```
credit_scores
  id, provider, bureau (equifax|experian|transunion),
  model (fico_8|fico_9|vantage_3|vantage_4|other),
  score smallint, pulled_on date, source (manual|import), note
```

Rendering rules that matter more than the schema:

- **Never plot different models on one comparable axis without labeling it.** A VantageScore 3.0 of 720 and a FICO 8 of 690 are not a 30-point disagreement, they are two different measurements. One line per provider-bureau-model combination, clearly labeled, with a one-line explanation of why they differ.
- Show the delta since last entry and the 12-month range per line.
- A monthly reminder on the 1st: "Log your scores" with deep links to the four sources.
- **The app never estimates or predicts a credit score.** That would be fabricating a number, which Section 8 forbids. Show what you logged, nothing more.

### B. Derived credit health, automatic and free

This is the part with real value, and it needs no new data source. Plaid's Liabilities product plus account balances already gives everything below for your Chase and Capital One cards.

Available per card: current balance, credit limit, APR, last statement balance, last statement date, minimum payment, next payment due date, and an overdue flag.

Computed metrics:

```
Per-card utilization       current balance / limit
Aggregate utilization      total balances / total limits
Reported utilization       last statement balance / limit     <- the one that matters
Available credit           total limits minus total balances
On-time streak             consecutive payments before due date
Days to statement close    from last statement date and cycle length
Interest exposure          balance carried past due date x APR
```

**Reported utilization is the sharp one.** Bureaus see your statement balance, not your current balance. If you spend $800 on a $1,000 limit card and pay it off after the statement closes, a 80% utilization gets reported even though you never carried a balance. Paying down before the close date instead of after changes what is reported without costing you anything. Utilization is roughly 30% of a FICO score and it is the fastest-moving input, so this single behavioral change usually matters more than anything else the app could tell you.

### Credit screen

```
┌──────────────────────────────────────────────┐
│ Credit                                       │
│                                              │
│ Reported utilization                         │
│ 24%                                          │  hero
│ $604 of $2,500 available credit used         │
│                                              │
│ ─────────────────────────────────────────    │
│ Chase •4821          $84 / $1,500        6%  │
│ ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░     │
│ Statement closes in 4 days                   │
│                                              │
│ Capital One •7710   $520 / $1,000       52%  │  --warning above 30%
│ ████████████████████░░░░░░░░░░░░░░░░░░░      │
│ Statement closes in 11 days · pay $220 to    │
│ report under 30%                             │
│                                              │
│ On-time payments          14 in a row        │
│                                              │
│ SCORES                            + Log      │
│ [ multi-line chart, one line per source ]    │
│ Credit Journey  TU · Vantage 3.0    724  +6  │
│ CreditWise      TU · Vantage 3.0    724   0  │
│ Experian        EX · FICO 8         701  -3  │
│                                              │
│ Last logged Jun 1 · log again                │
└──────────────────────────────────────────────┘
```

The "pay $X to report under 30%" line is the whole feature in one sentence. It is computed from data you already have, it is always correct, and it needs no AI and no bureau.

Alerts worth wiring: any card crossing 30% reported utilization, a statement closing within 5 days with utilization above 30%, and a payment due within 3 days that has not posted.

---

## 7. Screens

### Home
- Net cash flow this month, large, signed. Income and spend beneath it.
- **Month rail** (see design brief): one horizontal bar, income above, needs/wants/save below, with a today tick.
- Safe to spend: unspent budget remaining divided by days remaining, expressed as a daily number and a total. Show the formula on tap. Never show a number you cannot explain.
- Review queue card if count is greater than zero.
- Accounts list with balances and net worth total.
- Six most recent transactions.

### Transactions
- Search, filter by account / category / bucket / date range / amount range / uncategorized.
- Multi-select for bulk recategorize. Essential for your initial manual pass through history.
- Row: merchant, date, category chip, amount right-aligned in tabular numerals.
- Tap a row: full detail, category picker, bucket, notes, tags, split, pair as transfer, "always do this" rule creation.
- Review mode: full-screen card stack, one transaction at a time, big category buttons, swipe or tap to confirm. This makes the initial 500-transaction manual pass take 20 minutes rather than two hours.

### Budget
- Month selector.
- Total budget with allocation rail.
- Category lines with pace bars, sorted by percent-of-budget descending so the problems are at the top.
- Bucket summary (needs/wants/savings, plan vs actual).

### Insights
- Cash flow: 12-month bar chart, income up, spend down, net line overlaid.
- Spend by category: stacked area or grouped bars over 6 months so trends are visible, not just this month's pie.
- Net worth: line chart from `balance_snapshots`, all accounts, with a toggle to include/exclude investments.
- Recurring: list of detected subscriptions with monthly cost, annualized cost, and a flag on any price increase. Total "you are committed to $X/month" figure at the top.
- Claude insight cards.

### Business
Full spec in Section 6.5. P&L for the period, revenue by source, expenses by tax category, tax set-aside tracker, quarterly view, 1099 reconciliation. Only appears in the nav when at least one business entity exists.

### Export
Full spec in Section 6.6. Filter panel, format picker, live preview with row count and totals, saved presets.

### Accounts and Settings
- Connect account (Plaid Link), reconnect broken items, sync status and last sync time per institution.
- CSV/OFX import with column mapping.
- Categories editor (add, rename, recolor, merge, archive).
- **Entities editor**: name, kind, tax set-aside percent, a plain-language description used in the AI prompt, and an optional default entity per account.
- **Income sources editor**: name, entity, kind, payer, 1099 flag.
- Rules editor with a live "this rule would match N past transactions" preview.
- Claude API key, model selection, monthly AI spend, and a switch for auto-categorization on/off.
- Export everything to CSV or JSON. You own the data, make leaving easy.

---

## 8. Non-negotiable quality bar

- **Never fabricate a number.** If a value is unknown, show a dash, not a zero. A budget of $0 rendering as "124% of budget" is a bug, not a design.
- **Pending transactions** are visually distinct and excluded from budget actuals until posted, but included in safe-to-spend.
- **Sync failures are loud.** A stale account with a broken connection shows an amber state on Home. Silent staleness is the worst failure mode a finance app has.
- **Every aggregate excludes transfers and ignored transactions.** Enforced in one shared query helper.
- **Every aggregate takes a scope argument.** Personal, business, and all must be derivable from the same query, and personal plus business must always equal all. Write a test that asserts this on real data.
- **Splits always reconcile.** The sum of a transaction's splits equals the parent amount, enforced in code and covered by a test. A split that does not balance is refused, not rounded.
- **Exports reconcile with the screen.** The totals row of any export matches the figure the app displays for the same filters.
- **Optimistic UI with rollback** on category changes. Recategorizing 200 transactions should feel instant.
- **Offline read.** Cached last-known data renders when the network is out.

---

## 9. Security

- Plaid access tokens encrypted at rest with AES-256-GCM, key in an env var, never in the database or the repo.
- All Plaid and Anthropic calls server-side only. No key ever reaches the browser.
- Session: HTTP-only, secure, SameSite=Strict cookie. Passcode hashed with argon2. Rate-limit login attempts.
- No third-party analytics, no error reporting service that captures request bodies, no session replay.
- Content Security Policy, no inline scripts except the Plaid Link SDK.
- `.env.example` in the repo, `.env` in `.gitignore`, and a pre-commit hook that greps for `access-` and `sk-ant-`.
- Nothing sent to Claude beyond merchant name, description, amount, date, and account type.

---

## 10. Build phases

| Phase | Scope | Done when |
|---|---|---|
| **0. Foundation** | Next.js scaffold, Postgres, schema, auth, design tokens, empty screens | You can log in and see an empty Home |
| **1. Ledger** | CSV/OFX import, transaction list, manual categorization, review mode, categories, rules | You have imported 6 months of history and categorized it by hand |
| **2. Budget** | Budget CRUD, allocation, pace bars, bucket summary, cash flow chart | You have a July budget and can see plan vs actual |
| **2.5. Entities and export** | Entities, income sources, scope switcher, splits, Business P&L, tax set-aside, full export screen | You can produce a business P&L for the year and export it as a tax package |
| **3. Aggregation** | Plaid Link, item storage, sync endpoint, cron, transfer matcher, balance snapshots, credit health and score log | All five accounts sync nightly, transfers net to zero, and reported utilization is visible per card |
| **4. Intelligence** | Claude categorization, merchant memory, learning loop, confidence routing, AI cost log | New transactions arrive pre-categorized and you correct fewer than 1 in 10 |
| **5. Insights** | Recurring detection, net worth chart, Claude monthly insights, dismissals | You get a monthly read that cites real numbers |
| **6. Polish** | PWA manifest, install prompt, offline cache, Face ID via Capacitor (optional), export | Installed on your home screen and you stopped opening DollarWise |

Phase 1 alone is a usable app. Do not start Phase 3 until Phase 1 and 2 feel good, because the aggregator is the part most likely to eat a weekend on OAuth debugging, and you do not want that to be the thing that kills the project.

---

## 11. Ideas worth adding that you did not ask for

Ranked by value per hour of work:

1. **Pace marker on every budget bar.** Cheap, and it is the difference between a budget you check and a budget you act on.
2. **Recurring/subscription detection with price-change alerts.** Your Adobe, Nintendo, Max, and Spirit charges are exactly this. Annualized total is usually a shock worth seeing once.
3. **"What changed" month-over-month diff.** Auto-generated, no AI needed: "Transportation up $190 vs June, driven by 3 new merchants." Deterministic, always correct, and often more useful than an LLM insight.
4. **Income smoothing.** Your income is irregular (Fortnite creator payouts, contract work). Show a 3-month trailing average alongside the actual, and base safe-to-spend on the trailing average rather than this month's receipts.
5. **Free-tier runway.** Net cash divided by trailing 3-month average spend, expressed in months. One number, very motivating during a job search.
6. **Annual view.** Twelve small bar charts, one per category, showing seasonality. Cheap once the data model is right.
7. **Merchant drill-down.** Tap Chipotle, see every Chipotle charge ever, total spent lifetime, average per visit, frequency. Consistently the most-used feature in apps that have it.
8. **Snapshot on demand.** A single tap that produces a shareable PNG summary of the month. Useful if you ever want to talk about the project publicly.

Skip for now: goals/savings targets (you have no savings account funded yet, so it would render empty), bill pay reminders (calendar handles it), net worth projections (speculative, and speculation in a finance app erodes trust in the real numbers).
