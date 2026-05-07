import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { MEDICAL_STOCK_EXPORT_HEADERS } from "@/lib/medical-stock/constants";
import { getMedicalStockRowsByOrganization, mapMedicalStockRow } from "@/lib/medical-stock/db";
import { resolveOrganizationIdFromRequest } from "@/lib/medical-stock/organization";
import { exportMedicalStockSchema } from "@/lib/medical-stock/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WorkbookRowInput = {
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  vendorName: string;
  billFileUrl?: string | null;
};

function buildWorkbookRows(rows: WorkbookRowInput[]) {
  return rows.map((row) => ({
    "Medicine Name": row.medicineName,
    "Batch Number": row.batchNumber,
    "Expiry Date": row.expiryDate,
    Quantity: row.quantity,
    "Purchase Price": row.purchasePrice,
    "Selling Price": row.sellingPrice,
    "Vendor Name": row.vendorName,
    "Bill File URL": row.billFileUrl ?? "",
  }));
}

export async function POST(request: NextRequest) {
  try {
    const json = (await request.json()) as Record<string, unknown>;
    const organizationId = await resolveOrganizationIdFromRequest(request, { jsonBody: json });

    const parsed = exportMedicalStockSchema.safeParse({
      ...json,
      organizationId: organizationId ?? json.organizationId,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message ?? "Invalid export request.",
        },
        { status: 400 },
      );
    }

    const { rows, filename } = parsed.data;

    const workbook = XLSX.utils.book_new();
    const sheetRows = buildWorkbookRows(
      rows.map((row) => ({
        medicineName: row.medicineName,
        batchNumber: row.batchNumber,
        expiryDate: row.expiryDate,
        quantity: row.quantity,
        purchasePrice: row.purchasePrice,
        sellingPrice: row.sellingPrice,
        vendorName: row.vendorName,
        billFileUrl: row.billFileUrl ?? null,
      })),
    );

    const worksheet = XLSX.utils.json_to_sheet(sheetRows, {
      header: MEDICAL_STOCK_EXPORT_HEADERS,
    });

    worksheet["!cols"] = [
      { wch: 28 },
      { wch: 18 },
      { wch: 16 },
      { wch: 12 },
      { wch: 16 },
      { wch: 16 },
      { wch: 24 },
      { wch: 40 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Medical Stock");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const safeFileName = `${filename?.trim() || "medical-stock-export"}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeFileName}"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate Excel export.";

    return NextResponse.json(
      { success: false, message },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const organizationId = await resolveOrganizationIdFromRequest(request);

    if (!organizationId) {
      return NextResponse.json(
        { success: false, message: "Unable to detect workspace organization." },
        { status: 400 },
      );
    }

    const rows = await getMedicalStockRowsByOrganization(organizationId);
    const items = rows.map(mapMedicalStockRow);

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(buildWorkbookRows(items), {
      header: MEDICAL_STOCK_EXPORT_HEADERS,
    });

    worksheet["!cols"] = [
      { wch: 28 },
      { wch: 18 },
      { wch: 16 },
      { wch: 12 },
      { wch: 16 },
      { wch: 16 },
      { wch: 24 },
      { wch: 40 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Medical Stock");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="medical-stock-export.xlsx"',
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate stock export.";

    return NextResponse.json(
      { success: false, message },
      { status: 500 },
    );
  }
}