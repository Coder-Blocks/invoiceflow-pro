import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { buildGroupedMedicalStock, getMedicalStockMovementsByOrganization, getMedicalStockRowsByOrganization } from "@/lib/medical-stock/db";
import { MEDICAL_STOCK_EXPORT_HEADERS } from "@/lib/medical-stock/constants";
import { resolveOrganizationIdFromRequest } from "@/lib/medical-stock/organization";
import { exportMedicalStockSchema } from "@/lib/medical-stock/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildCurrentRowsSheet(rows: Array<{
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  vendorName: string;
  billFileUrl?: string | null;
}>) {
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

    const rowsInput = Array.isArray(json.rows) ? json.rows : [];
    const nonEmptyRows = rowsInput.filter((row) => {
      if (!row || typeof row !== "object") return false;
      const item = row as Record<string, unknown>;
      return (
        String(item.medicineName ?? "").trim() ||
        String(item.batchNumber ?? "").trim() ||
        String(item.expiryDate ?? "").trim() ||
        Number(item.quantity ?? 0) > 0 ||
        Number(item.purchasePrice ?? 0) > 0 ||
        Number(item.sellingPrice ?? 0) > 0 ||
        String(item.vendorName ?? "").trim()
      );
    });

    const parsed = exportMedicalStockSchema.safeParse({
      ...json,
      organizationId: organizationId ?? json.organizationId,
      rows: nonEmptyRows,
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
    const worksheet = XLSX.utils.json_to_sheet(buildCurrentRowsSheet(rows), {
      header: MEDICAL_STOCK_EXPORT_HEADERS,
    });

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

    const [stockRows, movementRows] = await Promise.all([
      getMedicalStockRowsByOrganization(organizationId),
      getMedicalStockMovementsByOrganization(organizationId),
    ]);

    const grouped = buildGroupedMedicalStock({
      stockRows,
      movementRows,
    });

    const summarySheet = grouped.map((item) => ({
      "Medicine Name": item.medicineName,
      "Total Quantity": item.totalQuantity,
      "Batch Count": item.batchCount,
      "Latest Purchase Price": item.latestPurchasePrice,
      "Latest Selling Price": item.latestSellingPrice,
      "Earliest Expiry Date": item.earliestExpiryDate,
      Vendors: item.vendorNames.join(", "),
    }));

    const batchSheet = grouped.flatMap((item) =>
      item.batches.map((batch) => ({
        "Medicine Name": item.medicineName,
        "Batch Number": batch.batchNumber,
        "Expiry Date": batch.expiryDate,
        Quantity: batch.quantity,
        "Purchase Price": batch.purchasePrice,
        "Selling Price": batch.sellingPrice,
        "Vendor Name": batch.vendorName,
        "Bill File URL": batch.billFileUrl ?? "",
        "Created Date": batch.createdAt,
      })),
    );

    const movementSheet = movementRows.map((row) => ({
      "Medicine Name": row.medicineName,
      "Batch Number": row.batchNumber,
      "Expiry Date":
        row.expiryDate instanceof Date
          ? row.expiryDate.toISOString().slice(0, 10)
          : new Date(row.expiryDate).toISOString().slice(0, 10),
      Quantity: Number(row.quantity || 0),
      "Purchase Price": Number(row.purchasePrice || 0),
      "Selling Price": Number(row.sellingPrice || 0),
      "Vendor Name": row.vendorName || "",
      "Bill File URL": row.billFileUrl ?? "",
      "Created Date":
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : new Date(row.createdAt).toISOString(),
    }));

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(summarySheet),
      "Stock Summary",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(batchSheet),
      "Batch Details",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(movementSheet),
      "Bill History",
    );

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