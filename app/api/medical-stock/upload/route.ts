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
    .replace(/\t/g, " ")
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
        !/Duplicate Copy|Page|Bank|IFSC|CIN|A UNIT OF|Food Lic|MSME|Account/i.test(
          line
        )
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

async function callOcrSpace(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  isImage: boolean
) {
  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) {
    return null;
  }

  const finalBuffer = isImage ? await optimizeImage(buffer) : buffer;
  const finalMime = isImage ? "image/png" : mimeType || "application/pdf";
  const uploadName = isImage
    ? filename.replace(/\.[^.]+$/, "") + ".png"
    : filename;

  const blob = new Blob([new Uint8Array(finalBuffer)], { type: finalMime });

  const form = new FormData();
  form.append("file", blob, uploadName);
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

function uniqueItems(items: ParsedMedicineItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.medicineName}|${item.batchNumber}|${item.expiryDate}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Parser 1:
 * Works when PDF/OCR returns line-by-line rows
 */
function parseMedicalInvoiceFromLines(
  text: string,
  billFileUrl: string
): ParsedMedicineItem[] {
  const vendorName = extractVendorName(text);
  const invoiceNumber = extractInvoiceNumber(text);
  const invoiceDate = extractInvoiceDate(text);
  const grandTotal = extractGrandTotal(text);

  const lines = text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);

  const items: ParsedMedicineItem[] = [];

  const isStartLine = (line: string) =>
    /^\d+\s+[\d.]+\s+[\d.]+(?:\s+.+)?$/.test(line);

  const isDetailLine = (line: string) =>
    /[A-Z0-9-]{3,}\s+\d{2}\/\d{2}\s+[\d.]+\s+[\d.]+\s+\d{8}\s+[\d.]+\s+[\d.]+\s+[\d.]+$/i.test(
      line
    );

  const isNoiseLine = (line: string) =>
    /Qty\.|Pack|Batch No\.|Exp\.Dt\.|Gross Value|Net Value|GST Value|Amount In Words|Outstanding|Remarks|Authorised Signatory|Total Items|PhonePe|Jurisdiction|Taxable|IGST|SGST|CGST|DN\. Value|Outs :|Rounding|TCS AMT/i.test(
      line
    );

  function detectPack(tokens: string[]) {
    if (tokens.length === 0) return { pack: "", restTokens: [] as string[] };

    const t0 = tokens[0] || "";
    const t1 = tokens[1] || "";
    const unitWords = [
      "ML",
      "GM",
      "MG",
      "PCS",
      "STRIP",
      "BOX",
      "BOTTLE",
      "TAB",
      "CAP",
      "INJ",
      "OINT",
      "DROP",
      "SYR",
      "LIQUID",
      "S",
    ];

    if (/^\d+(?:\.\d+)?(?:ML|GM|MG)$/i.test(t0)) {
      return { pack: t0, restTokens: tokens.slice(1) };
    }

    if (/^\d+(?:\.\d+)?$/i.test(t0) && unitWords.includes(t1.toUpperCase())) {
      return { pack: `${t0} ${t1}`, restTokens: tokens.slice(2) };
    }

    return { pack: "", restTokens: tokens };
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!isStartLine(line)) continue;

    const startMatch = line.match(/^(\d+)\s+([\d.]+)\s+([\d.]+)(?:\s+(.*))?$/);
    if (!startMatch) continue;

    const quantity = toNumber(startMatch[2]);
    const freeQty = toNumber(startMatch[3]);
    const startRest = cleanLine(startMatch[4] || "");

    const nameLines: string[] = [];
    if (startRest) nameLines.push(startRest);

    let detailLine = "";
    let j = i + 1;

    while (j < lines.length) {
      const next = lines[j];

      if (isDetailLine(next)) {
        detailLine = next;
        break;
      }

      if (isStartLine(next)) {
        break;
      }

      if (!isNoiseLine(next)) {
        nameLines.push(next);
      }

      j++;
    }

    if (!detailLine) continue;

    const detailMatch = detailLine.match(
      /^(.*?)\s+([A-Z0-9-]{3,})\s+(\d{2}\/\d{2})\s+([\d.]+)\s+([\d.]+)\s+(\d{8})\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)$/i
    );

    if (!detailMatch) continue;

    const detailManufacturer = detailMatch[1].trim();
    const batchNumber = detailMatch[2].trim();
    const expiryDate = normalizeExpiry(detailMatch[3]);
    const mrp = toNumber(detailMatch[4]);
    const purchasePrice = toNumber(detailMatch[5]);
    const hsn = detailMatch[6].trim();
    const gstPercent = toNumber(detailMatch[7]);
    const discountPercent = toNumber(detailMatch[8]);
    const value = toNumber(detailMatch[9]);

    const joinedName = nameLines.join(" ").replace(/\s+/g, " ").trim();
    const pipeParts = joinedName.split("|").map((p) => cleanLine(p)).filter(Boolean);

    const leftPart = pipeParts[0] || joinedName;
    const rightPart = pipeParts[1] || "";

    const leftTokens = leftPart.split(" ").filter(Boolean);
    const { pack, restTokens } = detectPack(leftTokens);
    const medicineName = restTokens.join(" ").trim();
    const manufacturer = rightPart || detailManufacturer;

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
      manufacturer,
      freeQty,
      billIssueDate: invoiceDate,
      billAmount: grandTotal,
      totalIncGst: value,
      hsn,
    });
  }

  return uniqueItems(items);
}

