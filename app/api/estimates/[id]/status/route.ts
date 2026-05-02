import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

type Props = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, { params }: Props) {
  try {
    const active = await requireActiveOrganization();
    const { id } = await params;
    const body = await req.json();

    const status = body.status;

    if (!["ACCEPTED", "DECLINED"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status" },
        { status: 400 }
      );
    }

    const estimate = await prisma.estimate.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });

    return NextResponse.json({
      success: true,
      data: estimate,
    });
  } catch (error) {
    console.error("ESTIMATE_STATUS_UPDATE_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to update estimate status" },
      { status: 500 }
    );
  }
}