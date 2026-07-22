import { normalizeMerchant } from "@/lib/merchant";
import { toCents } from "@/lib/money";
import type { NormalizedImportTransaction, TransactionImporter } from "./types";

function tag(block: string, name: string) {
  return block.match(new RegExp(`<${name}>([^<\\r\\n]+)`, "i"))?.[1]?.trim();
}

export class OfxImporter implements TransactionImporter<string> {
  async fetch(input: string): Promise<NormalizedImportTransaction[]> {
    const blocks = input.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>|<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>)/gi) ?? [];
    if (!blocks.length) throw new TypeError("No transactions were found in this OFX/QFX file.");
    return blocks.map((block) => {
      const posted = tag(block, "DTPOSTED");
      const amount = tag(block, "TRNAMT");
      const descriptionRaw = tag(block, "NAME") ?? tag(block, "MEMO") ?? "Unknown transaction";
      if (!posted || !amount) throw new TypeError("An OFX transaction is missing its date or amount.");
      return {
        externalId: tag(block, "FITID"),
        postedAt: `${posted.slice(0, 4)}-${posted.slice(4, 6)}-${posted.slice(6, 8)}`,
        amountCents: toCents(amount),
        descriptionRaw,
        merchantClean: normalizeMerchant(descriptionRaw),
      };
    });
  }
}
