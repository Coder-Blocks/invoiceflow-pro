import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

export async function GET() {
  try {
    const active = await requireActiveOrganization();

    const [invoices, expenses, payments] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          organizationId: active.organizationId,
        },
        select: {
          totalAmount: true,
        },
      }),
      prisma.expense.findMany({
        where: {
          organizationId: active.organizationId,
        },
        select: {
          amount: true,
        },
      }),
      prisma.payment.findMany({
        where: {
          organizationId: active.organizationId,
        },
        select: {
          amount: true,
        },
      }),
    ]);

    const grossReceipts = invoices.reduce((sum, item) => sum + Number(item.totalAmount), 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalCollections = payments.reduce((sum, item) => sum + Number(item.amount), 0);
    const estimatedProfit = grossReceipts - totalExpenses;

    return NextResponse.json({
      success: true,
      data: {
        grossReceipts,
        totalExpenses,
        totalCollections,
        estimatedProfit,
      },
    });
  } catch (error) {
    console.error("ITR_SUMMARY_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to prepare ITR summary" },
      { status: 500 }
    );
  }
}