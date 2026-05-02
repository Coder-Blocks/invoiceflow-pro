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

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const pdfParseModule = await import("pdf-parse");
    const pdfParse = (pdfParseModule as any).default || pdfParseModule;
    const result = await pdfParse(buffer);
    return result?.text || "";
  } catch (error) {
    console.error("PDF parse failed:", error);
    return "";
  }
}

async function extractTextFromImage(buffer: Buffer): Promise<string> {
  try {
    const tesseractModule = await import("tesseract.js");
    const Tesseract = (tesseractModule as any).default || tesseractModule;
    const result = await Tesseract.recognize(buffer, "eng");
    return result?.data?.text || "";
  } catch (error) {
    console.error("Image OCR failed:", error);
    return "";
  }
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

function isNoiseLine(line: string): boolean {
  return (
    !line ||
    /Qty\. Pack Batch No\. Exp\.Dt\. MRP Product Description|Old MRP Rate HSN GST|GST INVOICE|Duplicate Copy|Page \d+ of \d+|Gross Value|Disc\. Value|Net Value|GST Value|Grand Total|Amount In Words|Total Items|Total Qty|Taxable|CGST|SGST|IGST|Remarks|PhonePe|Outs :|Authorised Signatory|Jurisdiction|Print Time|Bank :|Account :|IFSC :|Mobile :|PAN No\.|GST No\.|D\.L\. No\.|Order No\.|Food Lic|MSME|CIN NO|WE HEREBY|INTEREST AT|Subject to|Last 5 Payment|SVMPL QR|CUS000|TELANGANA|HYDERABAD|KUKATPALLY|PRAGATI NAGAR/i.test(
      line
    )
  );
}

function isAmountOnlyLine(line: string): boolean {
  return /^\|?\s*[\d.]+\s*$/.test(line);
}

function looksLikeDetailLine(line: string): boolean {
  // example:
  // 1 0.00 ARISTO PHA CD25626 05/27 201.56 153.57 30042019 5 5.00 153.19
  const parts = line.split(/\s+/);
  const expIndex = parts.findIndex((p) => /^\d{2}\/\d{2}$/.test(p));
  if (expIndex < 2) return false;

  const tail = parts.slice(expIndex + 1);
  if (tail.length < 6) return false;

  return /^\d{8}$/.test(tail[2] || "");
}

function parseDetailLine(line: string) {
  const parts = line.split(/\s+/);
  const expIndex = parts.findIndex((p) => /^\d{2}\/\d{2}$/.test(p));
  if (expIndex < 2) return null;

  const tail = parts.slice(expIndex + 1);
  if (tail.length < 6) return null;
  if (!/^\d{8}$/.test(tail[2] || "")) return null;

  return {
    batchNumber: parts[expIndex - 1],
    expiryDate: normalizeExpiry(parts[expIndex]),
    mrp: toNumber(tail[0]),
    purchasePrice: toNumber(tail[1]),
    gstPercent: toNumber(tail[3]),
    discountPercent: toNumber(tail[4]),
    value: toNumber(tail[5]),
  };
}

function cleanupDescription(text: string): string {
  return text.replace(/\|\s*[\d.]+/g, " ").replace(/\s+/g, " ").trim();
}

function parseDescriptionBlock(descLines: string[]) {
  const text = cleanupDescription(descLines.join(" "));
  // examples:
  // 1.00 30ML MONOCEF O CV 100 SYR
  // 6.00 0.00 10 PCS CIPZEN D TAB
  // 30.00 200 ML PROLYTE ORS APPLE LIQUID 200 ML
  let medicineName = text;
  let quantity = 0;
  let pack = "";

  const qtyMatch = medicineName.match(/^(\d+(?:\.\d+)?)\s+(.*)$/);
  if (qtyMatch) {
    quantity = toNumber(qtyMatch[1]);
    medicineName = qtyMatch[2].trim();
  }

  // sometimes second token is free qty like 0.00
  const freeQtyMatch = medicineName.match(/^(\d+(?:\.\d+)?)\s+(.*)$/);
  if (freeQtyMatch && toNumber(freeQtyMatch[1]) <= quantity) {
    medicineName = freeQtyMatch[2].trim();
  }

  const packStartMatch = medicineName.match(
    /^((?:\d+(?:\.\d+)?)\s*(?:ML|GM|MG|PCS|S|STRIP|BOX|BOTTLE|TAB|CAP|INJ|OINT|DROP|SYR|LIQUID|POWDER|VIAL|AMP|KIT))\s+(.+)$/i
  );
  if (packStartMatch) {
    pack = packStartMatch[1].trim();
    medicineName = packStartMatch[2].trim();
  } else {
    const packInlineMatch = medicineName.match(
      /^((?:\d+(?:\.\d+)?)\s+[A-Z]+)\s+(.+)$/i
    );
    if (packInlineMatch) {
      pack = packInlineMatch[1].trim();
      medicineName = packInlineMatch[2].trim();
    }
  }

  return {
    quantity,
    pack,
    medicineName: medicineName.trim(),
  };
}

function parseMedicalInvoiceText(text: string, billFileUrl: string): ParsedMedicineItem[] {
  const vendorName = extractVendorName(text);
  const invoiceNumber = extractInvoiceNumber(text);
  const invoiceDate = extractInvoiceDate(text);

  const lines = text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);

  const items: ParsedMedicineItem[] = [];
  let descBuffer: string[] = [];

  for (const line of lines) {
    if (isNoiseLine(line)) continue;
    if (isAmountOnlyLine(line)) continue;

    if (looksLikeDetailLine(line)) {
      const detail = parseDetailLine(line);
      if (!detail) {
        descBuffer = [];
        continue;
      }

      const parsedDesc = parseDescriptionBlock(descBuffer);

      if (parsedDesc.medicineName) {
        items.push({
          medicineName: parsedDesc.medicineName,
          batchNumber: detail.batchNumber,
          expiryDate: detail.expiryDate,
          quantity: parsedDesc.quantity,
          purchasePrice: detail.purchasePrice,
          sellingPrice: detail.mrp || detail.purchasePrice,
          vendorName,
          invoiceNumber,
          invoiceDate,
          pack: parsedDesc.pack,
          mrp: detail.mrp,
          gstPercent: detail.gstPercent,
          discountPercent: detail.discountPercent,
          value: detail.value,
          billFileUrl,
        });
      }

      descBuffer = [];
      continue;
    }

    descBuffer.push(line);
  }

  return items.filter(
    (item, index, arr) =>
      item.medicineName &&
      item.quantity > 0 &&
      arr.findIndex(
        (x) =>
          x.medicineName === item.medicineName &&
          x.batchNumber === item.batchNumber &&
          x.expiryDate === item.expiryDate &&
          x.value === item.value
      ) === index
  );
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

  const buffer = XLSX.write(wb, {
    type: "buffer",
    bookType: "xlsx",
  });

  return buffer.toString("base64");
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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let extractedText = "";
    if (isPdf) {
      extractedText = await extractTextFromPdf(buffer);
    } else {
      extractedText = await extractTextFromImage(buffer);
    }

    const billFileUrl = file.name;
    const parsedItems = extractedText
      ? parseMedicalInvoiceText(extractedText, billFileUrl)
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
      extractedText: extractedText.slice(0, 4000),
      message:
        parsedItems.length > 0
          ? `Bill parsed successfully. ${parsedItems.length} items found.`
          : "Bill uploaded safely, but no medicine rows could be parsed.",
    });
  } catch (error) {
    console.error("Medical stock upload error:", error);
    return NextResponse.json(
      { error: "Upload failed while processing the bill." },
      { status: 500 }
    );
  }
}