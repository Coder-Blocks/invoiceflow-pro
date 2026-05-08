import { NextRequest, NextResponse } from "next/server";
import { buildGroupedMedicalStock, getMedicalStockMovementsByOrganization, getMedicalStockRowsByOrganization } from "@/lib/medical-stock/db";
import { resolveOrganizationIdFromRequest } from "@/lib/medical-stock/organization";
import type { ListMedicalStockResponse } from "@/types/medical-stock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const organizationId = await resolveOrganizationIdFromRequest(request);

    if (!organizationId) {
      return NextResponse.json(
        { success: false, message: "Unable to detect workspace organization." },
        { status: 400 },
      );
    }

    const search = request.nextUrl.searchParams.get("search")?.trim().toLowerCase() ?? "";
    const lowStockOnly = request.nextUrl.searchParams.get("lowStockOnly") === "true";
    const expiryOnly = request.nextUrl.searchParams.get("expiryOnly") === "true";

    const [stockRows, movementRows] = await Promise.all([
      getMedicalStockRowsByOrganization(organizationId),
      getMedicalStockMovementsByOrganization(organizationId),
    ]);

    let items = buildGroupedMedicalStock({
      stockRows,
      movementRows,
    });

    if (search) {
      items = items.filter((item) =>
        [
          item.medicineName,
          ...item.vendorNames,
          ...item.batches.map((b) => b.batchNumber),
        ]
          .join(" ")
          .toLowerCase()
          .includes(search),
      );
    }

    if (lowStockOnly) {
      items = items.filter((item) => item.isLowStock);
    }

    if (expiryOnly) {
      items = items.filter((item) => item.isExpired || item.expiresIn30Days);
    }

    const response: ListMedicalStockResponse = {
      success: true,
      items,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch medical stock list.";

    return NextResponse.json(
      { success: false, message },
      { status: 500 },
    );
  }
}