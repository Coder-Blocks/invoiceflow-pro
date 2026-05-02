import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";
import {
  checkFreeUsageLimit,
  recordFreeUsage,
} from "@/lib/free-plan-guard";

export async function GET() {
  const active = await requireActiveOrganization();
  const organizationId = active.organizationId;

  if (active.organization.plan === "FREE") {
    const usage = await checkFreeUsageLimit({
      organizationId,
      action: "EXPORT_REPORT",
      limit: 1,
    });

    if (!usage.allowed) {
      return new Response(
        "Free plan allows only 1 report export. Please upgrade to premium.",
        { status: 403 }
      );
    }

    await recordFreeUsage({
      organizationId,
      actorUserId: active.userId,
      action: "EXPORT_REPORT",
    });
  }

  const [invoices, expenses, stocks, payments] = await Promise.all([
    prisma.invoice.findMany({
      where: { organizationId },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.expense.findMany({
      where: { organizationId },
      orderBy: { date: "desc" },
    }),
    prisma.medicineStock.findMany({
      where: { organizationId },
      orderBy: { medicineName: "asc" },
    }),
    prisma.payment.findMany({
      where: { organizationId },
      include: { invoice: true },
      orderBy: { paymentDate: "desc" },
    }),
  ]);

  const rows = [
    "SECTION,DATE,NUMBER_OR_NAME,PARTY_OR_VENDOR,AMOUNT,STATUS,EXTRA",
    ...invoices.map((i) =>
      [
        "INVOICE",
        i.issueDate ? new Date(i.issueDate).toISOString().slice(0, 10) : "",
        i.invoiceNumber,
        i.customer?.name || "",
        Number(i.totalAmount).toFixed(2),
        i.status,
        `Balance Due ${Number(i.balanceDue).toFixed(2)}`,
      ].join(",")
    ),
    ...payments.map((p) =>
      [
        "PAYMENT",
        new Date(p.paymentDate).toISOString().slice(0, 10),
        p.invoice.invoiceNumber,
        p.method,
        Number(p.amount).toFixed(2),
        "RECEIVED",
        p.reference || "",
      ].join(",")
    ),
    ...expenses.map((e) =>
      [
        "EXPENSE",
        new Date(e.date).toISOString().slice(0, 10),
        e.title,
        e.vendor || "",
        Number(e.amount).toFixed(2),
        e.sourceType,
        e.category || "",
      ].join(",")
    ),
    ...stocks.map((s) =>
      [
        "STOCK",
        new Date(s.expiryDate).toISOString().slice(0, 10),
        s.medicineName,
        s.batchNumber,
        (Number(s.quantity) * Number(s.costPrice)).toFixed(2),
        s.quantity <= s.lowStockThreshold ? "LOW_STOCK" : "OK",
        `${s.quantity} ${s.unitType}`,
      ].join(",")
    ),
  ];

  return new Response(rows.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="business-report-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}