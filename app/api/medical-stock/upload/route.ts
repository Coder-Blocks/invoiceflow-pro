import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "medical-stock");
const EXCEL_DIR = path.join(process.cwd(), "public", "uploads", "medical-stock", "excel");

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

function slugifyFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function toNumber(value: string | number | undefined | null) {
  const num = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(num) ? num : 0;
}

function normalizeExpiry(value: string) {
  const v = String(value || "").trim();
  if (!v) return "";
  const mmYY = v.match(/^(\d{2})\/(\d{2})$/);
  if (mmYY) {
    const [, mm, yy] = mmYY;
    return `20${yy}-${mm}-01`;
  }
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

function extractVendorName(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const invoiceIndex = lines.findIndex((l) =>
    /GST INVOICE/i.test(l)
  );

  if (invoiceIndex >= 0) {
    for (let i = invoiceIndex + 1; i < Math.min(invoiceIndex + 8, lines.length); i++) {
      const line = lines[i];
      if (
        line &&
        !/Page|Food Lic|Bank|Account|IFSC|CIN|MSME|Duplicate Copy|A UNIT OF/i.test(line)
      ) {
        return line;
      }
    }
  }

  const capsLine = lines.find(
    (l) =>
      /^[A-Z0-9\s.&()/-]{8,}$/.test(l) &&
      !/GST INVOICE|DUPLICATE COPY|PAGE/i.test(l)
  );

  return capsLine || "";
}

function extractInvoiceNumber(text: string) {
  const match = text.match(/INV NO\.\s*:\s*([A-Z0-9\-\/]+)/i);
  return match?.[1]?.trim() || "";
}

function extractInvoiceDate(text: string) {
  const match = text.match(/INV DT\.\s*:\s*(\d{2}-\d{2}-\d{4})/i);
  if (!match?.[1]) return "";
  const [dd, mm, yyyy] = match[1].split("-");
  return `${yyyy}-${mm}-${dd}`;
}

function cleanMedicineName(name: string) {
  return name
    .replace(/\|\s*[\d.]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMedicalInvoiceText(text: string, billFileUrl: string): ParsedMedicineItem[] {
  if (!text.trim()) return [];

  const vendorName = extractVendorName(text);
  const invoiceNumber = extractInvoiceNumber(text);
  const invoiceDate = extractInvoiceDate(text);

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const items: ParsedMedicineItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const current = lines[i];
    const next = lines[i + 1] || "";

    const rowPattern = new RegExp(
      [
        "^",
        "(\\d+)",                         // sr
        "\\s+([\\d.]+)",                  // qty
        "\\s+([\\d.]+)",                  // sch/fqty maybe
        "\\s+(.+?)",                      // product + maybe pack
        "\\s+([A-Z0-9\\-]+)",             // mfg/batch edge
        "\\s+([A-Z0-9\\-/]+)",            // batch
        "\\s+(\\d{2}/\\d{2})",            // exp
        "\\s+([\\d.]+)",                  // mrp
        "\\s+([\\d.]+)",                  // rate
        "\\s+(\\d{8})",                   // hsn
        "\\s+([\\d.]+)",                  // gst
        "\\s+([\\d.]+)",                  // dis
        "\\s+([\\d.]+)",                  // value
        "$",
      ].join(""),
      "i"
    );

    const m = current.match(rowPattern);

    if (!m) continue;

    const qty = toNumber(m[2]);
    const productChunk = m[4];
    const batchNumber = m[6];
    const expiryDate = normalizeExpiry(m[7]);
    const mrp = toNumber(m[8]);
    const purchasePrice = toNumber(m[9]);
    const gstPercent = toNumber(m[11]);
    const discountPercent = toNumber(m[12]);
    const value = toNumber(m[13]);

    let medicineName = cleanMedicineName(productChunk);
    let pack = "";

    const packMatch = medicineName.match(
      /^(.+?)\s+((?:\d+(?:\.\d+)?\s*(?:ML|GM|MG|PCS|S|STRIP|BOX|BOTTLE|TAB|CAP|INJ|OINT|DROP|SYR|LIQUID|POWDER))+)$/i
    );

    if (packMatch) {
      medicineName = packMatch[1].trim();
      pack = packMatch[2].trim();
    }

    if (
      next &&
      !/^\d+\s+[\d.]+\s+[\d.]+\s+/.test(next) &&
      !/Gross Value|Net Value|GST Value|Total Items|Amount In Words/i.test(next)
    ) {
      medicineName = `${medicineName} ${next}`.replace(/\s+/g, " ").trim();
      i += 1;
    }

    items.push({
      medicineName,
      batchNumber,
      expiryDate,
      quantity: qty,
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

  const unique = items.filter((item, index, arr) => {
    const key = `${item.medicineName}|${item.batchNumber}|${item.expiryDate}|${item.value}`;
    return arr.findIndex((x) => `${x.medicineName}|${x.batchNumber}|${x.expiryDate}|${x.value}` === key) === index;
  });

  return unique;
}

async function generateExcelFile(items: ParsedMedicineItem[], originalName: string) {
  await fs.mkdir(EXCEL_DIR, { recursive: true });

  const exportRows =
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
      : [];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportRows.length ? exportRows : [
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
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Medical Bill");

  const excelName = `${Date.now()}-${slugifyFileName(originalName.replace(/\.[^.]+$/, ""))}.xlsx`;
  const excelPath = path.join(EXCEL_DIR, excelName);
  XLSX.writeFile(wb, excelPath);

  return `/uploads/medical-stock/excel/${excelName}`;
}

export async function POST(req: NextRequest) {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.mkdir(EXCEL_DIR, { recursive: true });

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const originalName = file.name || "upload";
    const lowerName = originalName.toLowerCase();
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

    const storedName = `${Date.now()}-${slugifyFileName(originalName)}`;
    const storedPath = path.join(UPLOAD_DIR, storedName);
    await fs.writeFile(storedPath, buffer);

    const billFileUrl = `/uploads/medical-stock/${storedName}`;

    let extractedText = "";
    if (isPdf) {
      extractedText = await extractTextFromPdf(buffer);
    } else if (isImage) {
      extractedText = await extractTextFromImage(buffer);
    }

    const parsedItems = extractedText
      ? parseMedicalInvoiceText(extractedText, billFileUrl)
      : [];

    const excelUrl = await generateExcelFile(parsedItems, originalName);

    const message =
      parsedItems.length > 0
        ? "Bill uploaded, parsed, and Excel generated successfully."
        : "Bill uploaded safely. Parsing failed or unsupported format. Excel template still generated and manual entry can continue.";

    return NextResponse.json({
      success: true,
      fileUrl: billFileUrl,
      fileKind: isPdf ? "pdf" : "image",
      excelUrl,
      parsedItems,
      extractedText: extractedText ? extractedText.slice(0, 3000) : "",
      message,
    });
  } catch (error) {
    console.error("Medical stock upload error:", error);
    return NextResponse.json(
      {
        error:
          "Upload failed, but the module is safe. Please use manual entry and Excel download.",
      },
      { status: 500 }
    );
  }
}