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
  return line.replace(/\s+/g, " ").replace(/\|\s*/g, " ").trim();
}

function toNumber(value: string | number | undefined | null): number {
  const cleaned = String(value ?? "").replace(/[^\d.-]/g, "");
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

  const gstIndex = lines.findIndex((l) => /GST INVOICE/i.test(l));
  if (gstIndex >= 0) {
    for (let i = gstIndex + 1; i < Math.min(gstIndex + 10, lines.length); i++) {
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

function extractGrandTotal(text: string): number {
  const match = text.match(/Grand Total\s*:\s*([\d,]+\.\d{2}|[\d,]+)/i);
  return match ? toNumber(match[1]) : 0;
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
  const uint8 = new Uint8Array(optimizedBuffer);
  const blob = new Blob([uint8], { type: "image/png" });

  const form = new FormData();
  form.append("file", blob, filename);
  form.append("language", "eng");
  form.append("isOverlayRequired", "false");
  form.append("scale", "true");
  form.append("isTable", "true");
  form.append("OCREngine", "2");

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

function isItemStartLine(line: string): boolean {
  return /^\d+\s+[\d.]+\s+[\d.]+/.test(line);
}

function isDetailLine(line: string): boolean {
  return /\b[A-Z0-9-]{4,}\b\s+\d{2}\/\d{2}\s+[\d.]+\s+[\d.]+\s+\d{8}\s+[\d.]+\s+[\d.]+\s+[\d.]+$/i.test(
    line
  );
}

function isNoiseLine(line: string): boolean {
  return (
    !line ||
    /Qty\.|Pack|Batch No\.|Exp\.Dt\.|Gross Value|Disc\. Value|Net Value|GST Value|Amount In Words|IGST|SGST|CGST|Taxable|Total Items|PhonePe|Outstanding|Remarks|Authorised Signatory|Jurisdiction|SVMPL QR|Outs :|Rounding|TCS AMT|DN\. Value/i.test(
      line
    )
  );
}

function parseDetailLine(line: string) {
  const tokens = cleanLine(line).split(/\s+/);

  const expiryIdx = tokens.findIndex((t) => /^\d{2}\/\d{2}$/.test(t));
  if (expiryIdx < 2) return null;

  const batchNumber = tokens[expiryIdx - 1];
  const manufacturer = tokens.slice(3, expiryIdx - 1).join(" ").trim();

  const after = tokens.slice(expiryIdx + 1);
  if (after.length < 6) return null;

  return {
    manufacturer,
    batchNumber,
    expiryDate: normalizeExpiry(tokens[expiryIdx]),
    mrp: toNumber(after[0]),
    purchasePrice: toNumber(after[1]),
    hsn: String(after[2] || ""),
    gstPercent: toNumber(after[3]),
    discountPercent: toNumber(after[4]),
    value: toNumber(after[5]),
  };
}

function parseStartAndNameLines(
  firstLine: string,
  extraNameLines: string[]
): {
  srNo: number;
  quantity: number;
  freeQty: number;
  pack: string;
  medicineName: string;
  oldMrpOrShownValue: number;
} | null {
  const cleanedFirst = cleanLine(firstLine);

  const m = cleanedFirst.match(/^(\d+)\s+([\d.]+)\s+([\d.]+)\s+(.+)$/);
  if (!m) return null;

  const srNo = toNumber(m[1]);
  const quantity = toNumber(m[2]);
  const freeQty = toNumber(m[3]);
  let rest = m[4].trim();

  const packMatch = rest.match(
    /^((?:\d+(?:\.\d+)?)\s*(?:ML|GM|MG|PCS|STRIP|BOX|BOTTLE|TAB|CAP|INJ|OINT|DROP|SYR|LIQUID|S))\s+(.+)$/i
  );

  let pack = "";
  let namePart = rest;

  if (packMatch) {
    pack = packMatch[1].trim();
    namePart = packMatch[2].trim();
  }

  const allNameText = [namePart, ...extraNameLines.map(cleanLine)]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  let medicineName = allNameText;
  let oldMrpOrShownValue = 0;

  const oldMrpMatch = medicineName.match(/\|\s*([\d.]+)\s*$/);
  if (oldMrpMatch) {
    oldMrpOrShownValue = toNumber(oldMrpMatch[1]);
    medicineName = medicineName.replace(/\|\s*[\d.]+\s*$/, "").trim();
  }

  return {
    srNo,
    quantity,
    freeQty,
    pack,
    medicineName,
    oldMrpOrShownValue,
  };
}

function parseMedicalInvoiceText(text: string, billFileUrl: string): ParsedMedicineItem[] {
  const vendorName = extractVendorName(text);
  const invoiceNumber = extractInvoiceNumber(text);
  const invoiceDate = extractInvoiceDate(text);
  const grandTotal = extractGrandTotal(text);

  const lines = text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);

  const items: ParsedMedicineItem[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (!isItemStartLine(line)) {
      i++;
      continue;
    }

    const firstLine = line;
    const nameLines: string[] = [];
    let detailLine = "";

    let j = i + 1;
    while (j < lines.length) {
      const nextLine = lines[j];

      if (isNoiseLine(nextLine)) {
        break;
      }

      if (isItemStartLine(nextLine) && nameLines.length === 0 && !detailLine) {
        break;
      }

      if (isDetailLine(nextLine)) {
        detailLine = nextLine;
        j++;
        break;
      }

      nameLines.push(nextLine);
      j++;
    }

    if (!detailLine) {
      i = j;
      continue;
    }

    const startData = parseStartAndNameLines(firstLine, nameLines);
    const detailData = parseDetailLine(detailLine);

    if (startData && detailData && startData.medicineName) {
      items.push({
        medicineName: startData.medicineName.substring(0, 200),
        batchNumber: detailData.batchNumber,
        expiryDate: detailData.expiryDate,
        quantity: startData.quantity,
        purchasePrice: detailData.purchasePrice,
        sellingPrice: detailData.mrp || detailData.purchasePrice,
        vendorName,
        invoiceNumber,
        invoiceDate,
        pack: startData.pack,
        mrp: detailData.mrp,
        gstPercent: detailData.gstPercent,
        discountPercent: detailData.discountPercent,
        value: detailData.value,
        billFileUrl,
        manufacturer: detailData.manufacturer,
        freeQty: startData.freeQty,
        billIssueDate: invoiceDate,
        billAmount: grandTotal,
        totalIncGst: detailData.value,
        hsn: detailData.hsn,
      });
    }

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

  const stockRows =
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
          "Medicine Name": item.medicineName,
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
            "Medicine Name": "",
            "Vendor Name": "",
            "Invoice Number": "",
            "Invoice Date": "",
            "Selling Price": "",
            "Bill File URL": "",
          },
        ];

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(stockRows),
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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let parsedText = "";
    let fileKind: "image" | "pdf" = isPdf ? "pdf" : "image";

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