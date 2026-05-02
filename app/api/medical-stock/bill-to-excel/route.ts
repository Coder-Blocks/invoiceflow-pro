import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PdfWord = {
  x: number;
  y: number;
  text: string;
};

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function num(value?: string) {
  if (!value) return 0;
  return Number(value.replace(/[^\d.-]/g, "")) || 0;
}

function normalizeDate(value?: string) {
  if (!value) return "";

  const v = value.trim();

  if (/^\d{2}\/\d{2}$/.test(v)) {
    const [mm, yy] = v.split("/");
    return `20${yy}-${mm}-01`;
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(v)) {
    const [dd, mm, yyyy] = v.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
    const [dd, mm, yyyy] = v.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }

  return v;
}

function extractBillDate(text: string) {
  const match =
    text.match(/INV\s*DT\.?\s*:?\s*(\d{2}-\d{2}-\d{4})/i) ||
    text.match(/DATE\s*:?\s*(\d{2}-\d{2}-\d{4})/i) ||
    text.match(/DATE\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i);

  return normalizeDate(match?.[1]);
}

function extractBillAmount(text: string) {
  const match =
    text.match(/Grand\s*Total\s*:?\s*([\d,]+(?:\.\d+)?)/i) ||
    text.match(/Net\s*Amount\s*:?\s*([\d,]+(?:\.\d+)?)/i) ||
    text.match(/Total\s*:?\s*([\d,]+(?:\.\d+)?)/i);

  return num(match?.[1]);
}

async function extractPdfWords(filePath: string) {
  const PDFParser = (await import("pdf2json")).default;
  const pdfParser = new PDFParser(null, true);

  return await new Promise<{ words: PdfWord[]; fullText: string }>(
    (resolve, reject) => {
      pdfParser.on("pdfParser_dataError", (errData: any) => {
        reject(errData.parserError || errData);
      });

      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        const words: PdfWord[] = [];

        for (const page of pdfData?.Pages || []) {
          for (const textItem of page.Texts || []) {
            const raw = textItem.R?.[0]?.T || "";
            const text = clean(safeDecode(String(raw)));

            if (!text) continue;

            words.push({
              x: Number(textItem.x),
              y: Number(textItem.y),
              text,
            });
          }
        }

        const fullText = words
          .sort((a, b) => {
            if (Math.abs(a.y - b.y) < 0.2) return a.x - b.x;
            return a.y - b.y;
          })
          .map((w) => w.text)
          .join(" ");

        resolve({ words, fullText });
      });

      pdfParser.loadPDF(filePath);
    }
  );
}

async function extractImageText() {
  throw new Error("Image OCR is temporarily disabled. Please upload PDF bill.");
}

function groupByLine(words: PdfWord[]) {
  const sorted = [...words].sort((a, b) => {
    if (Math.abs(a.y - b.y) < 0.25) return a.x - b.x;
    return a.y - b.y;
  });

  const lines: PdfWord[][] = [];

  for (const word of sorted) {
    const found = lines.find((line) => Math.abs(line[0].y - word.y) < 0.25);

    if (found) found.push(word);
    else lines.push([word]);
  }

  return lines.map((line) => line.sort((a, b) => a.x - b.x));
}

function between(line: PdfWord[], minX: number, maxX: number) {
  return clean(
    line
      .filter((w) => w.x >= minX && w.x < maxX)
      .map((w) => w.text)
      .join(" ")
  );
}

function parsePdfRows(words: PdfWord[]) {
  const lines = groupByLine(words);
  const rows: any[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const full = line.map((w) => w.text).join(" ");

    if (/gross|grand|round|total|amount in words|terms|bank details/i.test(full)) break;

    const sr = between(line, 0, 1.1);

    if (!/^\d{1,2}$/.test(sr)) {
      if (rows.length > 0) {
        const continuation = between(line, 5.8, 12.0);

        if (continuation && !/batch|exp|mrp|rate|gross|grand|total/i.test(continuation)) {
          rows[rows.length - 1].medicineName = clean(
            `${rows[rows.length - 1].medicineName} ${continuation}`
          );
        }
      }
      continue;
    }

    const quantity = between(line, 1.1, 2.4);
    const freeQty = between(line, 2.4, 3.6);
    const pack = between(line, 3.6, 5.8);
    let product = between(line, 5.8, 12.0);
    const manufacturer = between(line, 12.0, 15.5);
    const batch = between(line, 15.5, 20.2);
    const expiry = between(line, 20.2, 22.3);
    const mrp = between(line, 22.3, 24.5);
    const rate = between(line, 24.5, 27.5);
    const hsn = between(line, 27.5, 31.0);
    const gst = between(line, 31.0, 32.3);
    const discount = between(line, 32.3, 34.5);
    const value = between(line, 34.5, 38.5);

    const nextLine = lines[i + 1];

    if (nextLine) {
      const nextSr = between(nextLine, 0, 1.1);
      const nextFull = nextLine.map((w) => w.text).join(" ");

      if (!/^\d{1,2}$/.test(nextSr) && !/gross|grand|total/i.test(nextFull)) {
        const continuation = between(nextLine, 5.8, 12.0);
        if (continuation) {
          product = clean(`${product} ${continuation}`);
          i++;
        }
      }
    }

    rows.push({
      srNo: Number(sr),
      medicineName: product,
      quantity: num(quantity),
      freeQty: num(freeQty),
      pack,
      manufacturer,
      batchNumber: batch,
      expiryDate: normalizeDate(expiry),
      medicineCost: num(rate),
      mrp: num(mrp),
      hsn,
      gstRate: num(gst),
      discount: num(discount),
      totalIncGst: num(value),
    });
  }

  return rows.filter((row) => row.srNo && row.medicineName && row.quantity > 0);
}

