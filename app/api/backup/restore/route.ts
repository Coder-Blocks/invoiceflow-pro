import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

// =======================
// SAFE HELPERS
// =======================

const num = (v: any) => Number(v || 0);
const str = (v: any) => (v ? String(v) : null);
const date = (v: any) => (v ? new Date(v) : new Date());

// =======================
// API
// =======================

export async function POST(req: Request) {
  try {
    const active = await requireActiveOrganization();
    const orgId = active.organizationId;

    const body = await req.json();
    const backup = body.backup;

    if (!body.confirmRestore) {
      return NextResponse.json(
        { success: false, error: "Confirmation required" },
        { status: 400 }
      );
    }

    if (!backup || backup.app !== "InvoiceFlow Pro") {
      return NextResponse.json(
        { success: false, error: "Invalid backup file" },
        { status: 400 }
      );
    }

    const data = backup.data;

    await prisma.$transaction(async (tx) => {
      // =======================
      // DELETE OLD DATA
      // =======================

      await tx.bankTransaction.deleteMany({ where: { organizationId: orgId } });

      await tx.medicineSale.deleteMany({ where: { organizationId: orgId } });
      await tx.medicineStock.deleteMany({ where: { organizationId: orgId } });

      await tx.salarySlip.deleteMany({ where: { organizationId: orgId } });
      await tx.payrollRun.deleteMany({ where: { organizationId: orgId } });
      await tx.employee.deleteMany({ where: { organizationId: orgId } });

      await tx.payment.deleteMany({ where: { organizationId: orgId } });

      await tx.estimateItem.deleteMany({
        where: { estimate: { organizationId: orgId } },
      });
      await tx.estimate.deleteMany({ where: { organizationId: orgId } });

      await tx.invoiceItem.deleteMany({
        where: { invoice: { organizationId: orgId } },
      });
      await tx.invoice.deleteMany({ where: { organizationId: orgId } });

      await tx.expense.deleteMany({ where: { organizationId: orgId } });
      await tx.customer.deleteMany({ where: { organizationId: orgId } });

      // =======================
      // RESTORE DATA (SAFE)
      // =======================

      // CUSTOMERS
      if (data.customers?.length) {
        await tx.customer.createMany({
          data: data.customers.map((c: any) => ({
            id: c.id,
            organizationId: orgId,
            name: c.name || "Customer",
            email: str(c.email),
            phone: str(c.phone),
            address: str(c.address),
            gstNumber: str(c.gstNumber),
            createdAt: date(c.createdAt),
            updatedAt: new Date(),
          })),
          skipDuplicates: true,
        });
      }

      // INVOICES
      if (data.invoices?.length) {
        await tx.invoice.createMany({
          data: data.invoices.map((i: any) => ({
            id: i.id,
            organizationId: orgId,
            customerId: str(i.customerId),
            invoiceNumber: i.invoiceNumber || "INV",
            totalAmount: num(i.totalAmount),
            balanceDue: num(i.balanceDue),
            status: i.status || "PENDING",
            issueDate: i.issueDate ? new Date(i.issueDate) : new Date(),
            createdAt: date(i.createdAt),
            updatedAt: new Date(),
          })),
          skipDuplicates: true,
        });
      }

      // INVOICE ITEMS
      if (data.invoiceItems?.length) {
        await tx.invoiceItem.createMany({
          data: data.invoiceItems.map((it: any) => ({
            id: it.id,
            invoiceId: it.invoiceId,
            description: it.description || "Item",
            quantity: num(it.quantity),
            unitPrice: num(it.unitPrice),
          })),
          skipDuplicates: true,
        });
      }

      // PAYMENTS
      if (data.payments?.length) {
        await tx.payment.createMany({
          data: data.payments.map((p: any) => ({
            id: p.id,
            organizationId: orgId,
            amount: num(p.amount),
            method: p.method || "CASH",
            paymentDate: p.paymentDate ? new Date(p.paymentDate) : new Date(),
          })),
          skipDuplicates: true,
        });
      }

      // EXPENSES
      if (data.expenses?.length) {
        await tx.expense.createMany({
          data: data.expenses.map((e: any) => ({
            id: e.id,
            organizationId: orgId,
            title: e.title || "Expense",
            amount: num(e.amount),
            category: e.category || "General",
            date: e.date ? new Date(e.date) : new Date(),
          })),
          skipDuplicates: true,
        });
      }

      // EMPLOYEES
      if (data.employees?.length) {
        await tx.employee.createMany({
          data: data.employees.map((e: any) => ({
            id: e.id,
            organizationId: orgId,
            name: e.name || "Employee",
            email: str(e.email),
            salary: num(e.salary),
          })),
          skipDuplicates: true,
        });
      }

      // MEDICINE STOCK
      if (data.medicineStocks?.length) {
        await tx.medicineStock.createMany({
          data: data.medicineStocks.map((m: any) => ({
            id: m.id,
            organizationId: orgId,
            medicineName: m.medicineName,
            quantity: num(m.quantity),
            costPrice: num(m.costPrice),
            sellingPrice: num(m.sellingPrice),
          })),
          skipDuplicates: true,
        });
      }

      // MEDICINE SALES
      if (data.medicineSales?.length) {
        await tx.medicineSale.createMany({
          data: data.medicineSales.map((s: any) => ({
            id: s.id,
            organizationId: orgId,
            stockId: s.stockId,
            medicineName: s.medicineName,
            quantitySold: num(s.quantitySold),
            saleAmount: num(s.saleAmount),
            costAmount: num(s.costAmount),
            soldAt: s.soldAt ? new Date(s.soldAt) : new Date(),
          })),
          skipDuplicates: true,
        });
      }

      // =======================
      // LOG
      // =======================

      await tx.backupLog.create({
        data: {
          organizationId: orgId,
          type: "RESTORE",
          fileName: body.fileName || "backup.json",
          status: "SUCCESS",
          metadata: {
            restoredAt: new Date().toISOString(),
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Backup restored successfully",
    });
  } catch (error) {
    console.error("RESTORE_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Restore failed" },
      { status: 500 }
    );
  }
}