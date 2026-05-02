import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";
import { postPaymentJournal } from "@/lib/accounting/posting";

const paymentSchema = z.object({
  invoiceId: z.string(),
  amount: z.number().min(0.01),
  paymentDate: z.string(),
  method: z.string().trim().min(1),
  reference: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export async function GET() {
  try {
    const active = await requireActiveOrganization();

    const payments = await prisma.payment.findMany({
      where: {
        organizationId: active.organizationId,
      },
      include: {
        invoice: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: {
        paymentDate: "desc",
      },
    });

    return NextResponse.json({ success: true, data: payments });
  } catch (error) {
    console.error("GET_PAYMENTS_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const active = await requireActiveOrganization();
    const body = await req.json();
    const parsed = paymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid payment data" },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: parsed.data.invoiceId,
        organizationId: active.organizationId,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice not found" },
        { status: 404 }
      );
    }

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          organizationId: active.organizationId,
          invoiceId: parsed.data.invoiceId,
          amount: parsed.data.amount,
          paymentDate: new Date(parsed.data.paymentDate),
          method: parsed.data.method,
          reference: parsed.data.reference || null,
          notes: parsed.data.notes || null,
        },
      });

      const paidSoFar = await tx.payment.aggregate({
        where: {
          invoiceId: parsed.data.invoiceId,
        },
        _sum: {
          amount: true,
        },
      });

      const paid = Number(paidSoFar._sum.amount || 0);
      const total = Number(invoice.totalAmount);
      const balanceDue = Math.max(total - paid, 0);
      const status = balanceDue <= 0 ? "PAID" : "PARTIAL";

      await tx.invoice.update({
        where: {
          id: invoice.id,
        },
        data: {
          balanceDue,
          status,
        },
      });

      return created;
    });

    await postPaymentJournal({
  organizationId: active.organizationId,
  invoiceNumber: invoice.invoiceNumber,
  amount: Number(payment.amount),
  method: payment.method,
  voucherDate: payment.paymentDate,
});

    return NextResponse.json({ success: true, data: payment });
  } catch (error) {
    console.error("CREATE_PAYMENT_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create payment" },
      { status: 500 }
    );
  }
}