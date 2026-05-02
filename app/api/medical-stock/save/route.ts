import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";

type StockItemPayload = {
  organizationId?: string;
  medicineName?: string;
  quantity?: number | string;
  unitType?: string;
  batchNumber?: string;
  expiryDate?: string;
  purchasePrice?: number | string;
  sellingPrice?: number | string | null;
  vendorName?: string | null;
  billFileUrl?: string | null;
  lowStockThreshold?: number | string;
};

function sanitizeNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function sanitizeString(value: unknown): string {
  return String(value ?? "").trim();
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: StockItemPayload[] = Array.isArray(body?.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json(
        { error: "No stock items provided" },
        { status: 400 }
      );
    }

    const mapped = items.map((item) => {
      const expiry =
        item.expiryDate && sanitizeString(item.expiryDate)
          ? new Date(String(item.expiryDate))
          : null;

      return {
        organizationId: sanitizeString(item.organizationId),
        medicineName: sanitizeString(item.medicineName),
        quantity: sanitizeNumber(item.quantity),
        unitType: sanitizeString(item.unitType || "STRIP"),
        batchNumber: sanitizeString(item.batchNumber),
        expiryDate: expiry,
        costPrice: new Prisma.Decimal(sanitizeNumber(item.purchasePrice)),
        sellingPrice:
          item.sellingPrice !== undefined &&
          item.sellingPrice !== null &&
          sanitizeString(item.sellingPrice) !== ""
            ? new Prisma.Decimal(sanitizeNumber(item.sellingPrice))
            : null,
        vendorName:
          item.vendorName !== undefined &&
          item.vendorName !== null &&
          sanitizeString(item.vendorName) !== ""
            ? sanitizeString(item.vendorName)
            : null,
        billFileUrl:
          item.billFileUrl !== undefined &&
          item.billFileUrl !== null &&
          sanitizeString(item.billFileUrl) !== ""
            ? sanitizeString(item.billFileUrl)
            : null,
        lowStockThreshold: sanitizeNumber(item.lowStockThreshold ?? 10),
      };
    });

    const validData: Prisma.MedicineStockCreateManyInput[] = mapped
      .filter((item) => {
        return (
          item.organizationId.length > 0 &&
          item.medicineName.length > 0 &&
          item.batchNumber.length > 0 &&
          isValidDate(item.expiryDate) &&
          item.quantity > 0
        );
      })
      .map((item) => ({
        organizationId: item.organizationId,
        medicineName: item.medicineName,
        quantity: item.quantity,
        unitType: item.unitType || "STRIP",
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate as Date,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        vendorName: item.vendorName,
        billFileUrl: item.billFileUrl,
        lowStockThreshold: item.lowStockThreshold,
      }));

    if (validData.length === 0) {
      return NextResponse.json(
        { error: "Please enter valid stock data." },
        { status: 400 }
      );
    }

    const created = await prisma.medicineStock.createMany({
      data: validData,
    });

    return NextResponse.json({
      success: true,
      message: "Medical stock saved successfully",
      count: created.count,
    });
  } catch (error) {
    console.error("Medical stock save error:", error);
    return NextResponse.json(
      { error: "Failed to save medical stock data" },
      { status: 500 }
    );
  }
}