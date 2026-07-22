# Claude Code Build Plan

Use this with `01-PROJECT-SPEC.md` in the repo root. Each phase is a session. Do not skip ahead: every phase ends with something you can actually use.

**Before you start:** drop `01-PROJECT-SPEC.md` and `CLAUDE.md` into the repo root. Claude Code reads `CLAUDE.md` automatically on every session, which is how the rules in Section 8 and 9 of the spec stay enforced without you restating them.

---

## Phase 0: Foundation

**Session prompt:**

> Read `01-PROJECT-SPEC.md` and `CLAUDE.md` in full before writing anything.
>
> Scaffold the project: Next.js 15 App Router, TypeScript strict mode, Tailwind, shadcn/ui, Drizzle ORM against Postgres, Vitest.
>
> Deliver in this order and stop for my review after each:
> 1. Repo structure and dependency install. Show me the tree and explain any dependency that is not obviously required.
> 2. `src/db/schema.ts` implementing every table in Section 3 of the spec, with the indexes listed. Money columns are `integer` cents named `*_cents`. Generate and run the first migration.
> 3. A seed script that inserts a sensible default category taxonomy (see below) and one demo month of fake transactions so the UI has something to render.
> 4. Single-user auth: passcode set from `APP_PASSCODE` env var, argon2 hashed, HTTP-only secure session cookie, middleware protecting everything except `/login`. Rate limit to 5 attempts per 15 minutes.
> 5. Design tokens from `03-CLAUDE-DESIGN-BRIEF.md` wired into `tailwind.config.ts` and `globals.css` as CSS variables. No hardcoded hex values anywhere else in the codebase, ever.
> 6. Empty route shells with the bottom tab bar: Home, Transactions, Budget, Insights, Settings.
>
> Default categories, each with a default bucket:
> Income: Paycheck, Contract/Creator Income, Refunds, Other Income
> Needs: Rent, Utilities, Phone, Internet, Groceries, Transportation, Gas, Insurance, Healthcare, Debt Payment
> Wants: Dining Out, Coffee, Shopping, Entertainment, Subscriptions, Gaming, Travel, Personal Care, Gifts
> Savings: Investment Contribution, Emergency Fund
> System: Transfer, Uncategorized, Ignore
>
> Write the money helpers now and test them: `toCents`, `formatCents`, `sumCents`. No floating point arithmetic on money anywhere in this codebase.

**Acceptance:** you can log in, see five empty screens with correct styling, and `npm test` passes.

---

## Phase 1: The ledger

This is the phase that makes the app real. Take your time here.

**Session prompt:**

> Build the transaction ledger.
>
> 1. **Importer interface.** Define `TransactionImporter` with a `fetch()` returning normalized transactions. Implement `CsvImporter` first. Plaid will implement the same interface in Phase 3. The rest of the app must never know where a transaction came from.
> 2. **CSV/OFX import flow at `/settings/import`.** Upload, auto-detect delimiter and date format, show a column-mapping UI (date, description, amount, and optional separate debit/credit columns since PNC and Capital One export differently), preview the first 10 parsed rows with the sign convention applied, then confirm. Deduplicate on `(account_id, external_id)` where `external_id` is a hash of date + amount + description when the file has no ID column.
> 3. **Merchant normalization** exactly as specified in Section 5 of the spec. Write unit tests with these real cases: `TST* TST COFFEE 8829`, `SQ *BLUESTREET COFFEE`, `AMAZON.COM*RT4Y83`, `MCDONALD'S F1234`, `POS DEBIT WAWA 8832 BLACKSBURG VA`.
> 4. **Transactions screen.** Virtualized list, search, filters (account, category, bucket, date range, amount range, uncategorized only), multi-select with a bulk-recategorize action bar.
> 5. **Transaction detail sheet.** Category picker, bucket, notes, tags, split into multiple categories, mark as transfer, and "Always categorize [merchant] as [category]" which creates a rule.
> 6. **Review mode at `/transactions/review`.** Full-screen single card, large tap targets for the six most likely categories plus a search, keyboard shortcuts on desktop. Optimized for categorizing 500 transactions quickly.
> 7. **Categories and rules editors** in Settings. The rules editor shows a live count of how many existing transactions a rule would match before you save it.
>
> Every category change writes to `merchant_memory` and sets `user_locked = true`.
>
> Constraint: the transactions list must stay smooth at 5,000 rows on a phone. Virtualize, paginate server-side, index properly. Show me the query plan for the filtered list query.

