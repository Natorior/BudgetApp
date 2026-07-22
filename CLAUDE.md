# CLAUDE.md

Personal budgeting app. Single user. Private. Read `01-PROJECT-SPEC.md` before any work.

## Stack
Next.js 15 App Router, TypeScript strict, Tailwind + shadcn/ui, Drizzle + Postgres, Recharts, Vitest. Deployed on Vercel. Installable PWA, mobile-first at 390pt.

## Absolute rules

**Money**
- Money is `integer` cents in columns named `*_cents`. Never a float. Never a string. No `parseFloat` on a monetary value anywhere.
- Sign convention: positive is money into net worth, negative is money out. Normalize at the importer boundary only.
- All formatting goes through `formatCents`. No ad-hoc `toFixed(2)`.

**Aggregates**
- Every aggregate query lives in `src/lib/queries.ts`. No aggregate SQL anywhere else.
- Every aggregate filters `bucket NOT IN ('transfer','ignore')` and excludes pending from actuals.
- Every aggregate takes a `scope` argument (all | personal | business | entity id). Personal plus business always equals all.
- Never divide without a zero guard. A $0 budget renders as a dash, never as Infinity, NaN, or 0%.

**Entities and splits**
- Business versus personal is `entity_id`, a foreign key, never a category, never a boolean, never a string enum.
- `entity_id` is NOT NULL and defaults to the Personal entity. There is never a null entity.
- When a transaction has splits, aggregates read the split rows. When it does not, they read the parent. Never both. Double-counting money is the worst bug this app can have.
- Splits must sum exactly to the parent amount. Refuse the write otherwise.
- AI-assigned entity below 0.9 confidence resolves to Personal and routes to review. Never auto-assign business on a guess.
- The tax category mapping is a bookkeeping convenience. The app never presents itself as giving tax advice, and the set-aside tracker is labeled a reserve, not a liability.

**Export**
- Export and the Transactions list share one filter type and one validator. Do not write a second filter implementation.
- Column order is fixed and defined in the spec. Adding a column means appending, never reordering.
- Every export ends with a reconciliation footer that matches what `queries.ts` returns for the same filters.
- Amounts export as signed two-decimal strings, dates as ISO 8601. Conversion happens once, in the serializer.
- CSV generation streams. It is never assembled in memory.

**Data honesty**
- Never fabricate, estimate, or interpolate a number shown to the user. Unknown renders as a dash.
- Never overwrite a transaction where `user_locked = true`.
- Stale or broken account connections are surfaced prominently, never hidden.
- Model-generated content is visually distinguishable from computed facts.

**Secrets**
- Plaid tokens and the Anthropic key are server-side only. They never reach the client, a log, or an error message.
- Access tokens are AES-256-GCM encrypted at rest.
- Data sent to the Anthropic API is limited to: merchant name, description, amount, date, account type. Never balances, account numbers, tokens, or personal identifiers.

**AI calls**
- Categorization: `claude-haiku-4-5`, batched, prompt-cached prefix.
- Insights: `claude-sonnet-5`, aggregates only, run at most monthly and cached.
- Every response is validated with Zod before it touches the database. Invalid output routes to the review queue, it does not get guessed at.
- Every call is logged to `ai_runs` with token counts and estimated cost.

**Design**
- All color, spacing, radius, and type values come from tokens defined in `tailwind.config.ts` and `globals.css`. No hardcoded hex, no arbitrary Tailwind values like `text-[13px]`.
- No glows, no decorative gradients, no shadows deeper than the token set, no animation beyond 200ms functional transitions.
- Amounts render in tabular numerals, right-aligned in lists.
- Minimum 44pt tap targets. Visible keyboard focus. WCAG AA contrast. `prefers-reduced-motion` respected.

## Conventions
- Server Components by default. `'use client'` only where interactivity requires it.
- Server Actions for mutations. Optimistic UI with rollback on category changes.
- Zod at every boundary: forms, API routes, model responses, CSV rows.
- Colocate tests as `*.test.ts`. Money math, the transfer matcher, and the categorization pipeline require tests. Do not mark a phase complete with those untested.

## Working style
- Plan before coding on anything touching Plaid, the transfer matcher, or the AI pipeline. Show me the plan first.
- One phase at a time per `02-CLAUDE-CODE-BUILD-PLAN.md`. Do not start the next phase unprompted.
- Do not add features that are not in the spec. Propose them, do not build them.
- Commit at each acceptance point with a descriptive message.
- Prefer deterministic logic over an AI call whenever both would work. Cheaper, faster, and always correct.
