import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

export async function POST(req: Request) {
  try {
    const active = await requireActiveOrganization();
    const body = await req.json();

    const bankTransactionId = String(body.bankTransactionId || "");
    const journalLineId = body.journalLineId ? String(body.journalLineId) : null;
    const paymentId = body.paymentId ? String(body.paymentId) : null;
    const notes = body.notes ? String(body.notes) : null;

    if (!bankTransactionId || (!journalLineId && !paymentId)) {
      return NextResponse.json(
        { success: false, error: "Transaction and match item required" },
        { status: 400 }
      );
    }

    const bankTransaction = await prisma.bankTransaction.findFirst({
      where: {
        id: bankTransactionId,
        organizationId: active.organizationId,
      },
    });

    if (!bankTransaction) {
      return NextResponse.json(
        { success: false, error: "Bank transaction not found" },
        { status: 404 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const reconciliation = await tx.bankReconciliation.create({
        data: {
          organizationId: active.organizationId,
          bankTransactionId,
          journalLineId,
          paymentId,
          matchType: "MANUAL",
          notes,
        },
      });

      await tx.bankTransaction.update({
        where: {
          id: bankTransactionId,
        },
        data: {
          isReconciled: true,
        },
      });

      return reconciliation;
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("MANUAL_RECONCILE_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reconcile transaction" },
      { status: 500 }
    );
  }
}