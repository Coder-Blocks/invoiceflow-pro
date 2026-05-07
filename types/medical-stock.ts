export type MedicalStockRowInput = {
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  vendorName: string;
  billFileUrl?: string | null;
};

export type UploadedMedicalBillItem = {
  id: string;
  organizationId: string;
  originalFileName: string;
  storedFileName: string;
  mimeType: string;
  fileSize: number;
  fileUrl: string;
  parseStatus: "PENDING" | "SUCCESS" | "FAILED" | "UNSUPPORTED";
  parseMessage: string | null;
  extractedRows: MedicalStockRowInput[];
  createdAt: string;
  updatedAt: string;
};

export type MedicalStockItem = {
  id: string;
  organizationId: string;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  vendorName: string;
  billFileUrl: string | null;
  createdAt: string;
  updatedAt: string;
  isLowStock: boolean;
  isExpired: boolean;
  expiresIn30Days: boolean;
  daysToExpiry: number;
};

export type UploadMedicalBillResponse = {
  success: boolean;
  message: string;
  bill: UploadedMedicalBillItem;
  extractedRows: MedicalStockRowInput[];
  autoSavedCount?: number;
};

export type SaveMedicalStockResponse = {
  success: boolean;
  message: string;
  savedCount: number;
  items: MedicalStockItem[];
};

export type ListMedicalStockResponse = {
  success: boolean;
  items: MedicalStockItem[];
};