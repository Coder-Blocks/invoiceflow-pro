import type { MedicalStockRowInput } from "@/types/medical-stock";
import {
  cleanString,
  formatDateToISO,
  parseExpiryDateInput,
  safeInteger,
  safeNumber,
} from "@/lib/medical-stock/utils";

type ParseBillResult = {
  rows: MedicalStockRowInput[];
  parseStatus: "SUCCESS" | "FAILED" | "UNSUPPORTED";
  parseMessage: string;
};

function normalizeOcrText(rawText: string): string {
  return rawText
    .replace(/\r/g, "\n")
    .replace(/[|]/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function extractVendorName(text: string): string {
  const lines = normalizeOcrText(text)
    .split("\n")
    .map((line) => cleanString(line))
    .filter(Boolean)
    .slice(0, 12);

  const blocked = [
    "gst",
    "tax invoice",
    "invoice",
    "bill",
    "cash memo",
    "phone",
    "mobile",
    "email",
    "address",
    "drug licence",
    "license",
    "customer",
    "receipt",
  ];

  for (const line of lines) {
    const normalized = line.toLowerCase();
    const hasBlockedWord = blocked.some((word) => normalized.includes(word));
    const alphaChars = line.replace(/[^A-Za-z ]/g, "").trim().length;

    if (!hasBlockedWord && alphaChars >= 4) {
      return line;
    }
  }

  return "";
}

function findMatch(line: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match?.[1]) {
      return cleanString(match[1]);
    }
  }
  return "";
}

function extractExpiryValue(line: string): string {
  const patterns = [
    /\bexp(?:iry)?[:\s-]*([0-3]?\d[\/.-][01]?\d[\/.-]\d{2,4})/i,
    /\bexp(?:iry)?[:\s-]*([01]?\d[\/.-]\d{2,4})/i,
    /\b([0-3]?\d[\/.-][01]?\d[\/.-]\d{2,4})\b/,
    /\b([01]?\d[\/.-]\d{2,4})\b/,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match?.[1]) {
      const parsed = parseExpiryDateInput(match[1]);
      if (parsed) {
        return formatDateToISO(parsed);
      }
    }
  }

  return "";
}

function extractQuantity(line: string): number {
  const patterns = [
    /\bqty(?:uantity)?[:\s-]*(\d+(?:\.\d+)?)\b/i,
    /\bqnty[:\s-]*(\d+(?:\.\d+)?)\b/i,
    /\bpcs[:\s-]*(\d+(?:\.\d+)?)\b/i,
    /\bunits?[:\s-]*(\d+(?:\.\d+)?)\b/i,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match?.[1]) {
      return safeInteger(match[1], 0);
    }
  }

  const allNumbers = line.match(/\b\d+(?:\.\d+)?\b/g) ?? [];
  if (allNumbers.length >= 1) {
    const candidate = allNumbers[allNumbers.length - 1];
    return safeInteger(candidate, 0);
  }

  return 0;
}

function extractPrices(line: string): { purchasePrice: number; sellingPrice: number } {
  const purchasePatterns = [
    /\b(?:purchase|ptr|rate|cost|p\.?price)[:\s₹-]*(\d+(?:\.\d{1,2})?)\b/i,
  ];

  const sellingPatterns = [
    /\b(?:selling|sell|mrp|s\.?price)[:\s₹-]*(\d+(?:\.\d{1,2})?)\b/i,
  ];

  const purchase = safeNumber(findMatch(line, purchasePatterns.map((p) => new RegExp(p))), 0);
  const selling = safeNumber(findMatch(line, sellingPatterns.map((p) => new RegExp(p))), 0);

  if (purchase > 0 || selling > 0) {
    return {
      purchasePrice: purchase,
      sellingPrice: selling,
    };
  }

  const numericTokens = (line.match(/\b\d+(?:\.\d{1,2})?\b/g) ?? []).map((t) => safeNumber(t, 0));

  if (numericTokens.length >= 2) {
    const last = numericTokens[numericTokens.length - 1];
    const secondLast = numericTokens[numericTokens.length - 2];
    return {
      purchasePrice: secondLast,
      sellingPrice: last,
    };
  }

  if (numericTokens.length === 1) {
    return {
      purchasePrice: numericTokens[0],
      sellingPrice: numericTokens[0],
    };
  }

  return {
    purchasePrice: 0,
    sellingPrice: 0,
  };
}

function extractBatchNumber(line: string): string {
  const patterns = [
    /\b(?:batch|batch no|batch no\.|b\.?no|lot)[:\s-]*([A-Za-z0-9/-]+)\b/i,
  ];

  const direct = findMatch(line, patterns.map((p) => new RegExp(p)));
  if (direct) {
    return direct;
  }

  const generic = line.match(/\b[A-Za-z]{1,5}\d{2,}[A-Za-z0-9/-]*\b/);
  return generic?.[0] ? cleanString(generic[0]) : "";
}

