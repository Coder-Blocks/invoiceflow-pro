import { NextResponse } from "next/server";
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
        account: true,
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
        id: line.id,
        date: line.journalEntry.voucherDate,
        voucherNumber: line.journalEntry.voucherNumber,
        reference: line.journalEntry.reference,
        narration: line.journalEntry.narration,
        description: line.description,
        debit,
        credit,
        balance: runningBalance,
      };
    });

    const totalDebit = rows.reduce((sum, row) => sum + row.debit, 0);
    const totalCredit = rows.reduce((sum, row) => sum + row.credit, 0);

    return NextResponse.json({
      success: true,
      data: {
        account,
        rows,
        totalDebit,
        totalCredit,
        closingBalance: runningBalance,
      },
    });
  } catch (error) {
    console.error("LEDGER_REPORT_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load ledger report" },
      { status: 500 }
    );
  }
}