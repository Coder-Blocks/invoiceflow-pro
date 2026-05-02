import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

type ParsedMedicine = {
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  vendorName: string;
};

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "medical-stock");

function slugifyFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function normalizeDate(value: string) {
  const clean = value.trim();

  if (!clean) return "";

  const ddmmyyyy = clean.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    return `${yyyy}-${mm}-${dd}`;
  }

  const yyyymmdd = clean.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  if (yyyymmdd) {
    const [, yyyy, mm, dd] = yyyymmdd;
    return `${yyyy}-${mm}-${dd}`;
  }

  const mmyy = clean.match(/^(\d{2})[-/](\d{2,4})$/);
  if (mmyy) {
    const [, mm, yyRaw] = mmyy;
    const yyyy = yyRaw.length === 2 ? `20${yyRaw}` : yyRaw;
    return `${yyyy}-${mm}-01`;
  }

  return "";
}

function tryNumber(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseMedicineText(text: string): ParsedMedicine[] {
  if (!text || !text.trim()) return [];

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items: ParsedMedicine[] = [];

  for (const line of lines) {
    const normalized = line.replace(/\s+/g, " ").trim();

    const parts = normalized
      .split(/[|,;\t]{1,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length >= 7) {
      const medicineName = parts[0] || "";
      const batchNumber = parts[1] || "";
      const expiryDate = normalizeDate(parts[2] || "");
      const quantity = tryNumber(parts[3] || "");
      const purchasePrice = tryNumber(parts[4] || "");
      const sellingPrice = tryNumber(parts[5] || "");
      const vendorName = parts.slice(6).join(" ") || "";

      if (medicineName) {
        items.push({
          medicineName,
          batchNumber,
          expiryDate,
          quantity,
          purchasePrice,
          sellingPrice,
          vendorName,
        });
        continue;
      }
    }

    const loosePattern =
      /([A-Za-z0-9\s\-+()./]+?)\s+(?:batch[:\s-]*)?([A-Za-z0-9\-\/]+)?\s+(?:exp[:\s-]*)?(\d{2}[\/-]\d{2}(?:[\/-]\d{2,4})?|\d{4}[\/-]\d{2}[\/-]\d{2})?\s+qty[:\s-]*(\d+)?\s+(?:pp|purchase)[:\s-]*([\d.,]+)?\s+(?:sp|selling)[:\s-]*([\d.,]+)?\s+(.*)?/i;

    const match = normalized.match(loosePattern);
    if (match) {
      const medicineName = (match[1] || "").trim();
      if (medicineName) {
        items.push({
          medicineName,
          batchNumber: (match[2] || "").trim(),
          expiryDate: normalizeDate((match[3] || "").trim()),
          quantity: tryNumber(match[4] || ""),
          purchasePrice: tryNumber(match[5] || ""),
          sellingPrice: tryNumber(match[6] || ""),
          vendorName: (match[7] || "").trim(),
        });
      }
    }
  }

  const unique = items.filter((item, index, arr) => {
    const key = `${item.medicineName}|${item.batchNumber}|${item.expiryDate}|${item.vendorName}`;
    return arr.findIndex((x) => `${x.medicineName}|${x.batchNumber}|${x.expiryDate}|${x.vendorName}` === key) === index;
  });

  return unique.slice(0, 100);
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const pdfParseModule = await import("pdf-parse");
    const pdfParse = (pdfParseModule as any).default || pdfParseModule;
    const result = await pdfParse(buffer);
    return result?.text || "";
  } catch {
    return "";
  }
}

async function extractTextFromImage(buffer: Buffer): Promise<string> {
  try {
    const tesseractModule = await import("tesseract.js");
    const Tesseract = (tesseractModule as any).default || tesseractModule;
    const result = await Tesseract.recognize(buffer, "eng");
    return result?.data?.text || "";
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const originalName = file.name || "upload";
    const lowerName = originalName.toLowerCase();
    const isPdf =
      file.type === "application/pdf" || lowerName.endsWith(".pdf");
    const isImage = file.type.startsWith("image/");

    if (!isPdf && !isImage) {
      return NextResponse.json(
        { error: "Only image and PDF files are allowed" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileName = `${Date.now()}-${slugifyFileName(originalName)}`;
    const fullPath = path.join(UPLOAD_DIR, fileName);

    await fs.writeFile(fullPath, buffer);

    const fileUrl = `/uploads/medical-stock/${fileName}`;

    let extractedText = "";
    let parsedItems: ParsedMedicine[] = [];
    let parseMessage = "";

    if (isPdf) {
      extractedText = await extractTextFromPdf(buffer);
      if (extractedText) {
        parsedItems = parseMedicineText(extractedText);
        parseMessage =
          parsedItems.length > 0
            ? "PDF parsed successfully. Extracted items filled into table."
            : "PDF uploaded and preview is available. Parsing returned no structured items, so manual entry remains available.";
      } else {
        parseMessage =
          "PDF uploaded and preview is available. Parsing unsupported or failed, so manual entry remains available.";
      }
    } else if (isImage) {
      extractedText = await extractTextFromImage(buffer);
      if (extractedText) {
        parsedItems = parseMedicineText(extractedText);
        parseMessage =
          parsedItems.length > 0
            ? "Image OCR parsed successfully. Extracted items filled into table."
            : "Image uploaded and preview is available. OCR returned no structured items, so manual entry remains available.";
      } else {
        parseMessage =
          "Image uploaded and preview is available. OCR unavailable or failed, so manual entry remains available.";
      }
    }

    return NextResponse.json({
      success: true,
      fileUrl,
      fileKind: isPdf ? "pdf" : isImage ? "image" : "unknown",
      parsedItems,
      extractedText: extractedText ? extractedText.slice(0, 2000) : "",
      message: parseMessage || "File uploaded successfully.",
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