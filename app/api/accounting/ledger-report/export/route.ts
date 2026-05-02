import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

export async function GET(req: Request) {
  try {
    const active = await requireActiveOrganization();
    const { searchParams } = new URL(req.url);

    const accountId = searchParams.get("accountId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: "Account is required" },
        { status: 400 }
      );
    }

    const account = await prisma.accountLedger.findFirst({
      where: {
        id: accountId,
        organizationId: active.organizationId,
        isArchived: false,
      },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    const dateFilter =
      from || to
        ? {
            voucherDate: {
              gte: from ? new Date(from) : undefined,
              lte: to ? new Date(`${to}T23:59:59`) : undefined,
            },
          }
        : {};

    const lines = await prisma.journalLine.findMany({
      where: {
        organizationId: active.organizationId,
        accountId,
        journalEntry: dateFilter,
      },
      include: {
        journalEntry: true,
      },
      orderBy: [
        {
          journalEntry: {
            voucherDate: "asc",
          },
        },
        {
          createdAt: "asc",
        },
      ],
    });

    let runningBalance = 0;

    const rows = lines.map((line) => {
      const debit = Number(line.debit || 0);
      const credit = Number(line.credit || 0);
      runningBalance += debit - credit;

      return {
        Date: new Date(line.journalEntry.voucherDate)
          .toISOString()
          .slice(0, 10),
        "Voucher No": line.journalEntry.voucherNumber,
        Reference: line.journalEntry.reference || "",
        Narration: line.journalEntry.narration || "",
        Description: line.description || "",
        Debit: debit,
        Credit: credit,
        Balance: runningBalance,
      };
    });

    const totalDebit = rows.reduce((sum, row) => sum + Number(row.Debit), 0);
    const totalCredit = rows.reduce((sum, row) => sum + Number(row.Credit), 0);

    const finalRows = [
      {
        Date: "",
        "Voucher No": `Ledger Statement: ${account.name}`,
        Reference: "",
        Narration: "",
        Description: "",
        Debit: "",
        Credit: "",
        Balance: "",
      },
      {
        Date: "",
        "Voucher No": `Period: ${from || "Start"} to ${to || "Today"}`,
        Reference: "",
        Narration: "",
        Description: "",
        Debit: "",
        Credit: "",
        Balance: "",
      },
      {
        Date: "",
        "Voucher No": "",
        Reference: "",
        Narration: "",
        Description: "",
        Debit: "",
        Credit: "",
        Balance: "",
      },
      ...rows,
      {
        Date: "",
        "Voucher No": "TOTAL",
        Reference: "",
        Narration: "",
        Description: "",
        Debit: totalDebit,
        Credit: totalCredit,
        Balance: runningBalance,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(finalRows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Ledger Statement");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const safeName = account.name.replace(/[^a-z0-9]/gi, "-").toLowerCase();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=ledger-${safeName}.xlsx`,
      },
    });
  } catch (error) {
    console.error("EXPORT_LEDGER_REPORT_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to export ledger report" },
      { status: 500 }
    );
  }
}