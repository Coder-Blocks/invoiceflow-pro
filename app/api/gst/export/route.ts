import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

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
    },
    orderBy: {
      issueDate: "asc",
    },
  });

  const expenses = await prisma.expense.findMany({
    where: {
      organizationId: active.organizationId,
      date: startDate
        ? {
            gte: startDate,
            lte: endDate,
          }
        : undefined,
    },
    orderBy: {
      date: "asc",
    },
  });

  const salesRows = [
    "TYPE,DATE,NUMBER,PARTY,AMOUNT,GST,CGST,SGST,IGST",
    ...invoices.map((inv) => {
      const gst = Number(inv.taxAmount || 0);
      const cgst = gst / 2;
      const sgst = gst / 2;

      return [
        "SALE",
        inv.issueDate ? new Date(inv.issueDate).toISOString().slice(0, 10) : "",
        inv.invoiceNumber,
        inv.customer?.name || "",
        Number(inv.totalAmount).toFixed(2),
        gst.toFixed(2),
        cgst.toFixed(2),
        sgst.toFixed(2),
        "0.00",
      ].join(",");
    }),
  ];

  const purchaseRows = [
    "TYPE,DATE,VENDOR,AMOUNT,CGST,SGST,IGST",
    ...expenses.map((exp) =>
      [
        "PURCHASE",
        new Date(exp.date).toISOString().slice(0, 10),
        exp.vendor || "",
        Number(exp.amount).toFixed(2),
        Number(exp.cgst || 0).toFixed(2),
        Number(exp.sgst || 0).toFixed(2),
        Number(exp.igst || 0).toFixed(2),
      ].join(",")
    ),
  ];

  const csv = "GST EXPORT REPORT\n\n" + salesRows.join("\n") + "\n\n" + purchaseRows.join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="gst-report-${month || "all"}.csv"`,
    },
  });
}