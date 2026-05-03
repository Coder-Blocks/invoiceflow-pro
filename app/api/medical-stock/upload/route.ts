import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  manufacturer: string;
  freeQty: number;
  billIssueDate: string;
  billAmount: number;
  totalIncGst: number;
  hsn: string;
};

function cleanLine(line: string): string {
  return String(line || "")
    .replace(/\u00A0/g, " ")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(value: unknown): number {
  const cleaned = String(value ?? "").replace(/[^\d.-]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function normalizeExpiry(value: string): string {
  const m = String(value || "").trim().match(/^(\d{2})\/(\d{2})$/);
  if (!m) return "";
  return `20${m[2]}-${m[1]}-01`;
}

function normalizeInvoiceDate(value: string): string {
  const m = String(value || "").trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return "";
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function extractVendorName(text: string): string {
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const gstIndex = lines.findIndex((l) => /GST INVOICE/i.test(l));

  if (gstIndex >= 0) {
    for (let i = gstIndex + 1; i < Math.min(lines.length, gstIndex + 8); i++) {
      const line = lines[i];
      if (
        line &&
        !/Duplicate Copy|Page|Bank|IFSC|CIN|A UNIT OF|Food Lic/i.test(line)
      ) {
        return line;
      }
    }
  }

  return lines.find((l) => /PVT LTD|LIMITED/i.test(l)) || "";
}

function extractInvoiceNumber(text: string): string {
  return (
    text.match(/INV NO\.\s*:\s*([A-Z0-9/-]+)/i)?.[1]?.trim() ||
    text.match(/Invoice\s*No\.?\s*:\s*([A-Z0-9/-]+)/i)?.[1]?.trim() ||
    ""
  );
}

function extractInvoiceDate(text: string): string {
  const raw =
    text.match(/INV DT\.\s*:\s*(\d{2}-\d{2}-\d{4})/i)?.[1] ||
    text.match(/Invoice\s*Date\s*:\s*(\d{2}-\d{2}-\d{4})/i)?.[1] ||
    "";
  return normalizeInvoiceDate(raw);
}

function extractGrandTotal(text: string): number {
  const raw =
    text.match(/Grand Total\s*:?\s*([\d,]+\.\d+|[\d,]+)/i)?.[1] ||
    text.match(/Bill Amount\s*:?\s*([\d,]+\.\d+|[\d,]+)/i)?.[1] ||
    "";
  return toNumber(raw);
}

async function optimizeImage(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer)
    .rotate()
    .resize({ width: 1800, withoutEnlargement: true })
    .png({ quality: 100, compressionLevel: 6 })
    .toBuffer();
}

async function callOcrSpaceImage(buffer: Buffer, filename: string) {
  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) {
    throw new Error("OCR_SPACE_API_KEY missing in environment.");
  }

  const optimizedBuffer = await optimizeImage(buffer);
  const blob = new Blob([new Uint8Array(optimizedBuffer)], {
    type: "image/png",
  });

  const form = new FormData();
  form.append("file", blob, filename);
  form.append("language", "eng");
  form.append("isOverlayRequired", "false");
  form.append("scale", "true");
  form.append("isTable", "true");
  form.append("OCREngine", "2");

  const res = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: { apikey: apiKey },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`OCR API failed with status ${res.status}`);
  }

  return await res.json();
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdfParseModule = await import("pdf-parse");
    const pdfParse = (pdfParseModule as any).default || pdfParseModule;
    const result = await pdfParse(buffer);
    return result?.text || "";
  } catch (error) {
    console.error("pdf-parse failed:", error);
    return "";
  }
}

function splitBlocks(text: string): string[] {
  const normalized = cleanLine(text);
  const matches = [...normalized.matchAll(/(?:^|\s)(\d+)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)(?=\s)/g)];

  if (matches.length === 0) return [];

  const starts = matches.map((m) => m.index ?? 0);
  const blocks: string[] = [];

  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1] : normalized.length;
    const block = normalized.slice(start, end).trim();
    if (block) blocks.push(block);
  }

  return blocks;
}

function detectPack(tokens: string[]): { pack: string; restTokens: string[] } {
  if (tokens.length === 0) {
    return { pack: "", restTokens: [] };
  }

  const t0 = tokens[0] || "";
  const t1 = tokens[1] || "";

  const unitWords = ["ML", "GM", "MG", "PCS", "STRIP", "BOX", "BOTTLE", "TAB", "CAP", "INJ", "OINT", "DROP", "SYR", "LIQUID", "S"];

  if (/^\d+(?:\.\d+)?(?:ML|GM|MG)$/i.test(t0)) {
    return { pack: t0, restTokens: tokens.slice(1) };
  }

  if (/^\d+(?:\.\d+)?$/i.test(t0) && unitWords.includes(t1.toUpperCase())) {
    return { pack: `${t0} ${t1}`, restTokens: tokens.slice(2) };
  }

  if (/^\d+[A-Z]$/i.test(t0) && unitWords.includes(t1.toUpperCase())) {
    return { pack: `${t0} ${t1}`, restTokens: tokens.slice(2) };
  }

  if (/^\d+[A-Z]+$/i.test(t0) && unitWords.includes(t1.toUpperCase())) {
    return { pack: `${t0} ${t1}`, restTokens: tokens.slice(2) };
  }

  return { pack: "", restTokens: tokens };
}

