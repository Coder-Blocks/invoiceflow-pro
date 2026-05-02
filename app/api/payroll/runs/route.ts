import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

export async function GET() {
  try {
    const active = await requireActiveOrganization();

    const runs = await prisma.payrollRun.findMany({
      where: {
        organizationId: active.organizationId,
      },
      include: {
        salarySlips: {
          include: {
            employee: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: [
        { year: "desc" },
        { month: "desc" },
      ],
    });

    return NextResponse.json({
      success: true,
      data: runs,
    });
  } catch (error) {
    console.error("GET_PAYROLL_RUNS_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch payroll runs" },
      { status: 500 }
    );
  }
}