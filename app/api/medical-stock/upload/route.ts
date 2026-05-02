import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

type ParsedMedicineItem = {
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  pack: string;
  mrp: number;
  gstPercent: number;
  discountPercent: number;
  value: number;
  billFileUrl: string;
};

function cleanLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

function toNumber(value: string | number | undefined | null): number {
  const cleaned = String(value ?? "").replace(/[^\d.]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function normalizeExpiry(value: string): string {
  const v = String(value || "").trim();
  const mmYY = v.match(/^(\d{2})\/(\d{2})$/);
  if (mmYY) {
    const [, mm, yy] = mmYY;
    return `20${yy}-${mm}-01`;
  }
  return "";
}

function normalizeInvoiceDate(value: string): string {
  const v = String(value || "").trim();
  const ddmmyyyy = v.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    return `${yyyy}-${mm}-${dd}`;
  }
  return "";
}

function extractVendorName(text: string): string {
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);

  const gstInvoiceIndex = lines.findIndex((l) => /GST INVOICE/i.test(l));
  if (gstInvoiceIndex >= 0) {
    for (let i = gstInvoiceIndex + 1; i < Math.min(gstInvoiceIndex + 10, lines.length); i++) {
      const line = lines[i];
      if (
        line &&
        !/Duplicate Copy|Page|Food Lic|Bank|Account|IFSC|CIN|MSME|A UNIT OF/i.test(line)
      ) {
        return line;
      }
    }
  }

  const fallback = lines.find((l) => /PVT LTD|LIMITED/i.test(l));
  return fallback || "";
}

function extractInvoiceNumber(text: string): string {
  const match = text.match(/INV NO\.\s*:\s*([A-Z0-9/-]+)/i);
  return match?.[1]?.trim() || "";
}

function extractInvoiceDate(text: string): string {
  const match = text.match(/INV DT\.\s*:\s*(\d{2}-\d{2}-\d{4})/i);
  return normalizeInvoiceDate(match?.[1] || "");
}

function buildExcelBase64(items: ParsedMedicineItem[]): string {
  const rows =
    items.length > 0
      ? items.map((item) => ({
          "Vendor Name": item.vendorName,
          "Invoice Number": item.invoiceNumber,
          "Invoice Date": item.invoiceDate,
          "Medicine Name": item.medicineName,
          Pack: item.pack,
          "Batch Number": item.batchNumber,
          "Expiry Date": item.expiryDate,
          Quantity: item.quantity,
          MRP: item.mrp,
          "Purchase Price": item.purchasePrice,
          "Selling Price": item.sellingPrice,
          "GST %": item.gstPercent,
          "Discount %": item.discountPercent,
          Value: item.value,
          "Bill File URL": item.billFileUrl,
        }))
      : [
          {
            "Vendor Name": "",
            "Invoice Number": "",
            "Invoice Date": "",
            "Medicine Name": "",
            Pack: "",
            "Batch Number": "",
            "Expiry Date": "",
            Quantity: "",
            MRP: "",
            "Purchase Price": "",
            "Selling Price": "",
            "GST %": "",
            "Discount %": "",
            Value: "",
            "Bill File URL": "",
          },
        ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Medical Stock");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return buffer.toString("base64");
}

async function callOcrSpace(file: File) {
  const apiKey = process.env.OCR_SPACE_API_KEY;

  if (!apiKey) {
    throw new Error("OCR_SPACE_API_KEY is missing in environment variables.");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("language", "eng");
  form.append("isOverlayRequired", "false");
  form.append("scale", "true");
  form.append("isTable", "true");
  form.append("OCREngine", "3");
  form.append("filetype", file.type === "application/pdf" ? "PDF" : "JPG");

  const res = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: {
      apikey: apiKey,
    },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`OCR API failed with status ${res.status}`);
  }

  const data = await res.json();
  return data;
}

function parseMarkdownTable(text: string, billFileUrl: string): ParsedMedicineItem[] {
  const vendorName = extractVendorName(text);
  const invoiceNumber = extractInvoiceNumber(text);
  const invoiceDate = extractInvoiceDate(text);

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const tableLines = lines.filter((l) => l.startsWith("|") && l.endsWith("|"));
  if (tableLines.length < 3) return [];

  const rows: ParsedMedicineItem[] = [];

  for (const line of tableLines) {
    if (
      /Sr|Qty|FQty|Pack|Product Description|Mfg|Batch|Exp|MRP|Rate|HSN|GST|Dis|Value/i.test(
        line
      )
    ) {
      continue;
    }

    if (/^\|?\s*-+\s*\|/.test(line)) {
      continue;
    }

    const cols = line
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (cols.length < 13) continue;

    const sr = cols[0];
    if (!/^\d+$/.test(sr)) continue;

    const quantity = toNumber(cols[1]);
    const pack = cols[3] || "";
    const medicineName = cols[4] || "";
    const batchNumber = cols[6] || "";
    const expiryDate = normalizeExpiry(cols[7] || "");
    const mrp = toNumber(cols[8]);
    const purchasePrice = toNumber(cols[9]);
    const gstPercent = toNumber(cols[11]);
    const discountPercent = toNumber(cols[12]);
    const value = toNumber(cols[13]);

    if (!medicineName || !batchNumber) continue;

    rows.push({
      medicineName,
      batchNumber,
      expiryDate,
      quantity,
      purchasePrice,
      sellingPrice: mrp || purchasePrice,
      vendorName,
      invoiceNumber,
      invoiceDate,
      pack,
      mrp,
      gstPercent,
      discountPercent,
      value,
      billFileUrl,
    });
  }

  return rows;
}