**Acceptance:** import a real CSV export from PNC, categorize a month by hand in under 15 minutes, and the totals reconcile against the bank statement to the cent.

---

## Phase 2: Budgeting and charts

**Session prompt:**

> Build budgeting per Section 6 of the spec.
>
> 1. Budget CRUD by month. "Copy last month" action. Allocation rail showing allocated, unallocated, over-allocated.
> 2. Category budget lines with **pace bars**: filled portion is percent of budget spent, and a vertical tick sits at percent of month elapsed. Label reads "on pace", "ahead of pace", or "over budget". Sort lines by percent-of-budget descending.
> 3. Per-category rollover toggle, with carried balance shown on the line when enabled.
> 4. Bucket summary: needs / wants / savings, plan vs actual. Savings is computed as income minus total spend, not summed from a category.
> 5. Charts, all built with Recharts and the design tokens:
>    - Cash flow: 12-month grouped bars (income, spend) with a net line overlaid.
>    - Category spend: 6-month stacked bars, top 8 categories, rest grouped as Other.
>    - Month rail: the shared signature component from the design brief, used on Home, Budget, and Insights.
> 6. `src/lib/queries.ts` containing every aggregate query. All of them filter `bucket NOT IN ('transfer','ignore')` and exclude pending from actuals. This file is the single source of truth for money math. Nothing else in the app writes an aggregate SQL query.
>
> Write tests for the query helpers covering: a month with no data, a category with a $0 budget (must not divide by zero), a month containing a transfer pair (net effect zero), and a refund (reduces the category, does not become income).

**Acceptance:** your July budget renders, the pace markers are correct on today's date, and a $0-budget category does not produce Infinity or NaN anywhere.

---

## Phase 2.5: Entities, business P&L, and export

Read Sections 2.4, 6.5, and 6.6 of the spec before starting. This phase is two related features: the entity dimension, and the export that depends on it.

**Session prompt, part A: entities**

> 1. Migrate the schema for `entities`, `income_sources`, `tax_categories`, `transaction_splits`, and the new `transactions` columns (`entity_id`, `income_source_id`, `tax_category_id`, `deductible_pct`, `counterparty`, `entity_source`). Seed a Personal entity as default and backfill every existing transaction to it. `entity_id` is NOT NULL with a default; there is never a null entity.
> 2. Seed `tax_categories` with the Schedule C lines relevant to a solo software business: Advertising (8), Contract labor (11), Depreciation (13), Insurance (15), Legal and professional (17), Office expense (18), Supplies (22), Travel (24a), Meals (24b, 50% deductible), Utilities (25), Other expenses (27a). Store `default_deductible_pct` per line. Add a comment in the seed file noting this mapping is a convenience and not tax advice.
> 3. **Scope switcher**: a three-way segmented control (All / Personal / Business) in the app header, backed by a URL search param and persisted to local storage. Wire it into every query in `src/lib/queries.ts` as a `scope` argument. Personal plus Business must always equal All: write a test asserting that on seeded data.
> 4. Budget queries default to `scope = personal` with an "Include business spending" toggle. Home and Transactions default to `all`. See the table in Section 6.5.
> 5. **Splits**: a transaction can be divided into rows with their own amount, category, entity, tax category, and deductible percent. Enforce that splits sum to the parent, in a database constraint if practical and in code regardless. Aggregates read split children when they exist and the parent when they do not, never both. This is the easiest place in the whole app to double-count money, so write the test first.
> 6. Extend `rules` and `merchant_memory` to carry entity, income source, tax category, and deductible percent. Extend the bulk action bar with "Assign to business" and "Assign to personal". Add an "Uncategorized entity" filter preset.
> 7. **Business screen** at `/business`: the P&L layout in Section 6.5, a year and quarter selector, revenue by source, expenses grouped by tax category with Schedule C line labels, monthly revenue-vs-expense bars, and the tax set-aside tracker. Only render the nav item when a business entity exists.
> 8. **Income source analytics**: income by source stacked over 12 months, months-active and coefficient of variation per source, and largest-source-as-percent-of-total.
>
> The set-aside tracker computes a reserve, it does not compute a tax liability. Label it that way in the UI.

**Session prompt, part B: export**

