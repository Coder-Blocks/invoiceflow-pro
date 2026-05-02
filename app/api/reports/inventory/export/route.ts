import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

function csvSafe(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET() {
  const active = await requireActiveOrganization();
  const organizationId = active.organizationId;

  const stocks = await prisma.medicineStock.findMany({
    where: { organizationId },
    orderBy: {
      medicineName: "asc",
    },
  });

  const rows: string[][] = [
    [
      "Medicine",
      "Quantity",
      "Unit Type",
      "Batch Number",
      "Cost Price",
      "Stock Cost Value",
      "Low Stock Threshold",
      "Expiry Date",
      "Status",
    ],
  ];

  for (const stock of stocks) {
    const quantity = Number(stock.quantity || 0);
    const costPrice = Number(stock.costPrice || 0);
    const stockCostValue = quantity * costPrice;

    rows.push([
      stock.medicineName || "",
      String(quantity),
      stock.unitType || "",
      stock.batchNumber || "",
      costPrice.toFixed(2),
      stockCostValue.toFixed(2),
      String(stock.lowStockThreshold || 0),
      stock.expiryDate
        ? new Date(stock.expiryDate).toISOString().slice(0, 10)
        : "",
      quantity <= Number(stock.lowStockThreshold || 0) ? "LOW_STOCK" : "OK",
    ]);
  }

  const csv = rows.map((row) => row.map(csvSafe).join(",")).join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="inventory-report-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}