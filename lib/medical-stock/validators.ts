import { z } from "zod";

export const medicalStockRowSchema = z.object({
  medicineName: z.string().trim().min(1, "Medicine name is required"),
  batchNumber: z.string().trim().min(1, "Batch number is required"),
  expiryDate: z.string().trim().min(1, "Expiry date is required"),
  quantity: z.coerce.number().int().min(0, "Quantity must be 0 or more"),
  purchasePrice: z.coerce.number().min(0, "Purchase price must be 0 or more"),
  sellingPrice: z.coerce.number().min(0, "Selling price must be 0 or more"),
  vendorName: z.string().trim().default(""),
  billFileUrl: z.string().trim().nullable().optional(),
});

export const saveMedicalStockSchema = z.object({
  organizationId: z.string().trim().min(1, "Organization ID is required"),
  billId: z.string().trim().optional(),
  rows: z.array(medicalStockRowSchema).min(1, "At least one medicine row is required"),
});

export const exportMedicalStockSchema = z.object({
  organizationId: z.string().trim().min(1, "Organization ID is required"),
  filename: z.string().trim().optional(),
  rows: z.array(medicalStockRowSchema),
});