import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

type TrialBalanceExportRow = {
  Code: string;
  Account: string;
  Type: string;
  "Total Debit": number;
  "Total Credit": number;
  "Closing Debit": number;
  "Closing Credit": number;
};

export async function GET() {
  try {
    const active = await requireActiveOrganization();

    const accounts = await prisma.accountLedger.findMany({
      where: {
        organizationId: active.organizationId,
        isArchived: false,
      },
      include: {
        journalLines: true,
      },
      orderBy: [{ type: "asc" }, { code: "asc" }],
    });

    const rows: TrialBalanceExportRow[] = accounts.map((account) => {
      const debit = account.journalLines.reduce(
        (sum, line) => sum + Number(line.debit),
        0
      );

      const credit = account.journalLines.reduce(
        (sum, line) => sum + Number(line.credit),
        0
      );

      const net = debit - credit;

      return {
        Code: account.code || "",
        Account: account.name,
        Type: String(account.type),
        "Total Debit": debit,
        "Total Credit": credit,
        "Closing Debit": net > 0 ? net : 0,
        "Closing Credit": net < 0 ? Math.abs(net) : 0,
      };
    });

    const totalClosingDebit = rows.reduce(
      (sum, row) => sum + Number(row["Closing Debit"]),
      0
    );

    const totalClosingCredit = rows.reduce(
      (sum, row) => sum + Number(row["Closing Credit"]),
      0
    );

    rows.push({
      Code: "",
      Account: "TOTAL",
      Type: "",
      "Total Debit": 0,
      "Total Credit": 0,
      "Closing Debit": totalClosingDebit,
      "Closing Credit": totalClosingCredit,
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Trial Balance");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=trial-balance.xlsx",
      },
    });
  } catch (error) {
    console.error("EXPORT_TRIAL_BALANCE_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to export trial balance" },
      { status: 500 }
    );
  }
}