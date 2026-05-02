import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET() {
  try {
    const active = await requireActiveOrganization();
    const organizationId = active.organizationId;

    const [invoices, expenses, payments] = await Promise.all([
      prisma.invoice.findMany({
        where: { organizationId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.expense.findMany({
        where: { organizationId },
        orderBy: { date: "asc" },
      }),
      prisma.payment.findMany({
        where: { organizationId },
        orderBy: { paymentDate: "asc" },
      }),
    ]);

    const invoiceValue = invoices.reduce(
      (sum, item) => sum + Number(item.totalAmount || 0),
      0
    );

    const collected = payments.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );

    const outstanding = invoices.reduce(
      (sum, item) => sum + Number(item.balanceDue || 0),
      0
    );

    const expenseValue = expenses.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );

    const netProfit = collected - expenseValue;

    const monthlyMap = new Map<
      string,
      { month: string; revenue: number; collected: number; expenses: number; profit: number }
    >();

    function ensureMonth(key: string) {
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          month: key,
          revenue: 0,
          collected: 0,
          expenses: 0,
          profit: 0,
        });
      }

      return monthlyMap.get(key)!;
    }

    for (const invoice of invoices) {
      const date = invoice.issueDate || invoice.createdAt;
      const row = ensureMonth(monthKey(new Date(date)));
      row.revenue += Number(invoice.totalAmount || 0);
    }

    for (const payment of payments) {
      const row = ensureMonth(monthKey(new Date(payment.paymentDate)));
      row.collected += Number(payment.amount || 0);
    }

    const expenseCategoryMap = new Map<string, number>();

    for (const expense of expenses) {
      const row = ensureMonth(monthKey(new Date(expense.date)));
      row.expenses += Number(expense.amount || 0);

      const category = expense.category || "Uncategorized";
      expenseCategoryMap.set(
        category,
        (expenseCategoryMap.get(category) || 0) + Number(expense.amount || 0)
      );
    }

    const monthlyTrends = Array.from(monthlyMap.values())
      .map((row) => ({
        ...row,
        profit: row.collected - row.expenses,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const expenseBreakdown = Array.from(expenseCategoryMap.entries())
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort((a, b) => b.value - a.value);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          invoiceValue,
          collected,
          outstanding,
          expenseValue,
          netProfit,
        },
        monthlyTrends,
        expenseBreakdown,
      },
    });
  } catch (error) {
    console.error("BUSINESS_REPORT_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to load business reports" },
      { status: 500 }
    );
  }
}