> Build the export screen at `/export` per Section 6.6.
>
> 1. Reuse the exact filter object the Transactions screen uses. One filter type, one validator, two consumers. Do not write a second filter implementation for export.
> 2. Formats: flat CSV, CSV per category (zip), CSV per entity (zip), summary CSV grouped by category / entity / month / tax category, full JSON, and tax package.
> 3. Fixed column order exactly as listed in the spec. Amounts as signed two-decimal strings, dates ISO 8601, conversion done once in the serializer.
> 4. Preview panel: row count, date range, sum of inflows and outflows, net, and the first 10 rows, updating live as filters change. Never let a zero-row export download silently.
> 5. Every file ends with a reconciliation footer row (count, inflows, outflows, net). Write a test that generates an export and asserts the footer matches the value `queries.ts` returns for the same filters.
> 6. Stream CSV generation rather than building strings in memory.
> 7. Saved presets stored in `export_presets`, with run, rename, and delete.
> 8. Filename convention `ledger_{scope}_{start}_{end}_{generated}.{ext}`.
>
> Empty multi-selects mean "all", and the UI states that explicitly rather than leaving it ambiguous.

**Acceptance:** you can produce a business P&L for the year, export it as a tax package zip, open the CSVs, and have the totals match the screen to the cent.

---

## Phase 3: Bank aggregation

**Session prompt:**

> Integrate Plaid. Read Section 2.1 and Section 4 of the spec first.
>
> 1. Plaid Link flow: `/api/plaid/link-token`, client-side Link, `/api/plaid/exchange` storing the item with the access token encrypted using AES-256-GCM (key from `ENCRYPTION_KEY`, 32 bytes hex). The token must never appear in a log, an error message, or a client response.
> 2. `PlaidImporter` implementing the `TransactionImporter` interface from Phase 1. Use `/transactions/sync` with cursor persistence, not `/transactions/get`. Handle `added`, `modified`, and `removed`.
> 3. `/api/sync` endpoint: syncs all active institutions, upserts transactions, updates balances, writes a `balance_snapshots` row per account per day, runs the transfer matcher, then the categorization pipeline. Idempotent. Safe to run twice in a row.
> 4. Vercel Cron config: daily at 06:00 ET.
> 5. **Transfer matcher** implementing Section 4 exactly, including the description heuristics and the investment-contribution special case. Tests: the $823.44 ACH pair, a credit card autopay, a Fidelity contribution, a same-amount coincidence 10 days apart (must NOT match), and two same-amount transfers on the same day (must pair correctly, not cross-match).
> 6. Item error handling: `ITEM_LOGIN_REQUIRED` sets institution status to `needs_reauth` and surfaces an amber banner on Home with a one-tap Link update-mode flow. Rate limits back off. Every failure is written to `last_error` and shown in Settings.
> 7. Investments: Fidelity holdings are for balance and net worth only. Do not import individual trades as spend transactions.
> 8. **Credit health**, per Section 6.7. Pull Plaid Liabilities for the Chase and Capital One cards: APR, last statement balance, last statement date, minimum payment, next due date, overdue flag. Store a `credit_scores` table for manual entries. Build the Credit screen with per-card reported utilization, the days-to-statement-close countdown, the "pay $X to report under 30%" calculation, the on-time streak, and the multi-line score chart with one line per provider-bureau-model.
>
> Do not estimate, model, or predict a credit score anywhere. The app displays scores the user logged and metrics it computed from real balances, nothing else. Label every score line with its bureau and model, since a VantageScore and a FICO are not comparable numbers.
>
> Do not write real credentials to the repo. Test against Plaid Sandbox first, with the sandbox institutions that mirror OAuth behavior, then switch to the Trial plan for real accounts.

**Acceptance:** all five accounts sync, the ACH transfer pair nets to zero in the cash flow chart, and the July income figure matches what you actually earned instead of being inflated by transfers.

---

## Phase 4: Claude categorization

**Session prompt:**

