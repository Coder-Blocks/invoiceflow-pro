import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function getModel() {
  const p = prisma as any;
  return p.medicalStockItem || p.medicalStock || null;
}

export async function GET() {
  try {
    const model = getModel();

    if (!model) {
      return NextResponse.json({
        items: [],
        warning:
          "Medical stock Prisma model not found. Please ensure your Prisma schema has medicalStockItem or medicalStock model.",
      });
    }

    const items = await model.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      items,
    });
  } catch (error) {
    console.error("Medical stock list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch medical stock list" },
      { status: 500 }
    );
  }
}