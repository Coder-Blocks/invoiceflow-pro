import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: Request, { params }: Props) {
  try {
    const active = await requireActiveOrganization();
    const { id } = await params;

    const estimate = await prisma.estimate.findFirst({
      where: {
        id,
        organizationId: active.organizationId,
      },
      include: {
        lineItems: true,
        convertedTo: true,
      },
    });

    if (!estimate) {
      return NextResponse.json(
        { success: false, error: "Estimate not found" },
        { status: 404 }
      );
    }

    if (estimate.convertedTo) {
      return NextResponse.json({
        success: true,
        invoiceId: estimate.convertedTo.id,
        message: "Already converted",
      });
    }

    const invoiceNumber = `INV-${Date.now()}`;

    const invoice = await prisma.invoice.create({
      data: {
        organizationId: estimate.organizationId,
        customerId: estimate.customerId,
        invoiceNumber,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        status: "DRAFT",

        subtotal: estimate.subtotal,
        taxAmount: estimate.taxAmount,
        discountAmount: estimate.discountAmount,
        totalAmount: estimate.totalAmount,
        balanceDue: estimate.totalAmount,

        notes: estimate.notes,
        terms: estimate.terms,

        lineItems: {
          create: estimate.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            discountAmount: item.discountAmount,
            lineSubtotal: item.lineSubtotal,
            lineTax: item.lineTax,
            lineTotal: item.lineTotal,
          })),
        },
      } as any,
    });

    await prisma.estimate.update({
      where: {
        id: estimate.id,
      },
      data: {
        status: "CONVERTED",
        convertedTo: {
          connect: {
            id: invoice.id,
          },
        },
      } as any,
    });

    return NextResponse.json({
      success: true,
      invoiceId: invoice.id,
    });
  } catch (error: any) {
    console.error("ESTIMATE_CONVERT_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to convert estimate",
      },
      { status: 500 }
    );
  }
}