function parseImageTextRows(text: string) {
  const lines = text
    .split("\n")
    .map((line) => clean(line))
    .filter(Boolean);

  const rows: any[] = [];

  for (const line of lines) {
    if (/invoice|bill|gst|total|amount|date|phone|address|vendor|customer/i.test(line)) {
      continue;
    }

    const hasMedicineLikeText = /tab|cap|syr|inj|drop|cream|ointment|gel|ml|mg|gm|strip|pcs|bottle/i.test(line);
    const numbers = line.match(/\d+(?:\.\d+)?/g) || [];

    if (!hasMedicineLikeText || numbers.length < 2) continue;

    const batchMatch = line.match(/\b[A-Z0-9-]{4,15}\b/);
    const expiryMatch =
      line.match(/\b\d{2}\/\d{2}\b/) ||
      line.match(/\b\d{2}-\d{2}-\d{4}\b/) ||
      line.match(/\b\d{2}\/\d{2}\/\d{4}\b/);

    const qty = num(numbers[0]);
    const possibleCost = num(numbers[numbers.length - 1]);

    let medicineName = line;

    medicineName = medicineName
      .replace(batchMatch?.[0] || "", "")
      .replace(expiryMatch?.[0] || "", "")
      .replace(/\d+(?:\.\d+)?/g, "")
      .replace(/[|]/g, " ")
      .trim();

    if (!medicineName || medicineName.length < 3) continue;

    rows.push({
      srNo: rows.length + 1,
      medicineName,
      quantity: qty || 1,
      freeQty: 0,
      pack: "",
      manufacturer: "",
      batchNumber: batchMatch?.[0] || "",
      expiryDate: normalizeDate(expiryMatch?.[0]),
      medicineCost: possibleCost,
      mrp: 0,
      hsn: "",
      gstRate: 0,
      discount: 0,
      totalIncGst: possibleCost,
    });
  }

  return rows;
}

async function createExcel(params: {
  rows: any[];
  billIssueDate: string;
  billAmount: number;
  rawText: string;
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "InvoiceFlow Pro";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Medical Purchase Bill");

  sheet.columns = [
    { header: "Sr", key: "srNo", width: 8 },
    { header: "Medicine Name", key: "medicineName", width: 45 },
    { header: "Quantity", key: "quantity", width: 12 },
    { header: "Free Qty", key: "freeQty", width: 12 },
    { header: "Pack", key: "pack", width: 14 },
    { header: "Manufacturer", key: "manufacturer", width: 20 },
    { header: "Batch Number", key: "batchNumber", width: 18 },
    { header: "Expiry Date", key: "expiryDate", width: 15 },
    { header: "Medicine Cost", key: "medicineCost", width: 15 },
    { header: "MRP", key: "mrp", width: 12 },
    { header: "HSN", key: "hsn", width: 14 },
    { header: "GST %", key: "gstRate", width: 10 },
    { header: "Discount", key: "discount", width: 12 },
    { header: "Bill Issue Date", key: "billIssueDate", width: 16 },
    { header: "Bill Amount", key: "billAmount", width: 15 },
    { header: "Total INC GST", key: "totalIncGst", width: 16 },
  ];

  if (params.rows.length > 0) {
    params.rows.forEach((row) => {
      sheet.addRow({
        ...row,
        billIssueDate: params.billIssueDate,
        billAmount: params.billAmount,
      });
    });
  } else {
    sheet.addRow({
      medicineName: "Extraction failed. Please check Raw Text sheet.",
      billIssueDate: params.billIssueDate,
      billAmount: params.billAmount,
    });
  }

  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1D4ED8" },
  };

  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  const raw = workbook.addWorksheet("Raw Text");
  raw.columns = [{ header: "Raw Text", key: "text", width: 160 }];
  raw.addRow({ text: params.rawText });

  return workbook.xlsx.writeBuffer();
}

export async function POST(req: Request) {
  let tempPath = "";

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "No bill uploaded" }, { status: 400 });
    }

    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];

    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Upload PDF or image bill only" },
        { status: 400 }
      );
    }

    const tempDir = path.join(os.tmpdir(), "invoiceflow-medical-bills");
    await mkdir(tempDir, { recursive: true });

    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    tempPath = path.join(tempDir, `bill-${Date.now()}.${ext}`);

    await writeFile(tempPath, Buffer.from(await file.arrayBuffer()));

    let rawText = "";
    let rows: any[] = [];

    if (file.type === "application/pdf") {
      const { words, fullText } = await extractPdfWords(tempPath);
      rawText = fullText;
      rows = parsePdfRows(words);
    } else {
  throw new Error("Please upload PDF bill only. Image bill OCR will be added after launch.");
}

    const billIssueDate = extractBillDate(rawText);
    const billAmount = extractBillAmount(rawText);

    const buffer = await createExcel({
      rows,
      billIssueDate,
      billAmount,
      rawText,
    });

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="medical-purchase-bill-${Date.now()}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("BILL_TO_EXCEL_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to convert bill to Excel",
      },
      { status: 500 }
    );
  } finally {
    if (tempPath) {
      await unlink(tempPath).catch(() => {});
    }
  }
}