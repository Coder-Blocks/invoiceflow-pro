import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

export async function GET() {
  try {
    const active = await requireActiveOrganization();
    const organizationId = active.organizationId;

    const [
      organization,
      customers,
      invoices,
      invoiceItems,
      estimates,
      estimateItems,
      payments,
      expenses,
      employees,
      payrollRuns,
      salarySlips,
      medicineStocks,
      medicineSales,
      bankTransactions,
    ] = await Promise.all([
      prisma.organization.findUnique({ where: { id: organizationId } }),
      prisma.customer.findMany({ where: { organizationId } }),
      prisma.invoice.findMany({ where: { organizationId } }),
      prisma.invoiceItem.findMany({
        where: { invoice: { organizationId } },
      }),
      prisma.estimate.findMany({ where: { organizationId } }),
      prisma.estimateItem.findMany({
        where: { estimate: { organizationId } },
      }),
      prisma.payment.findMany({ where: { organizationId } }),
      prisma.expense.findMany({ where: { organizationId } }),
      prisma.employee.findMany({ where: { organizationId } }),
      prisma.payrollRun.findMany({ where: { organizationId } }),
      prisma.salarySlip.findMany({ where: { organizationId } }),
      prisma.medicineStock.findMany({ where: { organizationId } }),
      prisma.medicineSale.findMany({ where: { organizationId } }),
      prisma.bankTransaction.findMany({ where: { organizationId } }),
    ]);

    const backup = {
      app: "InvoiceFlow Pro",
      version: "2.0.0",
      exportedAt: new Date().toISOString(),
      organizationId,
      data: {
        organization,
        customers,
        invoices,
        invoiceItems,
        estimates,
        estimateItems,
        payments,
        expenses,
        employees,
        payrollRuns,
        salarySlips,
        medicineStocks,
        medicineSales,
        bankTransactions,
      },
    };

    await prisma.backupLog.create({
      data: {
        organizationId,
        type: "EXPORT",
        fileName: `invoiceflow-backup-${new Date()
          .toISOString()
          .replace(/[:.]/g, "-")}.json`,
        status: "SUCCESS",
        metadata: {
          customers: customers.length,
          invoices: invoices.length,
          expenses: expenses.length,
          employees: employees.length,
          medicineStocks: medicineStocks.length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      backup,
    });
  } catch (error) {
    console.error("BACKUP_EXPORT_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to export backup" },
      { status: 500 }
    );
  }
}