// route.ts – UPI parser API

import { NextResponse } from "next/server";

function cleanText(text: string) {
  return text.replace(/\r/g, "\n").replace(/[|]/g, " ").trim();
}

function normalizeAmountToken(value: string) {
  let v = value
    .replace(/[Oo]/g, "0")
    .replace(/[₹RsINRrsinr\s]/g, "")
    .replace(/[^\d.,]/g, "")
    .replace(/,/g, "");

  if (v.length >= 5 && v.startsWith("21")) v = v.slice(1);
  if (v.length >= 4 && v.startsWith("2") && Number(v.slice(1)) <= 9999) {
    v = v.slice(1);
  }

  const amount = Number(v);
  return Number.isFinite(amount) ? amount : 0;
}

function isBadAmountLine(line: string) {
  return /utr|transaction|transact|reference|ref|id|account|xxxx|bank|axis|sent to|debited from|powered/i.test(
    line
  );
}

function isDateLine(line: string) {
  return /jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|date|am|pm|2024|2025|2026|2027/i.test(
    line
  );
}

function extractAmount(text: string) {
  const lines = cleanText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  // 1. Currency symbol / OCR-confused currency
  for (const line of lines) {
    if (isBadAmountLine(line)) continue;

    const match =
      line.match(/[₹₹¥₨]\s*([0-9Oo]{1,3}(?:,[0-9Oo]{3})*(?:\.\d{1,2})?)/i) ||
      line.match(/\b(?:rs|inr)\.?\s*([0-9Oo]{1,7}(?:\.\d{1,2})?)/i) ||
      line.match(/\b[Ee]\s*([0-9]{1,7}(?:\.\d{1,2})?)\b/);

    if (match?.[1]) {
      const amount = normalizeAmountToken(match[1]);
      if (amount > 0 && amount < 10000000) return amount;
    }
  }

  // 2. Plain number near amount area
  for (const line of lines) {
    if (isBadAmountLine(line) || isDateLine(line)) continue;

    const moneyLike =
      line.match(/\b([0-9]{1,3},[0-9]{3}(?:\.\d{1,2})?)\b/) ||
      line.match(/\b([0-9]{2,7}(?:\.\d{1,2})?)\b/);

    if (moneyLike?.[1]) {
      const amount = normalizeAmountToken(moneyLike[1]);

      if (
        amount > 0 &&
        amount < 10000000 &&
        amount !== 17 &&
        amount !== 23 &&
        amount !== 2026 &&
        amount !== 2025 &&
        amount !== 2024
      ) {
        return amount;
      }
    }
  }

  // 3. Vendor line fallback: "Dilli Korada E35"
  for (const line of lines) {
    if (isBadAmountLine(line) || isDateLine(line)) continue;

    const match = line.match(/\b[A-Za-z][A-Za-z ]+\s+[Ee]\s*([0-9]{1,7})\b/);
    if (match?.[1]) {
      const amount = Number(match[1]);
      if (amount > 0 && amount < 10000000) return amount;
    }
  }

  return 0;
}

function extractUpiReference(text: string) {
  // Look for UTR, UPI, or Ref (with or without colon)
  const match =
    text.match(/UTR[:\s]*([0-9]{8,20})/i) ||
    text.match(/UPI[:\s]*([0-9]{8,20})/i) ||
    text.match(/Reference[:\s]*([0-9]{8,20})/i) ||
    text.match(/Ref[:\s]*([0-9]{8,20})/i);          // catch "Ref. 945198437898"

  return match?.[1] || "";
}

function extractDate(text: string) {
  const match =
    text.match(/\b(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b/) ||
    text.match(/\b(\d{2}[/-]\d{2}[/-]\d{4})\b/);

  return match?.[1] || "";
}

function extractVendor(text: string) {
  const lines = cleanText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const paidIndex = lines.findIndex((line) => /paid to|sent to/i.test(line));

  if (paidIndex !== -1) {
    for (let i = paidIndex + 1; i < Math.min(lines.length, paidIndex + 5); i++) {
      const line = lines[i];

      if (
        line &&
        !/xxxx|utr|upi|bank|transaction|debited|amount|₹|rs|inr/i.test(line)
      ) {
        return line.replace(/\b[Ee]\s*\d+\b/g, "").trim();
      }
    }
  }

  const possible = lines.find(
    (line) =>
      /[A-Za-z]{3,}/.test(line) &&
      !/transaction|transfer|details|debited|sent|paid|utr|bank|axis|powered|successful/i.test(
        line
      )
  );

  return possible?.replace(/\b[Ee]\s*\d+\b/g, "").trim() || "UPI Payment";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = String(body.text || "");

    if (!text.trim()) {
      return NextResponse.json(
        { success: false, error: "OCR text is empty" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        vendor: extractVendor(text),
        amount: extractAmount(text),
        // ✅ KEY FIX: renamed to upiRef to match frontend
        upiRef: extractUpiReference(text),
        date: extractDate(text),
        rawText: text,
      },
    });
  } catch (error) {
    console.error("UPI_PARSE_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to parse UPI screenshot" },
      { status: 500 }
    );
  }
}