> Build the categorization pipeline in Section 5 of the spec.
>
> 1. `src/lib/categorize.ts` running the five stages in order: user lock, rules, merchant memory, Claude, fallback to review. Each stage records `category_source` and `ai_confidence`.
> 2. Anthropic client server-side only, key from `ANTHROPIC_API_KEY`. Model `claude-haiku-4-5`. Batch 40 transactions per call. Use prompt caching on the static prefix.
> 3. Strict JSON output validated with Zod. Retry once on parse failure, then route to review. Never write an unvalidated model response to the database.
> 4. Prompt construction: the category taxonomy, the entity list with the user-written description of each, the active rules as context, the 20 most recent user-confirmed categorizations as few-shot examples, then the batch. Send only merchant_clean, description_raw, amount, date, and account type.
> 4b. The model predicts category, bucket, entity, and (for inflows) income source, each with its own confidence. Entity is conservative: below 0.9 confidence it resolves to Personal and routes to review. Never auto-assign business without high confidence, because a wrong business tag is a tax problem and a wrong personal tag is a five-second fix. Assert in code that no field named like a token, balance, or account number can enter the payload.
> 5. Review queue: everything below 0.85 confidence, everything flagged probable-transfer, everything uncategorized. Badge count in the tab bar.
> 6. Learning loop: on user correction, upsert `merchant_memory` and increment `hit_count`. On the third identical correction for one merchant, show a toast offering to create a rule.
> 7. Log every call to `ai_runs` with token counts and estimated cost. Settings shows month-to-date AI spend and a master switch for auto-categorization.
>
> Write an eval: take 100 transactions I have already categorized by hand, hide the labels, run the pipeline, report accuracy per stage and overall. Print a confusion table of the misses. I want to see this number before and after any prompt change.

**Acceptance:** eval accuracy above 90%, and a full month of new transactions costs under a few cents to categorize.

---

## Phase 5: Insights

**Session prompt:**

> Build Insights per Section 5.2 and Section 11 of the spec.
>
> 1. **Recurring detection, no AI.** Group by merchant key, find 3+ occurrences with consistent spacing (weekly, biweekly, monthly, quarterly, annual) and amounts within 15%. Store cadence, average amount, next expected date. Flag `price_changed` when the latest amount differs from the trailing average by more than 10%. Show monthly and annualized totals.
> 2. **"What changed" diff, no AI.** Deterministic month-over-month comparison per category with the driving merchants named. This runs always and is always correct.
> 3. **Net worth chart** from `balance_snapshots`, with an include-investments toggle.
> 4. **Runway**: net cash divided by trailing 3-month average spend, in months.
> 4b. **Business section**, deterministic: revenue and profit trend, margin, largest expense line, income concentration (largest source as a percent of total), and set-aside shortfall. Feed these aggregates to the insight generator too, and let it comment on the business separately from personal spending.
> 5. **Claude monthly insights.** Model `claude-sonnet-5`. Input is aggregates only, never raw transactions. Include the guardrails from Section 5.2 of the spec verbatim in the system prompt. Output 3 to 5 insight cards, or fewer, or none. Store in `insights`, dismissible, one generation per month cached so opening the tab does not re-bill.
> 6. Add a visible "Generated by Claude on [date] from [month] data" line on the insight cards. You should always be able to tell deterministic facts from model output at a glance.
>
> Write a test that feeds the insight generator a month where nothing notable happened and assert it returns an empty array rather than manufacturing filler.

---

## Phase 6: Ship it

**Session prompt:**

> 1. PWA: manifest, maskable icons, iOS splash screens, `apple-mobile-web-app-status-bar-style`, service worker caching the app shell and last-known data for offline read.
> 2. Full data export to CSV and JSON from Settings.
> 3. Lighthouse pass: performance, accessibility, and best practices above 90 on mobile. Fix what it finds, do not just report it.
> 4. Accessibility: visible keyboard focus, 44pt minimum tap targets, WCAG AA contrast on every text-on-color pair, `prefers-reduced-motion` respected, screen-reader labels on every chart with a text summary of the data.
> 5. Error boundaries on every route with a real recovery action, not a generic apology.
> 6. `README.md` with setup, env vars, and a runbook for the two failure modes you will actually hit: a broken Plaid item and a failed nightly sync.
>
> Optional: Capacitor wrap for Face ID unlock and a home screen widget showing safe-to-spend.

---

## Working practices for these sessions

- **One phase per session.** Clear context between phases. The spec file carries the state, not the conversation.
- **Ask for the plan before the code** on Phases 3, 4, and 5. Those have real design decisions in them.
- **Make it commit at every acceptance point** with a real message. You want to be able to roll back a phase.
- **Push back on scope creep.** If Claude Code offers to add goals, gamification, or a second theme mid-phase, decline. Finish the phase.
- **Run the eval in Phase 4 before and after every prompt edit.** Prompt changes that feel better and score worse are common.
- Useful slash commands for this project, given how you already work: `/debug` when the transfer matcher misbehaves, `/code-review` at the end of each phase, `/loop` on the Phase 4 eval.
