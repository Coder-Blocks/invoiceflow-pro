import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function toNullableString(value: unknown): string | null {
  const str = String(value ?? "").trim();
  return str ? str : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    const organizationId = String(body?.organizationId || "").trim();

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "No stock items provided" },
        { status: 400 }
      );
    }

    const validItems = items
      .map((item: any) => {
        const medicineName = String(item?.medicineName || "").trim();
        const batchNumber = String(item?.batchNumber || "").trim();
        const expiryDateRaw = String(item?.expiryDate || "").trim();

        if (!medicineName || !batchNumber || !expiryDateRaw) {
          return null;
        }

        const expiryDate = new Date(expiryDateRaw);
        if (Number.isNaN(expiryDate.getTime())) {
          return null;
        }

        return {
          organizationId,
          medicineName,
          quantity: toNumber(item?.quantity),
          unitType: String(item?.unitType || item?.pack || "UNIT").trim() || "UNIT",
          batchNumber,
          expiryDate,
          costPrice: toNumber(item?.purchasePrice),
          sellingPrice: item?.sellingPrice !== undefined && item?.sellingPrice !== null && String(item?.sellingPrice).trim() !== ""
            ? toNumber(item?.sellingPrice)
            : null,
          vendorName: toNullableString(item?.vendorName),
          billFileUrl: toNullableString(item?.billFileUrl),
          lowStockThreshold: toNumber(item?.lowStockThreshold ?? 10),
        };
      })
      .filter(Boolean);

    if (validItems.length === 0) {
      return NextResponse.json(
        { error: "No valid stock rows found to save" },
        { status: 400 }
      );
    }

    const result = await prisma.medicineStock.createMany({
      data: validItems as any[],
    });

    return NextResponse.json({
      success: true,
      message: "Medical stock saved successfully",
      count: result.count,
    });
  } catch (error) {
    console.error("Medical stock save error:", error);
    return NextResponse.json(
      { error: "Failed to save medical stock data" },
      { status: 500 }
    );
  }
}