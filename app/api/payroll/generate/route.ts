import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

export async function POST(req: Request) {
  try {
    const active = await requireActiveOrganization();
    const body = await req.json();

    const month = Number(body.month);
    const year = Number(body.year);

    if (!month || !year || month < 1 || month > 12) {
      return NextResponse.json(
        { success: false, error: "Valid month and year are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.payrollRun.findUnique({
      where: {
        organizationId_month_year: {
          organizationId: active.organizationId,
          month,
          year,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Payroll already generated for this month" },
        { status: 400 }
      );
    }

    const employees = await prisma.employee.findMany({
      where: {
        organizationId: active.organizationId,
        status: "ACTIVE",
      },
    });

    if (employees.length === 0) {
      return NextResponse.json(
        { success: false, error: "No active employees found" },
        { status: 400 }
      );
    }

    let grossAmount = 0;
    let totalDeductions = 0;
    let netAmount = 0;

    const slips = employees.map((employee) => {
      const basicSalary = Number(employee.basicSalary || 0);
      const hra = Number(employee.hra || 0);
      const allowance = Number(employee.allowance || 0);

      const deduction = Number(employee.deduction || 0);
      const pfDeduction = Number(employee.pfDeduction || 0);
      const esiDeduction = Number(employee.esiDeduction || 0);
      const professionalTax = Number(employee.professionalTax || 0);

      const grossSalary = basicSalary + hra + allowance;
      const deductions =
        deduction + pfDeduction + esiDeduction + professionalTax;
      const netSalary = grossSalary - deductions;

      grossAmount += grossSalary;
      totalDeductions += deductions;
      netAmount += netSalary;

      return {
        organizationId: active.organizationId,
        employeeId: employee.id,
        month,
        year,
        basicSalary,
        hra,
        allowance,
        grossSalary,
        deduction,
        pfDeduction,
        esiDeduction,
        professionalTax,
        totalDeductions: deductions,
        netSalary,
        status: "GENERATED",
      };
    });

    const payrollRun = await prisma.$transaction(async (tx) => {
      const run = await tx.payrollRun.create({
        data: {
          organizationId: active.organizationId,
          month,
          year,
          status: "PROCESSED",
          grossAmount,
          totalDeductions,
          netAmount,
        },
      });

      await tx.salarySlip.createMany({
        data: slips.map((slip) => ({
          ...slip,
          payrollRunId: run.id,
        })),
      });

      return run;
    });

    return NextResponse.json({
      success: true,
      data: payrollRun,
    });
  } catch (error) {
    console.error("GENERATE_PAYROLL_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to generate payroll" },
      { status: 500 }
    );
  }
}