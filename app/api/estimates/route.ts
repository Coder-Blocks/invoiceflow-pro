import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";
import { generateSequence } from "@/lib/utils";

const lineItemSchema = z.object({
  description: z.string().trim().min(1),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
  taxRate: z.number().min(0),
  discountAmount: z.number().min(0),
});

const estimateSchema = z.object({
  customerId: z.string().optional().nullable(),
  issueDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
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
    mappedItems,
  };
}

export async function GET() {
  try {
    const active = await requireActiveOrganization();

    const estimates = await prisma.estimate.findMany({
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

    return NextResponse.json({ success: true, data: estimates });
  } catch (error) {
    console.error("GET_ESTIMATES_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch estimates" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const active = await requireActiveOrganization();
    const body = await req.json();
    const parsed = estimateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid estimate data" },
        { status: 400 }
      );
    }

    const count = await prisma.estimate.count({
      where: {
        organizationId: active.organizationId,
      },
    });

    const estimateNumber = generateSequence(
      active.organization.estimatePrefix || "EST",
      count
    );

    const totals = computeTotals(parsed.data.lineItems);

    const estimate = await prisma.estimate.create({
      data: {
        organizationId: active.organizationId,
        customerId: parsed.data.customerId || null,
        estimateNumber,
        issueDate: parsed.data.issueDate ? new Date(parsed.data.issueDate) : null,
        expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
        notes: parsed.data.notes || null,
        terms: parsed.data.terms || null,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
        lineItems: {
          create: totals.mappedItems,
        },
      },
      include: {
        customer: true,
        lineItems: true,
      },
    });

    return NextResponse.json({ success: true, data: estimate });
  } catch (error) {
    console.error("CREATE_ESTIMATE_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create estimate" },
      { status: 500 }
    );
  }
}