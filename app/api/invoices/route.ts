import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";
import { generateSequence } from "@/lib/utils";
import { postInvoiceJournal } from "@/lib/accounting/posting";

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

export async function GET() {
  try {
    const active = await requireActiveOrganization();

    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId: active.organizationId,
      },
      include: {
        customer: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ success: true, data: invoices });
  } catch (error) {
    console.error("GET_INVOICES_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const active = await requireActiveOrganization();
    const body = await req.json();
    const parsed = invoiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid invoice data" },
        { status: 400 }
      );
    }

    const count = await prisma.invoice.count({
      where: {
        organizationId: active.organizationId,
      },
    });

    const invoiceNumber = generateSequence(
      active.organization.invoicePrefix || "INV",
      count
    );

    const totals = computeTotals(parsed.data.lineItems);

    const invoice = await prisma.invoice.create({
      data: {
        organizationId: active.organizationId,
        customerId: parsed.data.customerId || null,
        invoiceNumber,
        issueDate: parsed.data.issueDate ? new Date(parsed.data.issueDate) : null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        notes: parsed.data.notes || null,
        terms: parsed.data.terms || null,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
        balanceDue: totals.balanceDue,
        lineItems: {
          create: totals.mappedItems,
        },
      },
      include: {
        customer: true,
        lineItems: true,
      },
    });

    await postInvoiceJournal({
  organizationId: active.organizationId,
  invoiceNumber: invoice.invoiceNumber,
  totalAmount: Number(invoice.totalAmount),
  voucherDate: invoice.issueDate,
});

    return NextResponse.json({ success: true, data: invoice });
  } catch (error) {
    console.error("CREATE_INVOICE_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}