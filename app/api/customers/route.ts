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

export async function GET() {
  try {
    const active = await requireActiveOrganization();

    const customers = await prisma.customer.findMany({
      where: {
        organizationId: active.organizationId,
        isArchived: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ success: true, data: customers });
  } catch (error) {
    console.error("GET_CUSTOMERS_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const active = await requireActiveOrganization();
    const body = await req.json();
    const parsed = customerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid customer data" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        organizationId: active.organizationId,
        ...parsed.data,
      },
    });

    return NextResponse.json({ success: true, data: customer });
  } catch (error) {
    console.error("CREATE_CUSTOMER_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create customer" },
      { status: 500 }
    );
  }
}