/**
 * Parser 2:
 * Works when entire PDF text comes flattened into one paragraph
 */
function parseMedicalInvoiceFromFlatText(
  text: string,
  billFileUrl: string
): ParsedMedicineItem[] {
  const vendorName = extractVendorName(text);
  const invoiceNumber = extractInvoiceNumber(text);
  const invoiceDate = extractInvoiceDate(text);
  const grandTotal = extractGrandTotal(text);

  const normalized = cleanLine(text);
  if (!normalized) return [];

  const blockRegex =
    /(?:^|\s)(\d+)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(.+?)\s+([A-Z0-9-]{3,})\s+(\d{2}\/\d{2})\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d{8})\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)(?=\s+\d+\s+\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s+|$)/g;

  const items: ParsedMedicineItem[] = [];
  const unitWords = [
    "ML",
    "GM",
    "MG",
    "PCS",
    "STRIP",
    "BOX",
    "BOTTLE",
    "TAB",
    "CAP",
    "INJ",
    "OINT",
    "DROP",
    "SYR",
    "LIQUID",
    "S",
  ];

  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(normalized)) !== null) {
    const quantity = toNumber(match[2]);
    const freeQty = toNumber(match[3]);
    const mixed = cleanLine(match[4]);
    const batchNumber = match[5];
    const expiryDate = normalizeExpiry(match[6]);
    const mrp = toNumber(match[7]);
    const purchasePrice = toNumber(match[8]);
    const hsn = match[9];
    const gstPercent = toNumber(match[10]);
    const discountPercent = toNumber(match[11]);
    const value = toNumber(match[12]);

    let pack = "";
    let medicineName = mixed;
    let manufacturer = "";

    const parts = mixed.split("|").map((p) => cleanLine(p)).filter(Boolean);
    const leftPart = parts[0] || mixed;
    const rightPart = parts[1] || "";

    const leftTokens = leftPart.split(" ").filter(Boolean);

    if (/^\d+(?:\.\d+)?(?:ML|GM|MG)$/i.test(leftTokens[0] || "")) {
      pack = leftTokens[0];
      medicineName = leftTokens.slice(1).join(" ").trim();
    } else if (
      /^\d+(?:\.\d+)?$/i.test(leftTokens[0] || "") &&
      unitWords.includes((leftTokens[1] || "").toUpperCase())
    ) {
      pack = `${leftTokens[0]} ${leftTokens[1]}`;
      medicineName = leftTokens.slice(2).join(" ").trim();
    } else {
      medicineName = leftPart;
    }

    manufacturer = rightPart;

    if (!manufacturer) {
      const possible = medicineName.split(" ");
      if (possible.length > 3) {
        manufacturer = possible.slice(-2).join(" ");
      }
    }

    medicineName = medicineName.replace(/\s+/g, " ").trim();

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
      manufacturer,
      freeQty,
      billIssueDate: invoiceDate,
      billAmount: grandTotal,
      totalIncGst: value,
      hsn,
    });
  }

  return uniqueItems(items);
}

function parseMedicalInvoiceText(
  text: string,
  billFileUrl: string
): ParsedMedicineItem[] {
  const fromLines = parseMedicalInvoiceFromLines(text, billFileUrl);
  if (fromLines.length > 0) return fromLines;

  const fromFlat = parseMedicalInvoiceFromFlatText(text, billFileUrl);
  return fromFlat;
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

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(rawRows),
    "Raw Text"
  );

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

    // 1) Try native extraction for PDF
    if (isPdf) {
      parsedText = await extractPdfText(buffer);
    }

    // 2) OCR fallback for image OR empty-PDF-text
    if (!parsedText) {
      const ocrData = await callOcrSpace(
        buffer,
        file.name,
        file.type || (isPdf ? "application/pdf" : "image/png"),
        isImage
      );

      parsedText = Array.isArray(ocrData?.ParsedResults)
        ? ocrData.ParsedResults.map((r: any) => r?.ParsedText || "").join("\n")
        : "";
    }

    const parsedItems = parsedText
      ? parseMedicalInvoiceText(parsedText, file.name)
      : [];

    const excelBase64 = buildExcelBase64(parsedItems, parsedText);

    return NextResponse.json({
      success: true,
      fileKind,
      originalFileName: file.name,
      parsedItems,
      parsedCount: parsedItems.length,
      excelBase64,
      excelFileName: `${file.name.replace(
        /\.[^.]+$/,
        ""
      )}-medical-purchase-bill.xlsx`,
      extractedText: parsedText.slice(0, 10000),
      message:
        parsedItems.length > 0
          ? `Bill parsed successfully. ${parsedItems.length} items found.`
          : "Bill uploaded, but no medicine rows could be parsed.",
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