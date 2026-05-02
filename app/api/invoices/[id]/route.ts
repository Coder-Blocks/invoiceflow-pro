import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

const lineItemSchema = z.object({
  description: z.string().trim().min(1),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
  taxRate: z.number().min(0),
  discountAmount: z.number().min(0),
});

const invoiceSchema = z.object({
  customerId: z.string().optional().nullable(),
  issueDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  lineItems: z.array(lineItemSchema).min(1),
});

function computeTotals(items: z.infer<typeof lineItemSchema>[]) {
  let subtotal = 0;
  let taxAmount = 0;
  let discountAmount = 0;

  const mappedItems = items.map((item) => {
    const lineSubtotal = item.quantity * item.unitPrice;
    const lineDiscount = item.discountAmount;
    const taxableBase = lineSubtotal - lineDiscount;
    const lineTax = (taxableBase * item.taxRate) / 100;
    const lineTotal = taxableBase + lineTax;

    subtotal += lineSubtotal;
    taxAmount += lineTax;
    discountAmount += lineDiscount;

    return {
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      discountAmount: lineDiscount,
      lineSubtotal,
      lineTax,
      lineTotal,
    };
  });

  const totalAmount = subtotal - discountAmount + taxAmount;

  return {
    subtotal,
    taxAmount,
    discountAmount,
    totalAmount,
    balanceDue: totalAmount,
    mappedItems,
  };
}

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Props) {
  try {
    const active = await requireActiveOrganization();
    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        organizationId: active.organizationId,
      },
      include: {
        customer: true,
        lineItems: true,
        payments: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: invoice });
  } catch (error) {
    console.error("GET_INVOICE_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: Props) {
  try {
    const active = await requireActiveOrganization();
    const { id } = await params;
    const body = await req.json();
    const parsed = invoiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid invoice data" },
        { status: 400 }
      );
    }

    const totals = computeTotals(parsed.data.lineItems);

    const invoice = await prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({
        where: {
          invoiceId: id,
        },
      });

      return await tx.invoice.update({
        where: {
          id,
        },
        data: {
          customerId: parsed.data.customerId || null,
          issueDate: parsed.data.issueDate ? new Date(parsed.data.issueDate) : null,
          dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
          notes: parsed.data.notes || null,
          terms: parsed.data.terms || null,
          status: parsed.data.status || undefined,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          discountAmount: totals.discountAmount,
          totalAmount: totals.totalAmount,
          balanceDue: totals.totalAmount,
          lineItems: {
            create: totals.mappedItems,
          },
        },
        include: {
          customer: true,
          lineItems: true,
        },
      });
    });

    return NextResponse.json({ success: true, data: invoice });
  } catch (error) {
    console.error("UPDATE_INVOICE_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}