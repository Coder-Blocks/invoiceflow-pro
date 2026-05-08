import { NextRequest, NextResponse } from "next/server";
import { resolveOrganizationIdFromRequest } from "@/lib/medical-stock/organization";
import { persistMedicalStockRows } from "@/lib/medical-stock/persist";
import { saveMedicalStockSchema } from "@/lib/medical-stock/validators";
import type { SaveMedicalStockResponse } from "@/types/medical-stock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const json = (await request.json()) as Record<string, unknown>;
    const organizationIdFromRequest = await resolveOrganizationIdFromRequest(request, {
      jsonBody: json,
    });

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

    if (nonEmptyRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter at least one medicine row before saving.",
        },
        { status: 400 },
      );
    }

    const parsedBody = saveMedicalStockSchema.safeParse({
      ...json,
      organizationId: organizationIdFromRequest ?? json.organizationId,
      rows: nonEmptyRows,
    });

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsedBody.error.issues[0]?.message ?? "Invalid request body.",
        },
        { status: 400 },
      );
    }

    const { organizationId, rows, billId } = parsedBody.data;
    const persisted = await persistMedicalStockRows(organizationId, rows, billId);

    const response: SaveMedicalStockResponse = {
      success: true,
      message: "Medical stock saved successfully.",
      savedCount: persisted.savedCount,
      items: persisted.items,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save medical stock.";

    return NextResponse.json(
      { success: false, message },
      { status: 500 },
    );
  }
}