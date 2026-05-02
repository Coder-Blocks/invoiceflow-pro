import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

function csvSafe(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET() {
  const active = await requireActiveOrganization();
  const organizationId = active.organizationId;

  const journalEntries = await prisma.journalEntry.findMany({
    where: { organizationId },
    include: {
      lines: {
        include: {
          ledger: true,
        },
      },
    },
    orderBy: {
      voucherDate: "desc",
    },
  });

  const rows: string[][] = [
    [
      "Voucher Date",
      "Voucher Number",
      "Narration",
      "Reference",
      "Status",
      "Ledger",
      "Ledger Type",
      "Debit",
      "Credit",
    ],
  ];

  for (const entry of journalEntries) {
    for (const line of entry.lines) {
      rows.push([
        entry.voucherDate
          ? new Date(entry.voucherDate).toISOString().slice(0, 10)
          : "",
        entry.voucherNumber || "",
        entry.narration || "",
        entry.reference || "",
        entry.status || "",
        line.ledger?.name || "",
        line.ledger?.type || "",
        Number(line.debit || 0).toFixed(2),
        Number(line.credit || 0).toFixed(2),
      ]);
    }
  }

  const csv = rows.map((row) => row.map(csvSafe).join(",")).join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="accounting-report-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}