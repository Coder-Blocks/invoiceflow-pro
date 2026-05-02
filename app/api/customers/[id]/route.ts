import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

const customerSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  companyName: z.string().trim().optional().or(z.literal("")),
  taxId: z.string().trim().optional().or(z.literal("")),
  billingAddress: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Props) {
  try {
    const active = await requireActiveOrganization();
    const { id } = await params;

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        organizationId: active.organizationId,
        isArchived: false,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: customer });
  } catch (error) {
    console.error("GET_CUSTOMER_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch customer" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: Props) {
  try {
    const active = await requireActiveOrganization();
    const { id } = await params;
    const body = await req.json();
    const parsed = customerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid customer data" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.updateMany({
      where: {
        id,
        organizationId: active.organizationId,
        isArchived: false,
      },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, data: customer });
  } catch (error) {
    console.error("UPDATE_CUSTOMER_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update customer" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: Props) {
  try {
    const active = await requireActiveOrganization();
    const { id } = await params;

    await prisma.customer.updateMany({
      where: {
        id,
        organizationId: active.organizationId,
      },
      data: {
        isArchived: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE_CUSTOMER_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to archive customer" },
      { status: 500 }
    );
  }
}