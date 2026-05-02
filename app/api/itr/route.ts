import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

export async function GET() {
  try {
    const active = await requireActiveOrganization();
    const organizationId = active.organizationId;

    const [invoices, expenses, payments] = await Promise.all([
      prisma.invoice.findMany({
        where: { organizationId },
      }),
      prisma.expense.findMany({
        where: { organizationId },
      }),
      prisma.payment.findMany({
        where: { organizationId },
      }),
    ]);

    const grossReceipts = invoices.reduce(
      (sum, inv) => sum + Number(inv.totalAmount || 0),
      0
    );

    const collections = payments.reduce(
      (sum, pay) => sum + Number(pay.amount || 0),
      0
    );

    const totalExpenses = expenses.reduce(
      (sum, exp) => sum + Number(exp.amount || 0),
      0
    );

    const netProfit = grossReceipts - totalExpenses;
    const taxableIncome = netProfit;

    let taxPayable = 0;

    if (taxableIncome <= 250000) {
      taxPayable = 0;
    } else if (taxableIncome <= 500000) {
      taxPayable = (taxableIncome - 250000) * 0.05;
    } else if (taxableIncome <= 1000000) {
      taxPayable = 12500 + (taxableIncome - 500000) * 0.2;
    } else {
      taxPayable = 112500 + (taxableIncome - 1000000) * 0.3;
    }

    return NextResponse.json({
      success: true,
      data: {
        grossReceipts,
        collections,
        totalExpenses,
        netProfit,
        taxableIncome,
        taxPayable,
      },
    });
  } catch (error) {
    console.error("ITR_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Failed to calculate ITR" },
      { status: 500 }
    );
  }
}