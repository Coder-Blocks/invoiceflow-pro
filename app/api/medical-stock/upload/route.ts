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
  return String(line || "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
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
  const idx = lines.findIndex((l) => /GST INVOICE/i.test(l));
  if (idx >= 0) {
    for (let i = idx + 1; i < Math.min(lines.length, idx + 8); i++) {
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
  return sharp(buffer)
    .rotate()
    .resize({ width: 1800, withoutEnlargement: true })
    .png({ quality: 100, compressionLevel: 6 })
    .toBuffer();
}

async function callOcrSpaceImage(buffer: Buffer, filename: string) {
  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) throw new Error("OCR_SPACE_API_KEY missing in environment.");

  const optimizedBuffer = await optimizeImage(buffer);
  const blob = new Blob([new Uint8Array(optimizedBuffer)], { type: "image/png" });

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

  return res.json();
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

// Core parser: works for the invoice text you showed
function parseMedicalInvoiceText(text: string, billFileUrl: string): ParsedMedicineItem[] {
  const vendorName = extractVendorName(text);
  const invoiceNumber = extractInvoiceNumber(text);
  const invoiceDate = extractInvoiceDate(text);
  const grandTotal = extractGrandTotal(text);

  const rawLines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const items: ParsedMedicineItem[] = [];

  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i];

    // Start line example:
    // 1 1.00 0.00 30ML
    const startMatch = line.match(/^(\d+)\s+([\d.]+)\s+([\d.]+)\s+(.+)$/);
    if (!startMatch) {
      i++;
      continue;
    }

    const quantity = toNumber(startMatch[2]);
    const freeQty = toNumber(startMatch[3]);
    const pack = startMatch[4].trim();

    // name line(s) come after start line until detail line
    const nameParts: string[] = [];
    let detailLine = "";
    let j = i + 1;

    while (j < rawLines.length) {
      const next = rawLines[j];

      // detail line ends with: batch expiry mrp rate hsn gst discount value
      if (/[A-Z0-9-]{3,}\s+\d{2}\/\d{2}\s+[\d.]+\s+[\d.]+\s+\d{8}\s+[\d.]+\s+[\d.]+\s+[\d.]+$/i.test(next)) {
        detailLine = next;
        j++;
        break;
      }

      // next item started
      if (/^\d+\s+[\d.]+\s+[\d.]+\s+/.test(next)) {
        break;
      }

      // ignore obvious noise
      if (!/Qty\.|Pack|Batch No\.|Exp\.Dt\.|Gross Value|Net Value|GST Value|Amount In Words|Outstanding|Remarks|Authorised Signatory|Total Items/i.test(next)) {
        nameParts.push(next);
      }

      j++;
    }

    if (!detailLine || nameParts.length === 0) {
      i++;
      continue;
    }

    let medicineName = nameParts.join(" ").replace(/\s+/g, " ").trim();
    let mrpFromName = 0;

    // Example: "ZERODOL SP TAB | 149.0"
    const pipeMatch = medicineName.match(/^(.*?)(?:\s*\|\s*([\d.]+))$/);
    if (pipeMatch) {
      medicineName = pipeMatch[1].trim();
      mrpFromName = toNumber(pipeMatch[2]);
    }

    const detailMatch = detailLine.match(
      /^(.*?)\s+([A-Z0-9-]{3,})\s+(\d{2}\/\d{2})\s+([\d.]+)\s+([\d.]+)\s+(\d{8})\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)$/i
    );

    if (!detailMatch) {
      i = j;
      continue;
    }

    const manufacturer = detailMatch[1].trim();
    const batchNumber = detailMatch[2].trim();
    const expiryDate = normalizeExpiry(detailMatch[3]);
    const mrp = toNumber(detailMatch[4]) || mrpFromName;
    const purchasePrice = toNumber(detailMatch[5]);
    const hsn = detailMatch[6].trim();
    const gstPercent = toNumber(detailMatch[7]);
    const discountPercent = toNumber(detailMatch[8]);
    const value = toNumber(detailMatch[9]);

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

    i = j;
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
      : [
          {
            Quantity: "",
            "Free Qty": "",
            Pack: "",
            Manufacturer: "",
            "Batch Number": "",
            "Expiry Date": "",
            "Medicine Cost": "",
            MRP: "",
            HSN: "",
            "GST %": "",
            Discount: "",
            "Bill Issue Date": "",
            "Bill Amount": "",
            "Total Inc GST": "",
            Medicine: "",
            "Vendor Name": "",
            "Invoice Number": "",
            "Invoice Date": "",
            "Selling Price": "",
            "Bill File URL": "",
          },
        ];

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(rows),
    "Medical Purchase Bill"
  );

  const rawRows = rawText
    ? rawText.split(/\r?\n/).map((line, index) => ({ Line: index + 1, Text: line }))
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