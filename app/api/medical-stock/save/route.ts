import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveOrganizationIdFromRequest } from "@/lib/medical-stock/organization";
import {
  cleanString,
  formatDateToISO,
  mergeIncomingRows,
  normalizeBatchKey,
  normalizeMedicineKey,
  parseExpiryDateInput,
  serializeMedicalStockRecord,
} from "@/lib/medical-stock/utils";
import { saveMedicalStockSchema } from "@/lib/medical-stock/validators";
import type { SaveMedicalStockResponse } from "@/types/medical-stock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const json = (await request.json()) as Record<string, unknown>;
    const organizationIdFromRequest = await resolveOrganizationIdFromRequest(request, {
      jsonBody: json,
    });

    const parsedBody = saveMedicalStockSchema.safeParse({
      ...json,
      organizationId: organizationIdFromRequest ?? json.organizationId,
    });

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsedBody.error.issues[0]?.message ?? "Invalid request body.",
        },
        { status: 400 },
      );
    }

    const { organizationId, rows, billId } = parsedBody.data;

    const mergedRows = mergeIncomingRows(
      rows.map((row) => ({
        ...row,
        medicineName: cleanString(row.medicineName),
        batchNumber: cleanString(row.batchNumber),
        expiryDate: cleanString(row.expiryDate),
        vendorName: cleanString(row.vendorName),
        billFileUrl: row.billFileUrl ?? null,
      })),
    );

    if (mergedRows.length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid medicine rows to save." },
        { status: 400 },
      );
    }

    const keys = mergedRows.map((row) => ({
      medicineKey: normalizeMedicineKey(row.medicineName),
      batchKey: normalizeBatchKey(row.batchNumber),
    }));

    const existing = await prisma.medicalStock.findMany({
      where: {
        organizationId,
        OR: keys.map((item) => ({
          medicineKey: item.medicineKey,
          batchKey: item.batchKey,
        })),
      },
    });

    const existingMap = new Map(
      existing.map((item) => [
        `${item.medicineKey}__${item.batchKey}`,
        item,
      ]),
    );

    await prisma.$transaction(
      mergedRows.map((row) => {
        const medicineKey = normalizeMedicineKey(row.medicineName);
        const batchKey = normalizeBatchKey(row.batchNumber);
        const key = `${medicineKey}__${batchKey}`;
        const found = existingMap.get(key);
        const incomingExpiry = parseExpiryDateInput(row.expiryDate);

        if (!incomingExpiry) {
          throw new Error(`Invalid expiry date for medicine ${row.medicineName}.`);
        }

        if (found) {
          const chosenExpiry = incomingExpiry > found.expiryDate ? incomingExpiry : found.expiryDate;

          return prisma.medicalStock.update({
            where: {
              id: found.id,
            },
            data: {
              quantity: found.quantity + row.quantity,
              purchasePrice: row.purchasePrice,
              sellingPrice: row.sellingPrice,
              expiryDate: chosenExpiry,
              vendorName: row.vendorName || found.vendorName,
              billFileUrl: row.billFileUrl || found.billFileUrl,
            },
          });
        }

        return prisma.medicalStock.create({
          data: {
            organizationId,
            medicineName: row.medicineName,
            medicineKey,
            batchNumber: row.batchNumber,
            batchKey,
            expiryDate: incomingExpiry,
            quantity: row.quantity,
            purchasePrice: row.purchasePrice,
            sellingPrice: row.sellingPrice,
            vendorName: row.vendorName,
            billFileUrl: row.billFileUrl || null,
          },
        });
      }),
    );

    if (billId) {
      await prisma.uploadedMedicalBill.updateMany({
        where: {
          id: billId,
          organizationId,
        },
        data: {
          parseMessage: `Saved ${mergedRows.length} medicine row(s) into stock on ${formatDateToISO(new Date())}.`,
        },
      });
    }

    const current = await prisma.medicalStock.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });

    const response: SaveMedicalStockResponse = {
      success: true,
      message: "Medical stock saved successfully.",
      savedCount: mergedRows.length,
      items: current.map(serializeMedicalStockRecord),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save medical stock.";

    return NextResponse.json(
      { success: false, message },
      { status: 500 },
    );
  }
}