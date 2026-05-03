import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

function money(value: number) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

export async function POST(req: Request) {
  try {
    const active = await requireActiveOrganization();
    const organizationId = active.organizationId;

    const body = await req.json();
    const question = String(body.question || "").toLowerCase().trim();

    if (!question) {
      return NextResponse.json(
        { success: false, error: "Question is required" },
        { status: 400 }
      );
    }

    const [invoices, payments, expenses, sales, stocks, salarySlips] =
      await Promise.all([
        prisma.invoice.findMany({ where: { organizationId } }),
        prisma.payment.findMany({ where: { organizationId } }),
        prisma.expense.findMany({ where: { organizationId } }),
        prisma.medicineSale.findMany({ where: { organizationId } }),
        prisma.medicineStock.findMany({ where: { organizationId } }),
        prisma.salarySlip.findMany({ where: { organizationId } }),
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

    const payrollCost = salarySlips.reduce(
      (sum, item) => sum + Number(item.netSalary || 0),
      0
    );

    const salesValue = sales.reduce(
      (sum, item) => sum + Number(item.saleAmount || 0),
      0
    );

    const salesCost = sales.reduce(
      (sum, item) => sum + Number(item.costAmount || 0),
      0
    );

    const salesProfit = salesValue - salesCost;
    const netProfit = collected + salesProfit - expenseValue - payrollCost;

    const stockValue = stocks.reduce(
      (sum, item) =>
        sum + Number(item.quantity || 0) * Number(item.costPrice || 0),
      0
    );

    const lowStock = stocks.filter(
      (item) =>
        Number(item.quantity || 0) <= Number(item.lowStockThreshold || 10)
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const next30 = new Date(today);
    next30.setDate(today.getDate() + 30);

    const expiringSoon = stocks.filter((item) => {
      const expiry = new Date(item.expiryDate);
      expiry.setHours(0, 0, 0, 0);
      return expiry >= today && expiry <= next30;
    });

    let answer = "";

    if (question.includes("profit") || question.includes("లాభం")) {
      answer = `Your estimated net profit is ${money(netProfit)}.

Breakdown:
* Collected: ${money(collected)}
* Medicine sales profit: ${money(salesProfit)}
* Expenses: ${money(expenseValue)}
* Payroll cost: ${money(payrollCost)}

${
  netProfit >= 0
    ? "Good. Your business is currently profitable."
    : "Warning. Your business is currently running in loss."
}`;
    } else if (
      question.includes("pending") ||
      question.includes("outstanding") ||
      question.includes("due")
    ) {
      answer = `Your pending/outstanding amount is ${money(outstanding)}.

${
  outstanding > invoiceValue * 0.3
    ? "Risk: Outstanding is high. Follow up customers immediately."
    : "Outstanding level looks manageable."
}`;
    } else if (
      question.includes("low stock") ||
      question.includes("show low stock") ||
      question.includes("stock low")
    ) {
      if (lowStock.length === 0) {
        answer = "No low stock items found.";
      } else {
        answer =
          "Low stock items:\n\n" +
          lowStock
            .slice(0, 15)
            .map(
              (item) =>
                `• ${item.medicineName} - Qty: ${item.quantity} ${item.unitType || "UNIT"}`
            )
            .join("\n");
      }
    } else if (
      question.includes("expiry") ||
      question.includes("expire") ||
      question.includes("expiring")
    ) {
      if (expiringSoon.length === 0) {
        answer = "No medicines are expiring in the next 30 days.";
      } else {
        answer =
          "Medicines expiring in next 30 days:\n\n" +
          expiringSoon
            .slice(0, 15)
            .map(
              (item) =>
                `• ${item.medicineName} - ${new Date(item.expiryDate)
                  .toISOString()
                  .slice(0, 10)}`
            )
            .join("\n");
      }
    } else if (
      question.includes("revenue") ||
      question.includes("income") ||
      question.includes("sales")
    ) {
      answer = `Your total invoice value is ${money(invoiceValue)}.

Collected amount: ${money(collected)}
Medicine sales value: ${money(salesValue)}

Collection health: ${
        invoiceValue > 0 ? ((collected / invoiceValue) * 100).toFixed(1) : "0"
      }%.`;
    } else if (
      question.includes("expense") ||
      question.includes("cost") ||
      question.includes("spending")
    ) {
      answer = `Your total expenses are ${money(expenseValue)}.

${
  expenseValue > collected * 0.5
    ? "Suggestion: Expenses are high compared to collection. Review unnecessary spending."
    : "Expense level looks controlled."
}`;
    } else if (question.includes("stock")) {
      answer = `Your current stock cost value is ${money(stockValue)}.

Low stock items: ${lowStock.length}
Expiring soon items: ${expiringSoon.length}

${
  lowStock.length > 0
    ? "Suggestion: Reorder low stock medicines soon."
    : "Stock level looks okay."
}`;
    } else if (
      question.includes("payroll") ||
      question.includes("salary") ||
      question.includes("employee")
    ) {
      answer = `Your payroll cost is ${money(payrollCost)}.

Generated salary slips: ${salarySlips.length}.`;
    } else if (
      question.includes("summary") ||
      question.includes("business") ||
      question.includes("report")
    ) {
      answer = `Business summary:

* Invoice value: ${money(invoiceValue)}
* Collected: ${money(collected)}
* Outstanding: ${money(outstanding)}
* Expenses: ${money(expenseValue)}
* Payroll: ${money(payrollCost)}
* Medicine sales value: ${money(salesValue)}
* Medicine sales profit: ${money(salesProfit)}
* Net profit: ${money(netProfit)}
* Stock value: ${money(stockValue)}
* Low stock items: ${lowStock.length}
* Expiring soon items: ${expiringSoon.length}`;
    } else {
      answer = `I can analyze your business data.

Try asking:
* What is my profit?
* Show pending amount
* Show low stock
* Which medicines are expiring?
* What is my payroll cost?
* Give me business summary`;
    }

    return NextResponse.json({
      success: true,
      answer,
    });
  } catch (error) {
    console.error("AI_CHAT_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "AI chat failed" },
      { status: 500 }
    );
  }
}