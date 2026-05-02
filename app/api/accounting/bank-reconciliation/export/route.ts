import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

export async function GET() {
  try {
    const active = await requireActiveOrganization();

    const transactions = await prisma.bankTransaction.findMany({
      where: {
        organizationId: active.organizationId,
      },
      include: {
        bankStatement: true,
        reconciliations: true,
      },
      orderBy: {
        transactionDate: "asc",
      },
    });

    const rows = transactions.map((txn) => ({
      Date: new Date(txn.transactionDate).toISOString().slice(0, 10),
      Bank: txn.bankStatement.bankName,
      Account: txn.bankStatement.accountNumber || "",
      Description: txn.description,
      Reference: txn.reference || "",
      Debit: Number(txn.debit || 0),
      Credit: Number(txn.credit || 0),
      Balance: txn.balance ? Number(txn.balance) : "",
      Status: txn.isReconciled ? "Reconciled" : "Unmatched",
      MatchType: txn.reconciliations[0]?.matchType || "",
      Notes: txn.reconciliations[0]?.notes || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Bank Reconciliation");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          "attachment; filename=bank-reconciliation.xlsx",
      },
    });
  } catch (error) {
    console.error("EXPORT_BANK_RECONCILIATION_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to export reconciliation" },
      { status: 500 }
    );
  }
}