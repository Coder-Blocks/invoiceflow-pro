import { prisma } from "@/lib/prisma";
import {
  formatDateToISO,
  getExpiryMeta,
  isLowStock,
  normalizeBatchKey,
  normalizeMedicineKey,
} from "@/lib/medical-stock/utils";
import type {
  MedicalStockBatchItem,
  MedicalStockGroupedItem,
  MedicalStockPriceHistoryItem,
  MedicalStockRowInput,
} from "@/types/medical-stock";

type RawMedicalStockRow = {
  id: string;
  organizationId: string;
  medicineName: string;
  medicineKey: string;
  batchNumber: string;
  batchKey: string;
  expiryDate: Date | string;
  quantity: number;
  purchasePrice: string | number;
  sellingPrice: string | number;
  vendorName: string | null;
  billFileUrl: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type RawUploadedBillRow = {
  id: string;
  organizationId: string;
  originalFileName: string;
  storedFileName: string;
  mimeType: string;
  fileSize: number;
  fileUrl: string;
  parseStatus: string;
  parseMessage: string | null;
  extractedRowsJson: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type RawMedicalStockMovementRow = {
  id: string;
  organizationId: string;
  medicineName: string;
  medicineKey: string;
  batchNumber: string;
  batchKey: string;
  expiryDate: Date | string;
  quantity: number;
  purchasePrice: string | number;
  sellingPrice: string | number;
  vendorName: string | null;
  billFileUrl: string | null;
  sourceBillId: string | null;
  createdAt: Date | string;
};

export async function ensureMedicalStockTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MedicalStock" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "medicineName" TEXT NOT NULL,
      "medicineKey" TEXT NOT NULL,
      "batchNumber" TEXT NOT NULL,
      "batchKey" TEXT NOT NULL,
      "expiryDate" DATE NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 0,
      "purchasePrice" NUMERIC(12,2) NOT NULL DEFAULT 0,
      "sellingPrice" NUMERIC(12,2) NOT NULL DEFAULT 0,
      "vendorName" TEXT NOT NULL DEFAULT '',
      "billFileUrl" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "UploadedMedicalBill" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "originalFileName" TEXT NOT NULL,
      "storedFileName" TEXT NOT NULL,
      "mimeType" TEXT NOT NULL,
      "fileSize" INTEGER NOT NULL,
      "fileUrl" TEXT NOT NULL,
      "parseStatus" TEXT NOT NULL DEFAULT 'PENDING',
      "parseMessage" TEXT,
      "extractedRowsJson" JSONB,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MedicalStockMovement" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "medicineName" TEXT NOT NULL,
      "medicineKey" TEXT NOT NULL,
      "batchNumber" TEXT NOT NULL,
      "batchKey" TEXT NOT NULL,
      "expiryDate" DATE NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 0,
      "purchasePrice" NUMERIC(12,2) NOT NULL DEFAULT 0,
      "sellingPrice" NUMERIC(12,2) NOT NULL DEFAULT 0,
      "vendorName" TEXT NOT NULL DEFAULT '',
      "billFileUrl" TEXT,
      "sourceBillId" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "MedicalStock_org_medicine_batch_unique"
    ON "MedicalStock" ("organizationId", "medicineKey", "batchKey");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "MedicalStock_org_createdAt_idx"
    ON "MedicalStock" ("organizationId", "createdAt");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "MedicalStock_org_expiry_idx"
    ON "MedicalStock" ("organizationId", "expiryDate");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "UploadedMedicalBill_org_createdAt_idx"
    ON "UploadedMedicalBill" ("organizationId", "createdAt");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "MedicalStockMovement_org_createdAt_idx"
    ON "MedicalStockMovement" ("organizationId", "createdAt");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "MedicalStockMovement_org_medicine_idx"
    ON "MedicalStockMovement" ("organizationId", "medicineKey");
  `);
}

export async function getMedicalStockRowsByOrganization(organizationId: string) {
  await ensureMedicalStockTables();

  return await prisma.$queryRaw<RawMedicalStockRow[]>`
    SELECT
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
    FROM "MedicalStock"
    WHERE "organizationId" = ${organizationId}
    ORDER BY "medicineName" ASC, "updatedAt" DESC
  `;
}

export async function getMedicalStockMovementsByOrganization(organizationId: string) {
  await ensureMedicalStockTables();

  return await prisma.$queryRaw<RawMedicalStockMovementRow[]>`
    SELECT
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
    FROM "MedicalStockMovement"
    WHERE "organizationId" = ${organizationId}
    ORDER BY "createdAt" DESC
  `;
}

export async function insertUploadedMedicalBill(params: {
  id: string;
  organizationId: string;
  originalFileName: string;
  storedFileName: string;
  mimeType: string;
  fileSize: number;
  fileUrl: string;
  parseStatus: string;
  parseMessage: string;
  extractedRows: MedicalStockRowInput[];
}) {
  await ensureMedicalStockTables();

  const rows = await prisma.$queryRaw<RawUploadedBillRow[]>`
    INSERT INTO "UploadedMedicalBill" (
      "id",
      "organizationId",
      "originalFileName",
      "storedFileName",
      "mimeType",
      "fileSize",
      "fileUrl",
      "parseStatus",
      "parseMessage",
      "extractedRowsJson",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${params.id},
      ${params.organizationId},
      ${params.originalFileName},
      ${params.storedFileName},
      ${params.mimeType},
      ${params.fileSize},
      ${params.fileUrl},
      ${params.parseStatus},
      ${params.parseMessage},
      ${JSON.stringify(params.extractedRows)}::jsonb,
      NOW(),
      NOW()
    )
    RETURNING
      "id",
      "organizationId",
      "originalFileName",
      "storedFileName",
      "mimeType",
      "fileSize",
      "fileUrl",
      "parseStatus",
      "parseMessage",
      "extractedRowsJson",
      "createdAt",
      "updatedAt"
  `;

  return rows[0];
}

export function buildGroupedMedicalStock(params: {
  stockRows: RawMedicalStockRow[];
  movementRows: RawMedicalStockMovementRow[];
}) {
  const { stockRows, movementRows } = params;

  const movementsByBatch = new Map<string, RawMedicalStockMovementRow[]>();

  for (const row of movementRows) {
    const key = `${row.organizationId}__${row.medicineKey}__${row.batchKey}`;
    const current = movementsByBatch.get(key) || [];
    current.push(row);
    movementsByBatch.set(key, current);
  }

  const grouped = new Map<string, MedicalStockGroupedItem>();

  for (const row of stockRows) {
    const expiryDate = row.expiryDate instanceof Date ? row.expiryDate : new Date(row.expiryDate);
    const createdAt = row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt);
    const updatedAt = row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt);

    const medicineKey = row.medicineKey || normalizeMedicineKey(row.medicineName);
    const batchKey = row.batchKey || normalizeBatchKey(row.batchNumber);
    const movementKey = `${row.organizationId}__${medicineKey}__${batchKey}`;
    const movementHistory = movementsByBatch.get(movementKey) || [];

    const priceHistory: MedicalStockPriceHistoryItem[] = movementHistory.map((item) => ({
      id: item.id,
      quantity: Number(item.quantity || 0),
      purchasePrice: Number(item.purchasePrice || 0),
      sellingPrice: Number(item.sellingPrice || 0),
      expiryDate: formatDateToISO(item.expiryDate instanceof Date ? item.expiryDate : new Date(item.expiryDate)),
      vendorName: item.vendorName || "",
      billFileUrl: item.billFileUrl || null,
      createdAt: (item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt)).toISOString(),
    }));

    const expiryMeta = getExpiryMeta(expiryDate);

    const batch: MedicalStockBatchItem = {
      id: row.id,
      batchNumber: row.batchNumber,
      expiryDate: formatDateToISO(expiryDate),
      quantity: Number(row.quantity || 0),
      purchasePrice: Number(row.purchasePrice || 0),
      sellingPrice: Number(row.sellingPrice || 0),
      vendorName: row.vendorName || "",
      billFileUrl: row.billFileUrl || null,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      isExpired: expiryMeta.isExpired,
      expiresIn30Days: expiryMeta.expiresIn30Days,
      daysToExpiry: expiryMeta.daysToExpiry,
      priceHistory,
    };

    const groupKey = `${row.organizationId}__${medicineKey}`;
    const existing = grouped.get(groupKey);

    if (!existing) {
      grouped.set(groupKey, {
        id: groupKey,
        medicineName: row.medicineName,
        totalQuantity: Number(row.quantity || 0),
        batchCount: 1,
        latestPurchasePrice: Number(row.purchasePrice || 0),
        latestSellingPrice: Number(row.sellingPrice || 0),
        earliestExpiryDate: formatDateToISO(expiryDate),
        vendorNames: row.vendorName ? [row.vendorName] : [],
        isLowStock: isLowStock(Number(row.quantity || 0)),
        isExpired: expiryMeta.isExpired,
        expiresIn30Days: expiryMeta.expiresIn30Days,
        daysToExpiry: expiryMeta.daysToExpiry,
        batches: [batch],
      });
      continue;
    }

    const earliestExpiry =
      new Date(existing.earliestExpiryDate) < expiryDate
        ? new Date(existing.earliestExpiryDate)
        : expiryDate;

    const vendorSet = new Set(existing.vendorNames);
    if (row.vendorName) vendorSet.add(row.vendorName);

    grouped.set(groupKey, {
      ...existing,
      totalQuantity: existing.totalQuantity + Number(row.quantity || 0),
      batchCount: existing.batchCount + 1,
      latestPurchasePrice: Number(row.purchasePrice || 0),
      latestSellingPrice: Number(row.sellingPrice || 0),
      earliestExpiryDate: formatDateToISO(earliestExpiry),
      vendorNames: Array.from(vendorSet),
      isLowStock: isLowStock(existing.totalQuantity + Number(row.quantity || 0)),
      isExpired: existing.isExpired || expiryMeta.isExpired,
      expiresIn30Days:
        (existing.isExpired ? false : existing.expiresIn30Days) || expiryMeta.expiresIn30Days,
      daysToExpiry: Math.min(existing.daysToExpiry, expiryMeta.daysToExpiry),
      batches: [...existing.batches, batch].sort((a, b) => a.batchNumber.localeCompare(b.batchNumber)),
    });
  }

  return Array.from(grouped.values()).sort((a, b) => a.medicineName.localeCompare(b.medicineName));
}