function parseFlatTableLines(text: string, billFileUrl: string): ParsedMedicineItem[] {
  const vendorName = extractVendorName(text);
  const invoiceNumber = extractInvoiceNumber(text);
  const invoiceDate = extractInvoiceDate(text);

  const rawLines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const items: ParsedMedicineItem[] = [];

  for (const line of rawLines) {
    // Expected OCR-space table-ish line:
    // 1 1.00 0.00 30ML MONOCEF O CV 100 SYR ARISTO PHA CD25626 05/27 201.56 153.57 30042019 5 5.00 153.19
    const match = line.match(
      /^(\d+)\s+([\d.]+)\s+([\d.]+)\s+(.+?)\s+([A-Z0-9/-]{4,})\s+(\d{2}\/\d{2})\s+([\d.]+)\s+([\d.]+)\s+(\d{8})\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)$/
    );

    if (!match) continue;

    let left = match[4].trim();
    const batchNumber = match[5].trim();
    const expiryDate = normalizeExpiry(match[6].trim());
    const mrp = toNumber(match[7]);
    const purchasePrice = toNumber(match[8]);
    const gstPercent = toNumber(match[10]);
    const discountPercent = toNumber(match[11]);
    const value = toNumber(match[12]);
    const quantity = toNumber(match[2]);

    let pack = "";
    let medicineName = left;

    const packMatch =
      left.match(/^((?:\d+(?:\.\d+)?)\s*(?:ML|GM|MG|PCS|STRIP|BOX|BOTTLE|TAB|CAP|INJ|OINT|DROP|SYR|LIQUID|POWDER|S))\s+(.+)$/i) ||
      left.match(/^((?:\d+[A-Z]+)|(?:\d+\s+[A-Z]+))\s+(.+)$/i);

    if (packMatch) {
      pack = packMatch[1].trim();
      medicineName = packMatch[2].trim();
    }

    // remove likely manufacturer tail before batch
    medicineName = medicineName
      .replace(/\s+[A-Z]{2,}(?:\s+[A-Z]{2,}){0,2}$/i, "")
      .trim();

    if (!medicineName) continue;

    items.push({
      medicineName,
      batchNumber,
      expiryDate,
      quantity,
      purchasePrice,
      sellingPrice: mrp || purchasePrice,
      vendorName,
      invoiceNumber,
      invoiceDate,
      pack,
      mrp,
      gstPercent,
      discountPercent,
      value,
      billFileUrl,
    });
  }

  return items;
}

function parseMedicalInvoiceText(text: string, billFileUrl: string): ParsedMedicineItem[] {
  const markdownRows = parseMarkdownTable(text, billFileUrl);
  if (markdownRows.length > 0) return markdownRows;

  const flatRows = parseFlatTableLines(text, billFileUrl);
  if (flatRows.length > 0) return flatRows;

  return [];
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const lowerName = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");
    const isImage = file.type.startsWith("image/");

    if (!isPdf && !isImage) {
      return NextResponse.json(
        { error: "Only image and PDF files are allowed" },
        { status: 400 }
      );
    }

    const ocrData = await callOcrSpace(file);

    const parsedText = Array.isArray(ocrData?.ParsedResults)
      ? ocrData.ParsedResults.map((r: any) => r?.ParsedText || "").join("\n")
      : "";

    const billFileUrl = file.name;
    const parsedItems = parsedText
      ? parseMedicalInvoiceText(parsedText, billFileUrl)
      : [];

    const excelBase64 = buildExcelBase64(parsedItems);

    return NextResponse.json({
      success: true,
      fileKind: isPdf ? "pdf" : "image",
      originalFileName: file.name,
      parsedItems,
      parsedCount: parsedItems.length,
      excelBase64,
      excelFileName: `${file.name.replace(/\.[^.]+$/, "")}-medical-stock.xlsx`,
      extractedText: parsedText.slice(0, 5000),
      message:
        parsedItems.length > 0
          ? `Bill parsed successfully. ${parsedItems.length} items found.`
          : "OCR finished, but no medicine rows could be parsed.",
      ocrError:
        ocrData?.IsErroredOnProcessing || false,
      ocrMessages: ocrData?.ErrorMessage || [],
    });
  } catch (error) {
    console.error("Medical stock upload error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload failed while processing the bill.",
      },
      { status: 500 }
    );
  }
}