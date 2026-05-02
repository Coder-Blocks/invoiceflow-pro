import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

export async function GET() {
  try {
    const active = await requireActiveOrganization();

    const [transactions, payments, bankJournalLines] = await Promise.all([
      prisma.bankTransaction.findMany({
        where: {
          organizationId: active.organizationId,
        },
        include: {
          bankStatement: true,
          reconciliations: true,
        },
        orderBy: {
          transactionDate: "desc",
        },
      }),

      prisma.payment.findMany({
        where: {
          organizationId: active.organizationId,
        },
        include: {
          invoice: {
            include: {
              customer: true,
            },
          },
          bankReconciliations: true,
        },
        orderBy: {
          paymentDate: "desc",
        },
      }),

      prisma.journalLine.findMany({
        where: {
          organizationId: active.organizationId,
          account: {
            name: {
              in: ["Bank", "Cash"],
            },
          },
        },
        include: {
          account: true,
          journalEntry: true,
          bankReconciliations: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        payments,
        bankJournalLines,
      },
    });
  } catch (error) {
    console.error("GET_BANK_RECONCILIATION_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch reconciliation data" },
      { status: 500 }
    );
  }
}