function parseInvoiceBlock(
  block: string,
  vendorName: string,
  invoiceNumber: string,
  invoiceDate: string,
  grandTotal: number,
  billFileUrl: string
): ParsedMedicineItem | null {
  const start = block.match(/^(\d+)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)(?:\s+(.+))?$/);
  if (!start) return null;

  const quantity = toNumber(start[2]);
  const freeQty = toNumber(start[3]);
  const rest = cleanLine(start[4] || "");

  if (!rest) return null;

  const tokens = rest.split(" ");
  const { pack, restTokens } = detectPack(tokens);

  if (restTokens.length < 10) return null;

  const expiryIdx = restTokens.findIndex((t) => /^\d{2}\/\d{2}$/.test(t));
  if (expiryIdx < 3) return null;

  const batchNumber = restTokens[expiryIdx - 1];
  const after = restTokens.slice(expiryIdx + 1);

  if (after.length < 6) return null;

  const mrp = toNumber(after[0]);
  const purchasePrice = toNumber(after[1]);
  const hsn = String(after[2] || "").trim();
  const gstPercent = toNumber(after[3]);
  const discountPercent = toNumber(after[4]);
  const value = toNumber(after[5]);

  const beforeBatch = restTokens.slice(0, expiryIdx - 1);

  let medicineName = "";
  let manufacturer = "";

  const pipeIndex = beforeBatch.indexOf("|");

  if (pipeIndex >= 0) {
    medicineName = beforeBatch.slice(0, pipeIndex).join(" ").trim();
    manufacturer = beforeBatch.slice(pipeIndex + 2).join(" ").trim();
  } else {
    if (beforeBatch.length >= 3) {
      manufacturer = beforeBatch.slice(-2).join(" ").trim();
      medicineName = beforeBatch.slice(0, -2).join(" ").trim();

      if (!medicineName) {
        manufacturer = beforeBatch.slice(-1).join(" ").trim();
        medicineName = beforeBatch.slice(0, -1).join(" ").trim();
      }
    } else {
      medicineName = beforeBatch.join(" ").trim();
      manufacturer = "";
    }
  }

  medicineName = medicineName.replace(/\s+/g, " ").trim();
  manufacturer = manufacturer.replace(/\s+/g, " ").trim();

  if (!medicineName || !batchNumber || !hsn) return null;

  return {
    medicineName,
    batchNumber,
    expiryDate: normalizeExpiry(restTokens[expiryIdx]),
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
    manufacturer,
    freeQty,
    billIssueDate: invoiceDate,
    billAmount: grandTotal,
    totalIncGst: value,
    hsn,
  };
}

function parseMedicalInvoiceText(text: string, billFileUrl: string): ParsedMedicineItem[] {
  const vendorName = extractVendorName(text);
  const invoiceNumber = extractInvoiceNumber(text);
  const invoiceDate = extractInvoiceDate(text);
  const grandTotal = extractGrandTotal(text);

  const blocks = splitBlocks(text);
  const items: ParsedMedicineItem[] = [];

  for (const block of blocks) {
    const parsed = parseInvoiceBlock(
      block,
      vendorName,
      invoiceNumber,
      invoiceDate,
      grandTotal,
      billFileUrl
    );
    if (parsed) items.push(parsed);
  }

  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.medicineName}|${item.batchNumber}|${item.expiryDate}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildExcelBase64(items: ParsedMedicineItem[], rawText: string): string {
  const wb = XLSX.utils.book_new();

  const rows =
    items.length > 0
      ? items.map((item) => ({
          Quantity: item.quantity,
          "Free Qty": item.freeQty,
          Pack: item.pack,
          Manufacturer: item.manufacturer,
          "Batch Number": item.batchNumber,
          "Expiry Date": item.expiryDate,
          "Medicine Cost": item.purchasePrice,
          MRP: item.mrp,
          HSN: item.hsn,
          "GST %": item.gstPercent,
          Discount: item.discountPercent,
          "Bill Issue Date": item.billIssueDate,
          "Bill Amount": item.billAmount,
          "Total Inc GST": item.totalIncGst,
          Medicine: item.medicineName,
          "Vendor Name": item.vendorName,
          "Invoice Number": item.invoiceNumber,
          "Invoice Date": item.invoiceDate,
          "Selling Price": item.sellingPrice,
          "Bill File URL": item.billFileUrl,
        }))
      : [{ Message: "No rows parsed" }];

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(rows),
    "Medical Purchase Bill"
  );

  const rawRows = rawText
    ? rawText.split(/\r?\n/).map((line, index) => ({
        Line: index + 1,
        Text: line,
      }))
    : [{ Line: 1, Text: "No text extracted" }];

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rawRows), "Raw Text");

  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return out.toString("base64");
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
        { error: "Only image and PDF files are allowed." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let parsedText = "";
    const fileKind: "image" | "pdf" = isPdf ? "pdf" : "image";

    if (isImage) {
      const ocrData = await callOcrSpaceImage(buffer, file.name);
      parsedText = Array.isArray(ocrData?.ParsedResults)
        ? ocrData.ParsedResults.map((r: any) => r?.ParsedText || "").join("\n")
        : "";
    } else {
      parsedText = await extractPdfText(buffer);
    }

    const parsedItems = parsedText ? parseMedicalInvoiceText(parsedText, file.name) : [];
    const excelBase64 = buildExcelBase64(parsedItems, parsedText);

    return NextResponse.json({
      success: true,
      fileKind,
      originalFileName: file.name,
      parsedItems,
      parsedCount: parsedItems.length,
      excelBase64,
      excelFileName: `${file.name.replace(/\.[^.]+$/, "")}-medical-purchase-bill.xlsx`,
      extractedText: parsedText.slice(0, 6000),
      message:
        parsedItems.length > 0
          ? `Bill parsed successfully. ${parsedItems.length} items found.`
          : isPdf
          ? "PDF uploaded successfully, but no medicine rows could be parsed."
          : "Image OCR finished, but no medicine rows could be parsed.",
    });
  } catch (error) {
    console.error("Medical stock upload error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Upload failed while processing the bill.",
      },
      { status: 500 }
    );
  }
}