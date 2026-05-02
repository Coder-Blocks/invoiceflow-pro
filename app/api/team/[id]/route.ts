import { NextResponse } from "next/server";
import { OrganizationRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";
import { requireRole } from "@/lib/permissions";

type Props = {
  params: Promise<{ id: string }>;
};

const allowedRoles: OrganizationRole[] = [
  "ADMIN",
  "ACCOUNTANT",
  "STAFF",
  "MEMBER",
];

export async function PUT(req: Request, { params }: Props) {
  try {
    const active = await requireActiveOrganization();
    const { id } = await params;

    await requireRole({
      userId: active.userId,
      organizationId: active.organizationId,
      allowedRoles: ["OWNER", "ADMIN"],
    });

    const body = await req.json();
    const role = String(body.role || "MEMBER") as OrganizationRole;

    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid role. OWNER cannot be assigned here.",
        },
        { status: 400 }
      );
    }

    const member = await prisma.organizationMember.findFirst({
      where: {
        id,
        organizationId: active.organizationId,
      },
    });

    if (!member) {
      return NextResponse.json(
        { success: false, error: "Member not found" },
        { status: 404 }
      );
    }

    if (member.role === "OWNER") {
      return NextResponse.json(
        { success: false, error: "Owner role cannot be changed" },
        { status: 400 }
      );
    }

    const updated = await prisma.organizationMember.update({
      where: {
        id: member.id,
      },
      data: {
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("UPDATE_TEAM_MEMBER_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update member role" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: Props) {
  try {
    const active = await requireActiveOrganization();
    const { id } = await params;

    await requireRole({
      userId: active.userId,
      organizationId: active.organizationId,
      allowedRoles: ["OWNER", "ADMIN"],
    });

    const member = await prisma.organizationMember.findFirst({
      where: {
        id,
        organizationId: active.organizationId,
      },
    });

    if (!member) {
      return NextResponse.json(
        { success: false, error: "Member not found" },
        { status: 404 }
      );
    }

    if (member.role === "OWNER") {
      return NextResponse.json(
        { success: false, error: "Owner cannot be removed" },
        { status: 400 }
      );
    }

    await prisma.organizationMember.update({
      where: {
        id: member.id,
      },
      data: {
        status: "REMOVED",
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("REMOVE_TEAM_MEMBER_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove member" },
      { status: 500 }
    );
  }
}