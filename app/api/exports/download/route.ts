import { z } from "zod";
import { serializeCsvHeader, serializeCsvRow, serializeReconciliationFooter } from "@/lib/exporter";
import { getExportData } from "@/lib/queries";
import { transactionFiltersSchema } from "@/lib/transaction-filters";

const schema = z.object({ format: z.enum(["csv", "json"]), filters: transactionFiltersSchema });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check the export request." }, { status: 400 });
  const data = await getExportData(parsed.data.filters);
  if (!data.rows.length) return Response.json({ error: "No transactions match these filters." }, { status: 400 });
  const generated = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const scope = parsed.data.filters.entityIds.length === 1 && parsed.data.filters.entityIds[0] === "entity_business" ? "business" : parsed.data.filters.entityIds.length === 1 ? "personal" : "all";
  const name = `ledger_${scope}_${data.startDate}_${data.endDate}_${generated}.${parsed.data.format}`;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      if (parsed.data.format === "csv") {
        controller.enqueue(encoder.encode(serializeCsvHeader()));
        for (const row of data.rows) controller.enqueue(encoder.encode(serializeCsvRow(row)));
        controller.enqueue(encoder.encode(serializeReconciliationFooter(data.totals)));
      } else controller.enqueue(encoder.encode(JSON.stringify({ generatedAt: new Date().toISOString(), filters: parsed.data.filters, ...data }, null, 2)));
      controller.close();
    },
  });
  return new Response(stream, { headers: { "content-type": parsed.data.format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8", "content-disposition": `attachment; filename="${name}"`, "cache-control": "no-store" } });
}
