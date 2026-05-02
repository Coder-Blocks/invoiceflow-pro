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

export async function GET() {
  try {
    const active = await requireActiveOrganization();

    const accounts = await prisma.accountLedger.findMany({
      where: {
        organizationId: active.organizationId,
        isArchived: false,
      },
      include: {
        parent: true,
        children: {
          where: {
            isArchived: false,
          },
          orderBy: {
            code: "asc",
          },
        },
      },
      orderBy: [
        {
          type: "asc",
        },
        {
          code: "asc",
        },
        {
          name: "asc",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    console.error("GET_COA_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch chart of accounts" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const active = await requireActiveOrganization();
    const body = await req.json();
    const parsed = accountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid account data" },
        { status: 400 }
      );
    }

    const account = await prisma.accountLedger.create({
      data: {
        organizationId: active.organizationId,
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
    console.error("CREATE_COA_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create account" },
      { status: 500 }
    );
  }
}