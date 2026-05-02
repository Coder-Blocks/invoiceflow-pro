import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

const accountSchema = z.object({
  name: z.string().trim().min(2),
  code: z.string().trim().optional().or(z.literal("")),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]),
  parentId: z.string().optional().nullable(),
});

type Props = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: Request, { params }: Props) {
  try {
    const active = await requireActiveOrganization();
    const { id } = await params;
    const body = await req.json();
    const parsed = accountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid account data" },
        { status: 400 }
      );
    }

    const existing = await prisma.accountLedger.findFirst({
      where: {
        id,
        organizationId: active.organizationId,
        isArchived: false,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    const account = await prisma.accountLedger.update({
      where: {
        id,
      },
      data: {
        name: parsed.data.name,
        code: parsed.data.code || null,
        type: parsed.data.type,
        parentId: parsed.data.parentId || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: account,
    });
  } catch (error) {
    console.error("UPDATE_COA_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update account" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: Props) {
  try {
    const active = await requireActiveOrganization();
    const { id } = await params;

    const account = await prisma.accountLedger.findFirst({
      where: {
        id,
        organizationId: active.organizationId,
      },
      include: {
        children: true,
      },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    if (account.isSystem) {
      return NextResponse.json(
        { success: false, error: "System accounts cannot be deleted" },
        { status: 400 }
      );
    }

    if (account.children.length > 0) {
      return NextResponse.json(
        { success: false, error: "Account has child accounts" },
        { status: 400 }
      );
    }

    await prisma.accountLedger.update({
      where: {
        id,
      },
      data: {
        isArchived: true,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE_COA_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to archive account" },
      { status: 500 }
    );
  }
}