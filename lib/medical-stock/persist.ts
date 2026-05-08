import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  buildGroupedMedicalStock,
  ensureMedicalStockTables,
  getMedicalStockMovementsByOrganization,
  getMedicalStockRowsByOrganization,
} from "@/lib/medical-stock/db";
import {
  cleanString,
  formatDateToISO,
  mergeIncomingRows,
  normalizeBatchKey,
  normalizeMedicineKey,
  parseExpiryDateInput,
} from "@/lib/medical-stock/utils";
import type { MedicalStockRowInput } from "@/types/medical-stock";

export async function persistMedicalStockRows(
  organizationId: string,
  rows: MedicalStockRowInput[],
  sourceBillId?: string,
) {
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
    return {
      savedCount: 0,
      items: [],
    };
  }

  for (const row of mergedRows) {
    const medicineKey = normalizeMedicineKey(row.medicineName);
    const batchKey = normalizeBatchKey(row.batchNumber);
    const incomingExpiry = parseExpiryDateInput(row.expiryDate);

    if (!incomingExpiry) {
      continue;
    }

    await prisma.$executeRaw`
      INSERT INTO "MedicalStockMovement" (
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
        "sourceBillId",
        "createdAt"
      )
      VALUES (
        ${randomUUID()},
        ${organizationId},
        ${row.medicineName},
        ${medicineKey},
        ${row.batchNumber},
        ${batchKey},
        ${formatDateToISO(incomingExpiry)}::date,
        ${row.quantity},
        ${row.purchasePrice},
        ${row.sellingPrice},
        ${row.vendorName || ""},
        ${row.billFileUrl || null},
        ${sourceBillId || null},
        NOW()
      )
    `;

    await prisma.$executeRaw`
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
        ${formatDateToISO(incomingExpiry)}::date,
        ${row.quantity},
        ${row.purchasePrice},
        ${row.sellingPrice},
        ${row.vendorName || ""},
        ${row.billFileUrl || null},
        NOW(),
        NOW()
      )
      ON CONFLICT ("organizationId", "medicineKey", "batchKey")
      DO UPDATE SET
        "quantity" = "MedicalStock"."quantity" + EXCLUDED."quantity",
        "purchasePrice" = EXCLUDED."purchasePrice",
        "sellingPrice" = EXCLUDED."sellingPrice",
        "expiryDate" = GREATEST("MedicalStock"."expiryDate", EXCLUDED."expiryDate"),
        "vendorName" = EXCLUDED."vendorName",
        "billFileUrl" = COALESCE(EXCLUDED."billFileUrl", "MedicalStock"."billFileUrl"),
        "updatedAt" = NOW()
    `;
  }

  const stockRows = await getMedicalStockRowsByOrganization(organizationId);
  const movementRows = await getMedicalStockMovementsByOrganization(organizationId);

  return {
    savedCount: mergedRows.length,
    items: buildGroupedMedicalStock({
      stockRows,
      movementRows,
    }),
  };
}