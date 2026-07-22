import { z } from "zod";
import type { TransactionListItem } from "./queries";

export const transactionFiltersSchema = z.object({
  search: z.string().max(120).default(""),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  minimumAmountCents: z.number().int().nullable().default(null),
  maximumAmountCents: z.number().int().nullable().default(null),
  accountIds: z.array(z.string()).max(100).default([]),
  categoryIds: z.array(z.string()).max(200).default([]),
  entityIds: z.array(z.string()).max(50).default([]),
  buckets: z.array(z.enum(["need", "want", "save", "income", "transfer", "ignore"])).max(6).default([]),
  pending: z.enum(["include", "exclude", "only"]).default("include"),
  transfers: z.enum(["include", "exclude", "only"]).default("include"),
  ignored: z.enum(["include", "exclude"]).default("include"),
});

export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;

export const defaultTransactionFilters: TransactionFilters = {
  search: "", startDate: null, endDate: null, minimumAmountCents: null, maximumAmountCents: null,
  accountIds: [], categoryIds: [], entityIds: [], buckets: [], pending: "include", transfers: "include", ignored: "include",
};

export function matchesTransaction(transaction: TransactionListItem, filters: TransactionFilters) {
  if (filters.search && !transaction.merchant.toLowerCase().includes(filters.search.toLowerCase())) return false;
  if (filters.startDate && transaction.postedAt < filters.startDate) return false;
  if (filters.endDate && transaction.postedAt > filters.endDate) return false;
  if (filters.minimumAmountCents !== null && transaction.amountCents < filters.minimumAmountCents) return false;
  if (filters.maximumAmountCents !== null && transaction.amountCents > filters.maximumAmountCents) return false;
  if (filters.accountIds.length && !filters.accountIds.includes(transaction.accountId)) return false;
  if (filters.categoryIds.length && !filters.categoryIds.includes(transaction.categoryId ?? "uncategorized")) return false;
  if (filters.entityIds.length && !filters.entityIds.includes(transaction.entityId)) return false;
  if (filters.buckets.length && !filters.buckets.includes(transaction.bucket as TransactionFilters["buckets"][number])) return false;
  if (filters.pending === "exclude" && transaction.isPending || filters.pending === "only" && !transaction.isPending) return false;
  if (filters.transfers === "exclude" && transaction.isTransfer || filters.transfers === "only" && !transaction.isTransfer) return false;
  if (filters.ignored === "exclude" && transaction.bucket === "ignore") return false;
  return true;
}
