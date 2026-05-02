import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
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

    const makeRows = (type: string, normal: "DEBIT" | "CREDIT") =>
      accounts
        .filter((acc) => acc.type === type)
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
            Section: type,
            Code: acc.code || "",
            Account: acc.name,
            Amount: normal === "DEBIT" ? debit - credit : credit - debit,
          };
        });

    const assetRows = makeRows("ASSET", "DEBIT");
    const liabilityRows = makeRows("LIABILITY", "CREDIT");
    const equityRows = makeRows("EQUITY", "CREDIT");

    const incomeRows = makeRows("INCOME", "CREDIT");
    const expenseRows = makeRows("EXPENSE", "DEBIT");

    const retainedEarnings =
      incomeRows.reduce((sum, row) => sum + row.Amount, 0) -
      expenseRows.reduce((sum, row) => sum + row.Amount, 0);

    const totalAssets = assetRows.reduce((sum, row) => sum + row.Amount, 0);
    const totalLiabilities = liabilityRows.reduce(
      (sum, row) => sum + row.Amount,
      0
    );
    const totalEquity =
      equityRows.reduce((sum, row) => sum + row.Amount, 0) + retainedEarnings;

    const rows = [
      {
        Section: "Balance Sheet",
        Code: "",
        Account: `As of ${asOf || "Today"}`,
        Amount: "",
      },
      { Section: "", Code: "", Account: "", Amount: "" },

      ...assetRows,
      {
        Section: "ASSET",
        Code: "",
        Account: "Total Assets",
        Amount: totalAssets,
      },

      { Section: "", Code: "", Account: "", Amount: "" },

      ...liabilityRows,
      {
        Section: "LIABILITY",
        Code: "",
        Account: "Total Liabilities",
        Amount: totalLiabilities,
      },

      { Section: "", Code: "", Account: "", Amount: "" },

      ...equityRows,
      {
        Section: "EQUITY",
        Code: "",
        Account: "Retained Earnings",
        Amount: retainedEarnings,
      },
      {
        Section: "EQUITY",
        Code: "",
        Account: "Total Equity",
        Amount: totalEquity,
      },

      { Section: "", Code: "", Account: "", Amount: "" },

      {
        Section: "SUMMARY",
        Code: "",
        Account: "Liabilities + Equity",
        Amount: totalLiabilities + totalEquity,
      },
      {
        Section: "SUMMARY",
        Code: "",
        Account: "Balance Difference",
        Amount: totalAssets - (totalLiabilities + totalEquity),
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Balance Sheet");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=balance-sheet.xlsx",
      },
    });
  } catch (error) {
    console.error("EXPORT_BALANCE_SHEET_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to export Balance Sheet" },
      { status: 500 }
    );
  }
}