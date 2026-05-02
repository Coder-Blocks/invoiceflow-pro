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

function toNumber(value: string | number | undefined | null) {
  const cleaned = String(value ?? "").replace(/[^\d.]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function normalizeExpiry(value: string) {
  const v = String(value || "").trim();
  const mmYY = v.match(/^(\d{2})\/(\d{2})$/);
  if (mmYY) {
    const [, mm, yy] = mmYY;
    return `20${yy}-${mm}-01`;
  }
  return "";
}

function normalizeInvoiceDate(value: string) {
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

function extractVendorName(text: string) {
  const match =
    text.match(/GST INVOICE[\s\S]{0,500}?\n([A-Z0-9\s().,&/-]{8,})\n/i) ||
    text.match(/\n([A-Z0-9\s().,&/-]{8,}PVT LTD)\n/i) ||
    text.match(/\n([A-Z0-9\s().,&/-]{8,}LIMITED)\n/i);

  return match?.[1]?.replace(/\s+/g, " ").trim() || "";
}

function extractInvoiceNumber(text: string) {
  const match = text.match(/INV NO\.\s*:\s*([A-Z0-9/-]+)/i);
  return match?.[1]?.trim() || "";
}

function extractInvoiceDate(text: string) {
  const match = text.match(/INV DT\.\s*:\s*(\d{2}-\d{2}-\d{4})/i);
  return normalizeInvoiceDate(match?.[1] || "");
}

function isNoiseLine(line: string) {
  return (
    !line ||
    /GST INVOICE|Duplicate Copy|Page \d+ of \d+|Gross Value|Disc\. Value|Net Value|GST Value|Grand Total|Amount In Words|Total Items|Total Qty|Taxable|CGST|SGST|IGST|Remarks|PhonePe|Outs|Authorised Signatory|Jurisdiction|Print Time|Bank :|Account :|IFSC :|Mobile :|PAN No\.|GST No\.|D\.L\. No\.|Order No\.|Food Lic|MSME|CIN NO/i.test(
      line
    )
  );
}

function looksLikeDetailLine(line: string) {
  return /^\d+\s+[\d.]+\s+[\d.]+\s+.+\s+[A-Z0-9-]+\s+\d{2}\/\d{2}\s+[\d.]+\s+[\d.]+\s+\d{8}\s+[\d.]+\s+[\d.]+\s+[\d.]+$/i.test(
    line
  );
}

function derivePackAndMedicine(source: string) {
  let text = source.replace(/\|\s*[\d.]+/g, "").replace(/\s+/g, " ").trim();
  text = text.replace(/^[\d.]+\s+/, "").trim();

  const packMatch = text.match(
    /^((?:\d+(?:\.\d+)?)\s*(?:ML|GM|MG|PCS|S|STRIP|BOX|BOTTLE|TAB|CAP|INJ|OINT|DROP|SYR|LIQUID|POWDER|VIAL|AMP|KIT))\s+(.+)$/i
  );

  if (packMatch) {
    return {
      pack: packMatch[1].trim(),
      medicineName: packMatch[2].trim(),
    };
  }

  return {
    pack: "",
    medicineName: text.trim(),
  };
}

function parseMedicalInvoiceText(text: string, billFileUrl: string): ParsedMedicineItem[] {
  const vendorName = extractVendorName(text);
  const invoiceNumber = extractInvoiceNumber(text);
  const invoiceDate = extractInvoiceDate(text);

  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim());

  const lines = rawLines.filter(Boolean);

  const items: ParsedMedicineItem[] = [];
  let pendingDescription: string[] = [];

  for (const line of lines) {
    if (isNoiseLine(line)) {
      continue;
    }

    if (looksLikeDetailLine(line)) {
      const detailMatch = line.match(
        /^(\d+)\s+([\d.]+)\s+([\d.]+)\s+(.+?)\s+([A-Z0-9-]+)\s+(\d{2}\/\d{2})\s+([\d.]+)\s+([\d.]+)\s+(\d{8})\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)$/i
      );

      if (!detailMatch) {
        pendingDescription = [];
        continue;
      }

      const qty = toNumber(detailMatch[2]);
      const inlineLeft = detailMatch[4].trim();
      const batchNumber = detailMatch[5].trim();
      const expiryDate = normalizeExpiry(detailMatch[6]);
      const mrp = toNumber(detailMatch[7]);
      const purchasePrice = toNumber(detailMatch[8]);
      const gstPercent = toNumber(detailMatch[10]);
      const discountPercent = toNumber(detailMatch[11]);
      const value = toNumber(detailMatch[12]);

      const descriptionSource =
        pendingDescription
          .filter((x) => !/^\|\s*[\d.]+$/.test(x))
          .join(" ")
          .trim() || inlineLeft;

      const { pack, medicineName } = derivePackAndMedicine(descriptionSource);

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

      pendingDescription = [];
      continue;
    }

    pendingDescription.push(line);
  }

  return items.filter(
    (item, index, arr) =>
      item.medicineName &&
      arr.findIndex(
        (x) =>
          x.medicineName === item.medicineName &&
          x.batchNumber === item.batchNumber &&
          x.expiryDate === item.expiryDate &&
          x.value === item.value
      ) === index
  );
}

function buildExcelBase64(items: ParsedMedicineItem[]) {
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
      excelBase64,
      excelFileName: `${file.name.replace(/\.[^.]+$/, "")}-medical-stock.xlsx`,
      extractedText: extractedText.slice(0, 4000),
      message:
        parsedItems.length > 0
          ? "Bill parsed successfully and Excel prepared."
          : "Bill uploaded safely. Parsing failed, but manual entry and Excel template are available.",
    });
  } catch (error) {
    console.error("Medical stock upload error:", error);
    return NextResponse.json(
      {
        error: "Upload failed while processing the bill.",
      },
      { status: 500 }
    );
  }
}