import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: Props) {
  try {
    const active = await requireActiveOrganization();
    const { id } = await params;

    const slip = await prisma.salarySlip.findFirst({
      where: {
        id,
        organizationId: active.organizationId,
      },
    });

    if (!slip) {
      return NextResponse.json(
        { success: false, error: "Salary slip not found" },
        { status: 404 }
      );
    }

    if (slip.status === "PAID") {
      return NextResponse.json(
        { success: false, error: "Salary already paid" },
        { status: 400 }
      );
    }

    const updated = await prisma.salarySlip.update({
      where: {
        id: slip.id,
      },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
    });

    const pendingCount = await prisma.salarySlip.count({
      where: {
        payrollRunId: slip.payrollRunId,
        status: {
          not: "PAID",
        },
      },
    });

    if (pendingCount === 0) {
      await prisma.payrollRun.update({
        where: {
          id: slip.payrollRunId,
        },
        data: {
          status: "PAID",
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("MARK_SALARY_PAID_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to mark salary as paid" },
      { status: 500 }
    );
  }
}