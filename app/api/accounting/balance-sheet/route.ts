import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

export async function GET(req: Request) {
  try {
    const active = await requireActiveOrganization();
    const { searchParams } = new URL(req.url);

    const asOf = searchParams.get("asOf");

    const dateFilter = asOf
      ? {
          voucherDate: {
            lte: new Date(`${asOf}T23:59:59`),
          },
        }
      : {};

    const accounts = await prisma.accountLedger.findMany({
      where: {
        organizationId: active.organizationId,
        isArchived: false,
        type: {
          in: ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"],
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

    const assetRows = accounts
      .filter((acc) => acc.type === "ASSET")
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

    const liabilityRows = accounts
      .filter((acc) => acc.type === "LIABILITY")
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

    const equityRows = accounts
      .filter((acc) => acc.type === "EQUITY")
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

    const income = accounts
      .filter((acc) => acc.type === "INCOME")
      .reduce((sum, acc) => {
        const debit = acc.journalLines.reduce(
          (s, line) => s + Number(line.debit),
          0
        );
        const credit = acc.journalLines.reduce(
          (s, line) => s + Number(line.credit),
          0
        );
        return sum + (credit - debit);
      }, 0);

    const expenses = accounts
      .filter((acc) => acc.type === "EXPENSE")
      .reduce((sum, acc) => {
        const debit = acc.journalLines.reduce(
          (s, line) => s + Number(line.debit),
          0
        );
        const credit = acc.journalLines.reduce(
          (s, line) => s + Number(line.credit),
          0
        );
        return sum + (debit - credit);
      }, 0);

    const retainedEarnings = income - expenses;

    const totalAssets = assetRows.reduce((sum, row) => sum + row.amount, 0);
    const totalLiabilities = liabilityRows.reduce(
      (sum, row) => sum + row.amount,
      0
    );
    const totalEquity =
      equityRows.reduce((sum, row) => sum + row.amount, 0) + retainedEarnings;

    return NextResponse.json({
      success: true,
      data: {
        assetRows,
        liabilityRows,
        equityRows,
        retainedEarnings,
        totalAssets,
        totalLiabilities,
        totalEquity,
        totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
        balanced:
          Math.round(totalAssets * 100) ===
          Math.round((totalLiabilities + totalEquity) * 100),
      },
    });
  } catch (error) {
    console.error("BALANCE_SHEET_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate Balance Sheet" },
      { status: 500 }
    );
  }
}