import { env } from "cloudflare:workers";
import migrationSql from "../../drizzle/0000_gifted_jack_flag.sql?raw";
import { seedDatabase } from "./seed";

let initialization: Promise<void> | null = null;

export function getDatabase(): D1Database {
  if (!env.DB) {
    throw new Error("The Ledger database binding is unavailable.");
  }
  return env.DB;
}

async function initialize(db: D1Database) {
  const existing = await db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'entities'")
    .first<{ name: string }>();

  if (!existing) {
    const statements = migrationSql
      .split("--> statement-breakpoint")
      .map((sql) => sql.trim())
      .filter(Boolean);

    for (let offset = 0; offset < statements.length; offset += 50) {
      await db.batch(statements.slice(offset, offset + 50).map((sql) => db.prepare(sql)));
    }
  }

  const seeded = await db.prepare("SELECT id FROM entities WHERE id = ?").bind("entity_personal").first();
  if (!seeded) {
    await seedDatabase(db);
  }

  // Keep the bundled demo coherent across local upgrades without touching user-imported rows.
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO categories (id, name, parent_id, icon, color_token, default_bucket, sort_order) VALUES ('cat_contractors', 'Contractors', 'cat_wants', 'BriefcaseBusiness', 'category-4', 'want', 40)"),
    db.prepare("UPDATE transactions SET category_id = 'cat_contractors' WHERE id = 'txn_contract' AND source = 'demo' AND category_id = 'cat_other_income'"),
  ]);
}

export async function ensureDatabase() {
  initialization ??= initialize(getDatabase()).catch((error) => {
    initialization = null;
    throw error;
  });
  await initialization;
}
