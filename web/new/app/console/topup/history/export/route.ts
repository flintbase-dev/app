import { loadTopupHistory } from "@/lib/console/data";

export async function GET() {
  const { invoices } = await loadTopupHistory({ p: 1, page_size: 100 });
  const rows = [
    ["type", "reference", "method", "status", "timestamp", "amount"],
    ...invoices.items.map((item) => [
      item.type,
      item.reference,
      item.method,
      item.status,
      String(item.ts),
      String(item.amount),
    ]),
  ];
  const body = rows
    .map((row) =>
      row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
  return new Response(body, {
    headers: {
      "content-disposition": 'attachment; filename="flint-billing-history.csv"',
      "content-type": "text/csv; charset=utf-8",
    },
  });
}
