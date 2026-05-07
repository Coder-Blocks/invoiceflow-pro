import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  ensureMedicalStockTables,
  getMedicalStockRowsByOrganization,
  mapMedicalStockRow,
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

    const existingRows = await prisma.$queryRaw<
      Array<{
        id: string;
        quantity: number;
        expiryDate: Date | string;
        vendorName: string | null;
        billFileUrl: string | null;
      }>
    >`
      SELECT
        "id",
        "quantity",
        "expiryDate",
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

      await prisma.$executeRaw`
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

  const currentRows = await getMedicalStockRowsByOrganization(organizationId);

  return {
    savedCount: mergedRows.length,
    items: currentRows.map(mapMedicalStockRow),
  };
}