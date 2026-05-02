import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

export async function GET(req: Request) {
  try {
    const active = await requireActiveOrganization();
    const { searchParams } = new URL(req.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const dateFilter =
      from || to
        ? {
            voucherDate: {
              gte: from ? new Date(from) : undefined,
              lte: to ? new Date(`${to}T23:59:59`) : undefined,
            },
          }
        : {};

    const accounts = await prisma.accountLedger.findMany({
      where: {
        organizationId: active.organizationId,
        isArchived: false,
        type: {
          in: ["INCOME", "EXPENSE"],
        },
      },
      include: {
        journalLines: {
          where: {
            journalEntry: dateFilter,
          },
        },
      },
      orderBy: [{ type: "asc" }, { code: "asc" }],
    });

    const incomeRows = accounts
      .filter((acc) => acc.type === "INCOME")
      .map((acc) => {
        const debit = acc.journalLines.reduce(
          (sum, line) => sum + Number(line.debit),
          0
        );
        const credit = acc.journalLines.reduce(
          (sum, line) => sum + Number(line.credit),
          0
        );

        return {
          accountId: acc.id,
          code: acc.code,
          name: acc.name,
          amount: credit - debit,
        };
      });

    const expenseRows = accounts
      .filter((acc) => acc.type === "EXPENSE")
      .map((acc) => {
        const debit = acc.journalLines.reduce(
          (sum, line) => sum + Number(line.debit),
          0
        );
        const credit = acc.journalLines.reduce(
          (sum, line) => sum + Number(line.credit),
          0
        );

        return {
          accountId: acc.id,
          code: acc.code,
          name: acc.name,
          amount: debit - credit,
        };
      });

    const totalIncome = incomeRows.reduce((sum, row) => sum + row.amount, 0);
    const totalExpenses = expenseRows.reduce((sum, row) => sum + row.amount, 0);
    const netProfit = totalIncome - totalExpenses;

    return NextResponse.json({
      success: true,
      data: {
        incomeRows,
        expenseRows,
        totalIncome,
        totalExpenses,
        netProfit,
      },
    });
  } catch (error) {
    console.error("PROFIT_LOSS_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate Profit & Loss report" },
      { status: 500 }
    );
  }
}