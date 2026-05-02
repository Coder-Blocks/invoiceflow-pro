import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

export async function GET() {
  try {
    const active = await requireActiveOrganization();
    const orgId = active.organizationId;

    const [invoices, payments, expenses, customers] = await Promise.all([
      prisma.invoice.findMany({ where: { organizationId: orgId } }),
      prisma.payment.findMany({ where: { organizationId: orgId } }),
      prisma.expense.findMany({ where: { organizationId: orgId } }),
      prisma.customer.findMany({ where: { organizationId: orgId } }),
    ]);

    const backupData = {
      invoices,
      payments,
      expenses,
      customers,
      date: new Date(),
    };

    return new Response(JSON.stringify(backupData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": "attachment; filename=backup.json",
      },
    });
  } catch (error) {
    console.error("BACKUP_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Backup failed" },
      { status: 500 }
    );
  }
}