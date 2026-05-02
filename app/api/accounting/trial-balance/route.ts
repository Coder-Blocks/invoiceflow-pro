import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

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
      orderBy: [
        { type: "asc" },
        { code: "asc" },
      ],
    });

    const rows = accounts.map((account) => {
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
        accountId: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        debit,
        credit,
        closingDebit: net > 0 ? net : 0,
        closingCredit: net < 0 ? Math.abs(net) : 0,
      };
    });

    const totalDebit = rows.reduce((sum, row) => sum + row.closingDebit, 0);
    const totalCredit = rows.reduce((sum, row) => sum + row.closingCredit, 0);

    return NextResponse.json({
      success: true,
      data: {
        rows,
        totalDebit,
        totalCredit,
        balanced: Math.round(totalDebit * 100) === Math.round(totalCredit * 100),
      },
    });
  } catch (error) {
    console.error("TRIAL_BALANCE_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate trial balance" },
      { status: 500 }
    );
  }
}