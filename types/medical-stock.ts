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

export type MedicalStockPriceHistoryItem = {
  id: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  expiryDate: string;
  vendorName: string;
  billFileUrl: string | null;
  createdAt: string;
};

export type MedicalStockBatchItem = {
  id: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  vendorName: string;
  billFileUrl: string | null;
  createdAt: string;
  updatedAt: string;
  isExpired: boolean;
  expiresIn30Days: boolean;
  daysToExpiry: number;
  priceHistory: MedicalStockPriceHistoryItem[];
};

export type MedicalStockGroupedItem = {
  id: string;
  medicineName: string;
  totalQuantity: number;
  batchCount: number;
  latestPurchasePrice: number;
  latestSellingPrice: number;
  earliestExpiryDate: string;
  vendorNames: string[];
  isLowStock: boolean;
  isExpired: boolean;
  expiresIn30Days: boolean;
  daysToExpiry: number;
  batches: MedicalStockBatchItem[];
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
  items: MedicalStockGroupedItem[];
};

export type ListMedicalStockResponse = {
  success: boolean;
  items: MedicalStockGroupedItem[];
};