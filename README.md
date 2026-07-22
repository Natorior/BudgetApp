# Ledger

A private, single-user budgeting app designed mobile-first for a 390pt-wide
iPhone viewport. Product requirements and phased acceptance criteria live in
the numbered planning documents at the repository root.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Repository shape

- `app/` — Next.js App Router routes and layouts
- `src/components/` — product and shadcn/ui components
- `src/db/` — Drizzle schema, client, migrations, and seeds
- `src/lib/` — shared business logic and validation
- `src/hooks/` — client hooks used by interactive screens
- `public/` — icons, manifest assets, and other static files
- `worker/`, `build/`, `.openai/` — Sites-compatible deployment surface

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: run the Vitest suite
- `npm run db:generate`: generate Drizzle migrations after schema changes
