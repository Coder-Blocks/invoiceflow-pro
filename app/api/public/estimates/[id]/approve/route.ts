import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: Request, { params }: Props) {
  try {
    const { id } = await params;

    const estimate = await prisma.estimate.update({
      where: { id },
      data: {
        status: "ACCEPTED",
      } as any,
    });

    return NextResponse.json({
      success: true,
      estimateId: estimate.id,
    });
  } catch (error) {
    console.error("PUBLIC_ESTIMATE_APPROVE_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to approve estimate" },
      { status: 500 }
    );
  }
}