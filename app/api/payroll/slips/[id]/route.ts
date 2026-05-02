import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Props) {
  try {
    const active = await requireActiveOrganization();
    const { id } = await params;

    const slip = await prisma.salarySlip.findFirst({
      where: {
        id,
        organizationId: active.organizationId,
      },
      include: {
        employee: true,
        organization: true,
        payrollRun: true,
      },
    });

    if (!slip) {
      return NextResponse.json(
        { success: false, error: "Salary slip not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: slip,
    });
  } catch (error) {
    console.error("GET_SALARY_SLIP_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch salary slip" },
      { status: 500 }
    );
  }
}