import { prisma } from "@/lib/prisma";
import {
  formatDateToISO,
  getExpiryMeta,
  isLowStock,
} from "@/lib/medical-stock/utils";
import type { MedicalStockItem, MedicalStockRowInput } from "@/types/medical-stock";

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
    CREATE INDEX IF NOT EXISTS "MedicalStock_org_quantity_idx"
    ON "MedicalStock" ("organizationId", "quantity");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "UploadedMedicalBill_org_createdAt_idx"
    ON "UploadedMedicalBill" ("organizationId", "createdAt");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "UploadedMedicalBill_org_parseStatus_idx"
    ON "UploadedMedicalBill" ("organizationId", "parseStatus");
  `);
}

export function mapMedicalStockRow(row: RawMedicalStockRow): MedicalStockItem {
  const expiryDate =
    row.expiryDate instanceof Date ? row.expiryDate : new Date(row.expiryDate);

  const createdAt =
    row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt);

  const updatedAt =
    row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt);

  const expiryMeta = getExpiryMeta(expiryDate);

  return {
    id: row.id,
    organizationId: row.organizationId,
    medicineName: row.medicineName,
    batchNumber: row.batchNumber,
    expiryDate: formatDateToISO(expiryDate),
    quantity: Number(row.quantity),
    purchasePrice: Number(row.purchasePrice),
    sellingPrice: Number(row.sellingPrice),
    vendorName: row.vendorName ?? "",
    billFileUrl: row.billFileUrl ?? null,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    isLowStock: isLowStock(Number(row.quantity)),
    isExpired: expiryMeta.isExpired,
    expiresIn30Days: expiryMeta.expiresIn30Days,
    daysToExpiry: expiryMeta.daysToExpiry,
  };
}

export async function getMedicalStockRowsByOrganization(organizationId: string) {
  await ensureMedicalStockTables();

  const rows = await prisma.$queryRaw<RawMedicalStockRow[]>`
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
    ORDER BY "updatedAt" DESC, "createdAt" DESC
  `;

  return rows;
}

export async function getMedicalStockByKey(params: {
  organizationId: string;
  medicineKey: string;
  batchKey: string;
}) {
  await ensureMedicalStockTables();

  const rows = await prisma.$queryRaw<RawMedicalStockRow[]>`
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
    WHERE "organizationId" = ${params.organizationId}
      AND "medicineKey" = ${params.medicineKey}
      AND "batchKey" = ${params.batchKey}
    LIMIT 1
  `;

  return rows[0] ?? null;
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