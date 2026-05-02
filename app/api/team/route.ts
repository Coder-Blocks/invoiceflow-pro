import { NextResponse } from "next/server";
import { OrganizationRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";
import { requireRole } from "@/lib/permissions";

const allowedRoles: OrganizationRole[] = [
  "OWNER",
  "ADMIN",
  "ACCOUNTANT",
  "STAFF",
  "MEMBER",
];

export async function GET() {
  try {
    const active = await requireActiveOrganization();

    await requireRole({
      userId: active.userId,
      organizationId: active.organizationId,
      allowedRoles: ["OWNER", "ADMIN"],
    });

    const members = await prisma.organizationMember.findMany({
      where: {
        organizationId: active.organizationId,
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
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: members,
    });
  } catch (error) {
    console.error("GET_TEAM_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const active = await requireActiveOrganization();

    await requireRole({
      userId: active.userId,
      organizationId: active.organizationId,
      allowedRoles: ["OWNER", "ADMIN"],
    });

    const body = await req.json();

    const email = String(body.email || "").toLowerCase().trim();
    const role = String(body.role || "MEMBER") as OrganizationRole;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: "Invalid role" },
        { status: 400 }
      );
    }

    if (role === "OWNER") {
      return NextResponse.json(
        { success: false, error: "You cannot add another owner from here" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "User not found. Ask this person to sign up first, then add them here.",
        },
        { status: 404 }
      );
    }

    const existing = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: active.organizationId,
        },
      },
    });

    if (existing) {
      const updated = await prisma.organizationMember.update({
        where: {
          id: existing.id,
        },
        data: {
          role,
          status: "ACTIVE",
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
    }

    const member = await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: active.organizationId,
        role,
        status: "ACTIVE",
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
      data: member,
    });
  } catch (error) {
    console.error("ADD_TEAM_MEMBER_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add team member" },
      { status: 500 }
    );
  }
}