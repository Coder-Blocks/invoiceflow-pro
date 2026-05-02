import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
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
          Section: "Income",
          Code: acc.code || "",
          Account: acc.name,
          Amount: credit - debit,
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
          Section: "Expenses",
          Code: acc.code || "",
          Account: acc.name,
          Amount: debit - credit,
        };
      });

    const totalIncome = incomeRows.reduce((sum, row) => sum + row.Amount, 0);
    const totalExpenses = expenseRows.reduce((sum, row) => sum + row.Amount, 0);
    const netProfit = totalIncome - totalExpenses;

    const rows = [
      {
        Section: "Profit & Loss Report",
        Code: "",
        Account: `${from || "Start"} to ${to || "Today"}`,
        Amount: "",
      },
      { Section: "", Code: "", Account: "", Amount: "" },
      ...incomeRows,
      {
        Section: "Income",
        Code: "",
        Account: "Total Income",
        Amount: totalIncome,
      },
      { Section: "", Code: "", Account: "", Amount: "" },
      ...expenseRows,
      {
        Section: "Expenses",
        Code: "",
        Account: "Total Expenses",
        Amount: totalExpenses,
      },
      { Section: "", Code: "", Account: "", Amount: "" },
      {
        Section: "Result",
        Code: "",
        Account: netProfit >= 0 ? "Net Profit" : "Net Loss",
        Amount: netProfit,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Profit and Loss");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=profit-and-loss.xlsx",
      },
    });
  } catch (error) {
    console.error("EXPORT_PROFIT_LOSS_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to export Profit & Loss" },
      { status: 500 }
    );
  }
}