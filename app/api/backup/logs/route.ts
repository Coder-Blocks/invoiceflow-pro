import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

export async function GET() {
  try {
    const active = await requireActiveOrganization();

    const logs = await prisma.backupLog.findMany({
      where: {
        organizationId: active.organizationId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 30,
    });

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error("BACKUP_LOGS_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to load backup logs" },
      { status: 500 }
    );
  }
}