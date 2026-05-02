import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

export async function GET() {
  try {
    const active = await requireActiveOrganization();

    const employees = await prisma.employee.findMany({
      where: {
        organizationId: active.organizationId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: employees,
    });
  } catch (error) {
    console.error("GET_EMPLOYEES_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const active = await requireActiveOrganization();
    const body = await req.json();

    if (!body.name) {
      return NextResponse.json(
        { success: false, error: "Employee name is required" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.create({
      data: {
        organizationId: active.organizationId,
        employeeCode: body.employeeCode || null,
        name: String(body.name),
        email: body.email || null,
        phone: body.phone || null,
        designation: body.designation || null,
        department: body.department || null,
        joiningDate: body.joiningDate ? new Date(body.joiningDate) : null,
        status: body.status || "ACTIVE",
        basicSalary: Number(body.basicSalary || 0),
        hra: Number(body.hra || 0),
        allowance: Number(body.allowance || 0),
        deduction: Number(body.deduction || 0),
        pfDeduction: Number(body.pfDeduction || 0),
        esiDeduction: Number(body.esiDeduction || 0),
        professionalTax: Number(body.professionalTax || 0),
      },
    });

    return NextResponse.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error("CREATE_EMPLOYEE_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to create employee" },
      { status: 500 }
    );
  }
}