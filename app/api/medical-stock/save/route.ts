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

function normalizeDateString(value: unknown): string {
  const str = String(value ?? "").trim();
  return str;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    const organizationId = String(body?.organizationId || "").trim();

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "organizationId is required" },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, error: "No stock items provided" },
        { status: 400 }
      );
    }

    const validItems = items
      .map((item: any) => {
        const medicineName = String(item?.medicineName || "").trim();
        const batchNumber = String(item?.batchNumber || "").trim();
        const expiryDateRaw = normalizeDateString(item?.expiryDate);

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
          unitType:
            String(item?.unitType || item?.pack || "UNIT").trim() || "UNIT",
          batchNumber,
          expiryDate,
          costPrice: toNumber(item?.purchasePrice),
          sellingPrice:
            item?.sellingPrice !== undefined &&
            item?.sellingPrice !== null &&
            String(item?.sellingPrice).trim() !== ""
              ? toNumber(item?.sellingPrice)
              : null,
          vendorName: toNullableString(item?.vendorName),
          billFileUrl: toNullableString(item?.billFileUrl),
          lowStockThreshold: toNumber(item?.lowStockThreshold ?? 10),
        };
      })
      .filter(Boolean) as Array<{
      organizationId: string;
      medicineName: string;
      quantity: number;
      unitType: string;
      batchNumber: string;
      expiryDate: Date;
      costPrice: number;
      sellingPrice: number | null;
      vendorName: string | null;
      billFileUrl: string | null;
      lowStockThreshold: number;
    }>;

    if (validItems.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid stock rows found to save" },
        { status: 400 }
      );
    }

    // IMPORTANT:
    // existing same medicine+batch+expiry unte update chestham
    // leka pothe create chestham
    const results = await prisma.$transaction(
      validItems.map((item) =>
        prisma.medicineStock.upsert({
          where: {
            organizationId_medicineName_batchNumber_expiryDate: {
              organizationId: item.organizationId,
              medicineName: item.medicineName,
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate,
            },
          },
          update: {
            quantity: item.quantity,
            unitType: item.unitType,
            costPrice: item.costPrice,
            sellingPrice: item.sellingPrice,
            vendorName: item.vendorName,
            billFileUrl: item.billFileUrl,
            lowStockThreshold: item.lowStockThreshold,
          },
          create: {
            organizationId: item.organizationId,
            medicineName: item.medicineName,
            quantity: item.quantity,
            unitType: item.unitType,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate,
            costPrice: item.costPrice,
            sellingPrice: item.sellingPrice,
            vendorName: item.vendorName,
            billFileUrl: item.billFileUrl,
            lowStockThreshold: item.lowStockThreshold,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: "Medical stock saved successfully",
      count: results.length,
    });
  } catch (error: any) {
    console.error("Medical stock save error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message || "Failed to save medical stock data",
      },
      { status: 500 }
    );
  }
}