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

    const employee = await prisma.employee.findFirst({
      where: {
        id,
        organizationId: active.organizationId,
      },
      include: {
        salarySlips: {
          orderBy: [
            { year: "desc" },
            { month: "desc" },
          ],
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error("GET_EMPLOYEE_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch employee" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: Props) {
  try {
    const active = await requireActiveOrganization();
    const { id } = await params;
    const body = await req.json();

    if (!body.name) {
      return NextResponse.json(
        { success: false, error: "Employee name is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.employee.findFirst({
      where: {
        id,
        organizationId: active.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      );
    }

    const employee = await prisma.employee.update({
      where: {
        id: existing.id,
      },
      data: {
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
    console.error("UPDATE_EMPLOYEE_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to update employee" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: Props) {
  try {
    const active = await requireActiveOrganization();
    const { id } = await params;

    const existing = await prisma.employee.findFirst({
      where: {
        id,
        organizationId: active.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      );
    }

    await prisma.employee.update({
      where: {
        id: existing.id,
      },
      data: {
        status: "INACTIVE",
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE_EMPLOYEE_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to deactivate employee" },
      { status: 500 }
    );
  }
}