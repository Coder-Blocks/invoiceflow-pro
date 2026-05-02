import { NextResponse } from "next/server";
import  prisma  from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET() {
  try {
    const active = await requireActiveOrganization();
    const organizationId = active.organizationId;

    const [invoices, payments, expenses, stocks] = await Promise.all([
      prisma.invoice.findMany({
        where: { organizationId },
        orderBy: { createdAt: "asc" as const },
      }),
      prisma.payment.findMany({
        where: { organizationId },
        orderBy: { paymentDate: "asc" as const },
      }),
      prisma.expense.findMany({
        where: { organizationId },
        orderBy: { date: "asc" as const },
      }),
      prisma.medicineStock.findMany({
        where: { organizationId },
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

    const stockValue = stocks.reduce(
      (sum, item) =>
        sum + Number(item.quantity || 0) * Number(item.costPrice || 0),
      0
    );

    const lowStock = stocks
      .filter(
        (item) =>
          Number(item.quantity || 0) <= Number(item.lowStockThreshold || 0)
      )
      .slice(0, 5);

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
      const key = monthKey(new Date(invoice.issueDate || invoice.createdAt));
      ensureMonth(key).revenue += Number(invoice.totalAmount || 0);
    }

    for (const payment of payments) {
      const key = monthKey(new Date(payment.paymentDate));
      ensureMonth(key).collected += Number(payment.amount || 0);
    }

    for (const expense of expenses) {
      const key = monthKey(new Date(expense.date));
      ensureMonth(key).expenses += Number(expense.amount || 0);
    }

    const monthlyTrends = Array.from(monthlyMap.values())
      .map((item) => ({
        ...item,
        profit: item.collected - item.expenses,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const recentInvoices = invoices
      .slice(-5)
      .reverse()
      .map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: Number(invoice.totalAmount || 0),
        balanceDue: Number(invoice.balanceDue || 0),
        status: invoice.status,
      }));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          invoiceValue,
          collected,
          outstanding,
          expenseValue,
          netProfit,
          stockValue,
          invoiceCount: invoices.length,
          paymentCount: payments.length,
          lowStockCount: lowStock.length,
        },
        monthlyTrends,
        lowStock,
        recentInvoices,
      },
    });
  } catch (error) {
    console.error("DASHBOARD_SUMMARY_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to load dashboard" },
      { status: 500 }
    );
  }
}