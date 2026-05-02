import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const backup = body.backup;

    if (!backup || backup.app !== "InvoiceFlow Pro" || !backup.data) {
      return NextResponse.json(
        { success: false, error: "Invalid InvoiceFlow Pro backup file" },
        { status: 400 }
      );
    }

    const data = backup.data;

    return NextResponse.json({
      success: true,
      preview: {
        app: backup.app,
        version: backup.version || "Unknown",
        exportedAt: backup.exportedAt || null,
        counts: {
          customers: data.customers?.length || 0,
          invoices: data.invoices?.length || 0,
          invoiceItems: data.invoiceItems?.length || 0,
          estimates: data.estimates?.length || 0,
          payments: data.payments?.length || 0,
          expenses: data.expenses?.length || 0,
          employees: data.employees?.length || 0,
          payrollRuns: data.payrollRuns?.length || 0,
          salarySlips: data.salarySlips?.length || 0,
          purchaseBills: data.purchaseBills?.length || 0,
          medicineStocks: data.medicineStocks?.length || 0,
          medicineSales: data.medicineSales?.length || 0,
          bankAccounts: data.bankAccounts?.length || 0,
          bankTransactions: data.bankTransactions?.length || 0,
          ledgers: data.ledgers?.length || 0,
          journalEntries: data.journalEntries?.length || 0,
        },
      },
    });
  } catch (error) {
    console.error("BACKUP_PREVIEW_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to preview backup" },
      { status: 500 }
    );
  }
}