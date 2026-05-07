import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureMedicalStockTables, getMedicalStockRowsByOrganization, mapMedicalStockRow } from "@/lib/medical-stock/db";
import { resolveOrganizationIdFromRequest } from "@/lib/medical-stock/organization";
import {
  cleanString,
  formatDateToISO,
  mergeIncomingRows,
  normalizeBatchKey,
  normalizeMedicineKey,
  parseExpiryDateInput,
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

    const rowsInput = Array.isArray(json.rows) ? json.rows : [];
    const nonEmptyRows = rowsInput.filter((row) => {
      if (!row || typeof row !== "object") return false;
      const item = row as Record<string, unknown>;
      return (
        String(item.medicineName ?? "").trim() ||
        String(item.batchNumber ?? "").trim() ||
        String(item.expiryDate ?? "").trim() ||
        Number(item.quantity ?? 0) > 0 ||
        Number(item.purchasePrice ?? 0) > 0 ||
        Number(item.sellingPrice ?? 0) > 0 ||
        String(item.vendorName ?? "").trim()
      );
    });

    if (nonEmptyRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter at least one medicine row before saving.",
        },
        { status: 400 },
      );
    }

    const parsedBody = saveMedicalStockSchema.safeParse({
      ...json,
      organizationId: organizationIdFromRequest ?? json.organizationId,
      rows: nonEmptyRows,
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

    const { organizationId, rows } = parsedBody.data;

    await ensureMedicalStockTables();

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
        { success: false, message: "Please enter valid medicine rows before saving." },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const row of mergedRows) {
        const medicineKey = normalizeMedicineKey(row.medicineName);
        const batchKey = normalizeBatchKey(row.batchNumber);
        const incomingExpiry = parseExpiryDateInput(row.expiryDate);

        if (!incomingExpiry) {
          throw new Error(`Invalid expiry date for medicine ${row.medicineName}.`);
        }

        const existingRows = await tx.$queryRaw<
          Array<{
            id: string;
            quantity: number;
            expiryDate: Date | string;
            purchasePrice: string | number;
            sellingPrice: string | number;
            vendorName: string | null;
            billFileUrl: string | null;
          }>
        >`
          SELECT
            "id",
            "quantity",
            "expiryDate",
            "purchasePrice",
            "sellingPrice",
            "vendorName",
            "billFileUrl"
          FROM "MedicalStock"
          WHERE "organizationId" = ${organizationId}
            AND "medicineKey" = ${medicineKey}
            AND "batchKey" = ${batchKey}
          LIMIT 1
        `;

        const found = existingRows[0];

        if (found) {
          const existingExpiry =
            found.expiryDate instanceof Date
              ? found.expiryDate
              : new Date(found.expiryDate);

          const chosenExpiry = incomingExpiry > existingExpiry ? incomingExpiry : existingExpiry;

          await tx.$executeRaw`
            UPDATE "MedicalStock"
            SET
              "quantity" = ${Number(found.quantity) + Number(row.quantity)},
              "purchasePrice" = ${row.purchasePrice},
              "sellingPrice" = ${row.sellingPrice},
              "expiryDate" = ${formatDateToISO(chosenExpiry)}::date,
              "vendorName" = ${row.vendorName || found.vendorName || ""},
              "billFileUrl" = ${row.billFileUrl || found.billFileUrl},
              "updatedAt" = NOW()
            WHERE "id" = ${found.id}
          `;
        } else {
          await tx.$executeRaw`
            INSERT INTO "MedicalStock" (
              "id",
              "organizationId",
              "medicineName",
              "medicineKey",
              "batchNumber",
              "batchKey",
              "expiryDate",
              "quantity",
              "purchasePrice",
              "sellingPrice",
              "vendorName",
              "billFileUrl",
              "createdAt",
              "updatedAt"
            )
            VALUES (
              ${randomUUID()},
              ${organizationId},
              ${row.medicineName},
              ${medicineKey},
              ${row.batchNumber},
              ${batchKey},
              ${row.expiryDate}::date,
              ${row.quantity},
              ${row.purchasePrice},
              ${row.sellingPrice},
              ${row.vendorName || ""},
              ${row.billFileUrl || null},
              NOW(),
              NOW()
            )
          `;
        }
      }
    });

    const currentRows = await getMedicalStockRowsByOrganization(organizationId);

    const response: SaveMedicalStockResponse = {
      success: true,
      message: "Medical stock saved successfully.",
      savedCount: mergedRows.length,
      items: currentRows.map(mapMedicalStockRow),
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