function extractMedicineName(line: string): string {
  let working = ` ${line} `;

  const removablePatterns = [
    /\b(?:batch|batch no|batch no\.|b\.?no|lot)[:\s-]*[A-Za-z0-9/-]+\b/gi,
    /\bexp(?:iry)?[:\s-]*[0-3]?\d[\/.-][01]?\d[\/.-]\d{2,4}\b/gi,
    /\bexp(?:iry)?[:\s-]*[01]?\d[\/.-]\d{2,4}\b/gi,
    /\bqty(?:uantity)?[:\s-]*\d+(?:\.\d+)?\b/gi,
    /\bqnty[:\s-]*\d+(?:\.\d+)?\b/gi,
    /\bpcs[:\s-]*\d+(?:\.\d+)?\b/gi,
    /\bunits?[:\s-]*\d+(?:\.\d+)?\b/gi,
    /\b(?:purchase|ptr|rate|cost|p\.?price|selling|sell|mrp|s\.?price)[:\s₹-]*\d+(?:\.\d{1,2})?\b/gi,
    /\b\d+(?:\.\d{1,2})?\b/g,
  ];

  for (const pattern of removablePatterns) {
    working = working.replace(pattern, " ");
  }

  working = working.replace(/[^A-Za-z0-9+\-() ]/g, " ");
  working = cleanString(working);

  const lower = working.toLowerCase();
  const garbageWords = [
    "invoice",
    "gst",
    "total",
    "amount",
    "tax",
    "cgst",
    "sgst",
    "discount",
    "sub total",
    "balance",
  ];

  if (!working || garbageWords.some((word) => lower.includes(word))) {
    return "";
  }

  return working;
}

function lineLooksLikeMedicine(line: string): boolean {
  const lower = line.toLowerCase();
  const ignored = [
    "gst",
    "invoice",
    "total",
    "discount",
    "amount",
    "balance",
    "cgst",
    "sgst",
    "customer",
    "phone",
    "mobile",
    "address",
    "terms",
    "bank",
    "upi",
  ];

  if (ignored.some((word) => lower.includes(word))) {
    return false;
  }

  const hasAlpha = /[a-z]/i.test(line);
  const hasAnyNumber = /\d/.test(line);

  return hasAlpha && hasAnyNumber;
}

function parseMedicalRowsFromText(text: string): MedicalStockRowInput[] {
  const vendorName = extractVendorName(text);
  const lines = normalizeOcrText(text)
    .split("\n")
    .map((line) => cleanString(line))
    .filter(Boolean);

  const rows: MedicalStockRowInput[] = [];

  for (const line of lines) {
    if (!lineLooksLikeMedicine(line)) {
      continue;
    }

    const medicineName = extractMedicineName(line);
    const batchNumber = extractBatchNumber(line);
    const expiryDate = extractExpiryValue(line);
    const quantity = extractQuantity(line);
    const { purchasePrice, sellingPrice } = extractPrices(line);

    if (!medicineName || !batchNumber || !expiryDate) {
      continue;
    }

    rows.push({
      medicineName,
      batchNumber,
      expiryDate,
      quantity: quantity > 0 ? quantity : 0,
      purchasePrice,
      sellingPrice,
      vendorName,
      billFileUrl: null,
    });
  }

  const deduped = new Map<string, MedicalStockRowInput>();

  for (const row of rows) {
    const key = `${row.medicineName.toLowerCase()}__${row.batchNumber.toLowerCase()}`;
    if (!deduped.has(key)) {
      deduped.set(key, row);
      continue;
    }

    const existing = deduped.get(key)!;
    deduped.set(key, {
      ...existing,
      quantity: existing.quantity + row.quantity,
      purchasePrice: row.purchasePrice || existing.purchasePrice,
      sellingPrice: row.sellingPrice || existing.sellingPrice,
      vendorName: existing.vendorName || row.vendorName,
    });
  }

  return Array.from(deduped.values());
}

async function extractTextFromImage(buffer: Buffer): Promise<string> {
  const imported = await import("tesseract.js");
  const recognize =
    (imported as { recognize?: (input: Buffer, lang: string) => Promise<{ data: { text: string } }> }).recognize ??
    ((imported as { default?: { recognize?: (input: Buffer, lang: string) => Promise<{ data: { text: string } }> } }).default?.recognize);

  if (!recognize) {
    throw new Error("Image OCR engine is unavailable.");
  }

  const result = await recognize(buffer, "eng");
  return result?.data?.text ?? "";
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const imported = await import("pdf-parse");
  const pdfParse = ((imported as { default?: (input: Buffer) => Promise<{ text: string }> }).default ??
    (imported as unknown as (input: Buffer) => Promise<{ text: string }>));

  const result = await pdfParse(buffer);
  return result?.text ?? "";
}

export async function parseUploadedMedicalBill(params: {
  buffer: Buffer;
  mimeType: string;
}): Promise<ParseBillResult> {
  const { buffer, mimeType } = params;

  try {
    let rawText = "";

    if (mimeType === "application/pdf") {
      try {
        rawText = await extractTextFromPdf(buffer);
      } catch {
        return {
          rows: [],
          parseStatus: "UNSUPPORTED",
          parseMessage: "PDF uploaded successfully. Please enter medicine rows manually.",
        };
      }
    } else if (mimeType.startsWith("image/")) {
      try {
        rawText = await extractTextFromImage(buffer);
      } catch {
        return {
          rows: [],
          parseStatus: "FAILED",
          parseMessage: "Image uploaded successfully, but medicine extraction failed. Please enter rows manually.",
        };
      }
    } else {
      return {
        rows: [],
        parseStatus: "UNSUPPORTED",
        parseMessage: "Unsupported file type for parsing. Please enter medicine rows manually.",
      };
    }

    const rows = parseMedicalRowsFromText(rawText);

    if (rows.length === 0) {
      return {
        rows: [],
        parseStatus: mimeType === "application/pdf" ? "UNSUPPORTED" : "FAILED",
        parseMessage:
          mimeType === "application/pdf"
            ? "PDF uploaded successfully. Please enter medicine rows manually."
            : "Medicine extraction could not identify rows. Please enter medicine rows manually.",
      };
    }

    return {
      rows,
      parseStatus: "SUCCESS",
      parseMessage: "Bill uploaded and medicine rows extracted successfully.",
    };
  } catch {
    return {
      rows: [],
      parseStatus: "FAILED",
      parseMessage: "Bill uploaded successfully, but extraction failed. Please enter medicine rows manually.",
    };
  }
}