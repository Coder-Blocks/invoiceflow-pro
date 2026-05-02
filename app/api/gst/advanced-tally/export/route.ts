import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";
import { getGstSupplyType, isValidGSTIN, splitGST } from "@/lib/gst";

function csvSafe(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const active = await requireActiveOrganization();
  const { searchParams } = new URL(req.url);

  const month = searchParams.get("month");

  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (month) {
    const [year, m] = month.split("-");
    startDate = new Date(Number(year), Number(m) - 1, 1);
    endDate = new Date(Number(year), Number(m), 0, 23, 59, 59);
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId: active.organizationId,
      issueDate: startDate
        ? {
            gte: startDate,
            lte: endDate,
          }
        : undefined,
    },
    include: {
      customer: true,
      lineItems: true,
    },
    orderBy: {
      issueDate: "asc",
    },
  });

  const rows = [
    [
      "Invoice No",
      "Invoice Date",
      "Customer",
      "GSTIN",
      "GSTIN Valid",
      "Supply Type",
      "HSN/SAC",
      "Description",
      "Taxable Value",
      "GST Rate",
      "CGST",
      "SGST",
      "IGST",
      "Total Tax",
      "Line Total",
    ],
  ];

  for (const invoice of invoices) {
    for (const item of invoice.lineItems) {
      const taxAmount = Number(item.lineTax);
      const taxableValue =
        Number(item.lineSubtotal) - Number(item.discountAmount);

      const split = splitGST({
        taxAmount,
        gstType: item.gstType || "INTRA",
      });

      const gstin =
        (invoice.customer as unknown as { gstin?: string | null })?.gstin ||
        invoice.customer?.taxId ||
        "";

      rows.push([
        invoice.invoiceNumber,
        invoice.issueDate
          ? new Date(invoice.issueDate).toISOString().slice(0, 10)
          : "",
        invoice.customer?.name || "",
        gstin,
        isValidGSTIN(gstin) ? "YES" : "NO",
        getGstSupplyType(gstin),
        item.hsnCode || "",
        item.description,
        taxableValue.toFixed(2),
        Number(item.taxRate).toFixed(2),
        split.cgst.toFixed(2),
        split.sgst.toFixed(2),
        split.igst.toFixed(2),
        taxAmount.toFixed(2),
        Number(item.lineTotal).toFixed(2),
      ]);
    }
  }

  const csv = rows.map((row) => row.map(csvSafe).join(",")).join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="advanced-gst-${month || "all"}.csv"`,
    },
  });
}