import { NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

type CsvRow = Record<string, string>;

function parseAmount(value: string | undefined) {
  if (!value) return 0;
  const cleaned = String(value).replace(/[₹,\s]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function getValue(row: CsvRow, keys: string[]) {
  const normalizedKeys = Object.keys(row);

  for (const key of keys) {
    const foundKey = normalizedKeys.find(
      (k) => k.toLowerCase().trim() === key.toLowerCase().trim()
    );

    if (foundKey) return row[foundKey];
  }

  return "";
}

function parseDate(value: string) {
  if (!value) return new Date();

  const cleaned = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return new Date(cleaned);
  }

  if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(cleaned)) {
    const [dd, mm, yyyy] = cleaned.split(/[/-]/);
    return new Date(`${yyyy}-${mm}-${dd}`);
  }

  return new Date(cleaned);
}

export async function POST(req: Request) {
  try {
    const active = await requireActiveOrganization();
    const formData = await req.formData();

    const file = formData.get("file");
    const bankName = String(formData.get("bankName") || "Bank");
    const accountNumber = String(formData.get("accountNumber") || "");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "CSV file required" },
        { status: 400 }
      );
    }

    const csvText = await file.text();

    const parsed = Papa.parse<CsvRow>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      return NextResponse.json(
        { success: false, error: "Invalid CSV format" },
        { status: 400 }
      );
    }

    const rows = parsed.data;

    const statement = await prisma.$transaction(async (tx) => {
      const createdStatement = await tx.bankStatement.create({
        data: {
          organizationId: active.organizationId,
          bankName,
          accountNumber: accountNumber || null,
          fileName: file.name,
        },
      });

      await tx.bankTransaction.createMany({
        data: rows.map((row) => {
          const dateValue = getValue(row, [
            "Date",
            "Transaction Date",
            "Txn Date",
            "Value Date",
          ]);

          const description = getValue(row, [
            "Description",
            "Narration",
            "Particulars",
            "Details",
          ]);

          const reference = getValue(row, [
            "Reference",
            "Ref",
            "UTR",
            "Cheque No",
            "Transaction ID",
          ]);

          const debit =
            parseAmount(getValue(row, ["Debit", "Withdrawal", "Dr"])) ||
            0;

          const credit =
            parseAmount(getValue(row, ["Credit", "Deposit", "Cr"])) ||
            0;

          const balance =
            parseAmount(getValue(row, ["Balance", "Closing Balance"])) || null;

          return {
            organizationId: active.organizationId,
            bankStatementId: createdStatement.id,
            transactionDate: parseDate(dateValue),
            description: description || "Bank Transaction",
            reference: reference || null,
            debit,
            credit,
            balance,
          };
        }),
      });

      return createdStatement;
    });

    return NextResponse.json({
      success: true,
      data: statement,
      importedRows: rows.length,
    });
  } catch (error) {
    console.error("BANK_CSV_IMPORT_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to import bank statement" },
      { status: 500 }
    );
  }
}