import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

function sameDay(a: Date, b: Date) {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

export async function POST() {
  try {
    const active = await requireActiveOrganization();

    const [bankTransactions, payments] = await Promise.all([
      prisma.bankTransaction.findMany({
        where: {
          organizationId: active.organizationId,
          isReconciled: false,
        },
      }),
      prisma.payment.findMany({
        where: {
          organizationId: active.organizationId,
          bankReconciliations: {
            none: {},
          },
        },
      }),
    ]);

    let matchedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const bankTxn of bankTransactions) {
        const bankCredit = Number(bankTxn.credit || 0);

        if (bankCredit <= 0) continue;

        const matchedPayment = payments.find((payment) => {
          const amountMatch =
            Math.round(Number(payment.amount) * 100) ===
            Math.round(bankCredit * 100);

          const dateMatch = sameDay(payment.paymentDate, bankTxn.transactionDate);

          return amountMatch && dateMatch;
        });

        if (!matchedPayment) continue;

        await tx.bankReconciliation.create({
          data: {
            organizationId: active.organizationId,
            bankTransactionId: bankTxn.id,
            paymentId: matchedPayment.id,
            matchType: "AUTO",
            notes: "Auto matched by date and amount",
          },
        });

        await tx.bankTransaction.update({
          where: {
            id: bankTxn.id,
          },
          data: {
            isReconciled: true,
          },
        });

        matchedCount += 1;
      }
    });

    return NextResponse.json({
      success: true,
      matchedCount,
    });
  } catch (error) {
    console.error("AUTO_MATCH_BANK_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to auto match transactions" },
      { status: 500 }
    );
  }
}