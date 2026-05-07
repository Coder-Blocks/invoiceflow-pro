export const MEDICAL_STOCK_LOW_STOCK_THRESHOLD = 10;
export const MEDICAL_STOCK_EXPIRY_WARNING_DAYS = 30;

export const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/pdf",
]);

export const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".pdf",
]);

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

export const MEDICAL_STOCK_EXPORT_HEADERS = [
  "Medicine Name",
  "Batch Number",
  "Expiry Date",
  "Quantity",
  "Purchase Price",
  "Selling Price",
  "Vendor Name",
  "Bill File URL",
];