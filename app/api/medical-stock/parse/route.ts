import { NextResponse } from "next/server";

function n(value?: string) {
  if (!value) return 0;
  return Number(value.replace(/,/g, "")) || 0;
}

function date(value?: string) {
  if (!value) return new Date().toISOString().slice(0, 10);

  const v = value.trim();

  if (/^\d{2}-\d{2}-\d{4}$/.test(v)) {
    const [dd, mm, yyyy] = v.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
    const [dd, mm, yyyy] = v.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }

  if (/^\d{2}\/\d{2}$/.test(v)) {
    const [mm, yy] = v.split("/");
    return `20${yy}-${mm}-01`;
  }

  return new Date().toISOString().slice(0, 10);
}

function extractBillDate(text: string) {
  const match = text.match(/INV\s*DT\.?\s*:\s*(\d{2}-\d{2}-\d{4})/i);
  return date(match?.[1]);
}

function extractTotal(text: string) {
  const match =
    text.match(/Grand\s*Total\s*:?\s*([\d,]+(?:\.\d+)?)/i) ||
    text.match(/Total\s*:?\s*([\d,]+(?:\.\d+)?)/i);

  return n(match?.[1]);
}

function parseItems(text: string) {
  const t = text.replace(/\s+/g, " ").trim();

  const regex =
    /(\d{1,2})\s+([\d.]+)\s+([\d.]+)\s+(.+?)\s+([A-Z][A-Z0-9 .&-]{1,30})\s+([A-Z0-9-]{3,20})\s+(\d{2}\/\d{2})\s+([\d.]+)\s+([\d.]+)\s+(\d{6,10})\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/g;

  const items = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(t)) !== null) {
    const rawProduct = match[4].trim();
    const packMatch = rawProduct.match(/^([0-9A-Z. ]{1,15})\s+(.+)$/i);

    const pack = packMatch?.[1]?.trim() || "";
    const medicineName = packMatch?.[2]?.trim() || rawProduct;

    items.push({
      medicineName,
      quantity: n(match[2]),
      freeQty: n(match[3]),
      pack,
      batchNumber: match[6],
      expiryDate: date(match[7]),
      costPrice: n(match[9]),
      mrp: n(match[8]),
      gstRate: n(match[12]),
      discount: n(match[13]),
      totalAmount: n(match[14]),
      unitType: pack.toLowerCase().includes("ml") ? "BOTTLE" : "STRIP",
    });
  }

  return items;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = String(body.text || "");

    if (!text.trim()) {
      return NextResponse.json(
        { success: false, error: "Bill text empty" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        issueDate: extractBillDate(text),
        totalAmount: extractTotal(text),
        items: parseItems(text),
        rawText: text,
      },
    });
  } catch (error) {
    console.error("MEDICAL_PARSE_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to parse medical bill" },
      { status: 500 }
    );
  }
}