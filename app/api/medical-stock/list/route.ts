import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = String(searchParams.get("organizationId") || "").trim();

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      );
    }

    const items = await prisma.medicineStock.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        medicineName: true,
        batchNumber: true,
        expiryDate: true,
        quantity: true,
        costPrice: true,
        sellingPrice: true,
        vendorName: true,
        billFileUrl: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      items: items.map((item) => ({
        id: item.id,
        medicineName: item.medicineName,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate
          ? new Date(item.expiryDate).toISOString().split("T")[0]
          : "",
        quantity: item.quantity,
        purchasePrice: Number(item.costPrice ?? 0),
        sellingPrice: Number(item.sellingPrice ?? 0),
        vendorName: item.vendorName || "",
        billFileUrl: item.billFileUrl || "",
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    console.error("Medical stock list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch medical stock list" },
      { status: 500 }
    );
  }
}