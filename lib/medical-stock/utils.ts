import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  isValid,
  parse,
  parseISO,
  startOfDay,
} from "date-fns";
import {
  MEDICAL_STOCK_EXPIRY_WARNING_DAYS,
  MEDICAL_STOCK_LOW_STOCK_THRESHOLD,
} from "@/lib/medical-stock/constants";
import type { MedicalStockItem, MedicalStockRowInput } from "@/types/medical-stock";

export function cleanString(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

export function normalizeMedicineKey(value: string): string {
  return cleanString(value).toLowerCase();
}

export function normalizeBatchKey(value: string): string {
  return cleanString(value).toLowerCase().replace(/\s+/g, "");
}

export function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[,₹\s]/g, "");
    const num = Number(normalized);
    if (Number.isFinite(num)) {
      return num;
    }
  }

  return fallback;
}

export function safeInteger(value: unknown, fallback = 0): number {
  const num = safeNumber(value, fallback);
  return Number.isFinite(num) ? Math.max(0, Math.round(num)) : fallback;
}

export function parseExpiryDateInput(value: string): Date | null {
  const trimmed = cleanString(value);
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(/\./g, "/").replace(/-/g, "/");

  const directIso = parseISO(trimmed);
  if (isValid(directIso)) {
    return directIso;
  }

  const patterns = [
    "dd/MM/yyyy",
    "d/M/yyyy",
    "dd/MM/yy",
    "d/M/yy",
    "MM/yyyy",
    "M/yyyy",
    "MM/yy",
    "M/yy",
    "yyyy/MM/dd",
    "yyyy/M/d",
    "dd MMM yyyy",
    "d MMM yyyy",
    "MMM yyyy",
    "MMMM yyyy",
  ];

  for (const pattern of patterns) {
    const parsed = parse(normalized, pattern, new Date());
    if (isValid(parsed)) {
      if (pattern === "MM/yyyy" || pattern === "M/yyyy" || pattern === "MM/yy" || pattern === "M/yy" || pattern === "MMM yyyy" || pattern === "MMMM yyyy") {
        return endOfMonth(parsed);
      }
      return parsed;
    }
  }

  const looseDate = new Date(trimmed);
  if (isValid(looseDate)) {
    return looseDate;
  }

  return null;
}

export function formatDateToISO(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return format(date, "yyyy-MM-dd");
}

export function getExpiryMeta(expiryDate: Date | string) {
  const date = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const daysToExpiry = differenceInCalendarDays(target, today);
  const isExpired = daysToExpiry < 0;
  const expiresIn30Days = !isExpired && daysToExpiry <= MEDICAL_STOCK_EXPIRY_WARNING_DAYS;

  return {
    isExpired,
    expiresIn30Days,
    daysToExpiry,
  };
}

export function isLowStock(quantity: number): boolean {
  return quantity < MEDICAL_STOCK_LOW_STOCK_THRESHOLD;
}

export function mergeIncomingRows(rows: MedicalStockRowInput[]): MedicalStockRowInput[] {
  const map = new Map<string, MedicalStockRowInput>();

  for (const row of rows) {
    const medicineName = cleanString(row.medicineName);
    const batchNumber = cleanString(row.batchNumber);
    const vendorName = cleanString(row.vendorName);
    const expiryDate = cleanString(row.expiryDate);
    const quantity = safeInteger(row.quantity);
    const purchasePrice = safeNumber(row.purchasePrice);
    const sellingPrice = safeNumber(row.sellingPrice);
    const billFileUrl = row.billFileUrl ?? null;

    if (!medicineName || !batchNumber || !expiryDate) {
      continue;
    }

    const key = `${normalizeMedicineKey(medicineName)}__${normalizeBatchKey(batchNumber)}`;
    const incomingDate = parseExpiryDateInput(expiryDate);

    if (!incomingDate) {
      continue;
    }

    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        medicineName,
        batchNumber,
        expiryDate: formatDateToISO(incomingDate),
        quantity,
        purchasePrice,
        sellingPrice,
        vendorName,
        billFileUrl,
      });
      continue;
    }

    const existingDate = parseExpiryDateInput(existing.expiryDate);
    const chosenDate =
      existingDate && incomingDate > existingDate ? incomingDate : existingDate ?? incomingDate;

    map.set(key, {
      medicineName: existing.medicineName || medicineName,
      batchNumber: existing.batchNumber || batchNumber,
      expiryDate: formatDateToISO(chosenDate),
      quantity: safeInteger(existing.quantity) + quantity,
      purchasePrice: purchasePrice > 0 ? purchasePrice : safeNumber(existing.purchasePrice),
      sellingPrice: sellingPrice > 0 ? sellingPrice : safeNumber(existing.sellingPrice),
      vendorName: vendorName || existing.vendorName,
      billFileUrl: billFileUrl || existing.billFileUrl || null,
    });
  }

  return Array.from(map.values());
}

export function serializeMedicalStockRecord(record: {
  id: string;
  organizationId: string;
  medicineName: string;
  batchNumber: string;
  expiryDate: Date;
  quantity: number;
  purchasePrice: { toString(): string } | number;
  sellingPrice: { toString(): string } | number;
  vendorName: string;
  billFileUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}): MedicalStockItem {
  const expiryMeta = getExpiryMeta(record.expiryDate);

  return {
    id: record.id,
    organizationId: record.organizationId,
    medicineName: record.medicineName,
    batchNumber: record.batchNumber,
    expiryDate: formatDateToISO(record.expiryDate),
    quantity: record.quantity,
    purchasePrice: Number(record.purchasePrice.toString()),
    sellingPrice: Number(record.sellingPrice.toString()),
    vendorName: record.vendorName,
    billFileUrl: record.billFileUrl,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    isLowStock: isLowStock(record.quantity),
    isExpired: expiryMeta.isExpired,
    expiresIn30Days: expiryMeta.expiresIn30Days,
    daysToExpiry: expiryMeta.daysToExpiry,
  };
}