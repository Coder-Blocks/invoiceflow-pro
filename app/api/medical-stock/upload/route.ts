import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { resolveOrganizationIdFromRequest } from "@/lib/medical-stock/organization";
import { parseUploadedMedicalBill } from "@/lib/medical-stock/parser";
import { storeMedicalUploadFile } from "@/lib/medical-stock/storage";
import { insertUploadedMedicalBill } from "@/lib/medical-stock/db";
import { persistMedicalStockRows } from "@/lib/medical-stock/persist";
import type { UploadMedicalBillResponse } from "@/types/medical-stock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const organizationId = await resolveOrganizationIdFromRequest(request, { formData });

    if (!organizationId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unable to detect workspace organization. Please login again and retry.",
        },
        { status: 400 },
      );
    }

    const incoming = formData.get("file");

    if (!(incoming instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "No upload file received.",
        },
        { status: 400 },
      );
    }

    const stored = await storeMedicalUploadFile({
      file: incoming,
      organizationId,
    });

    const parsed = await parseUploadedMedicalBill({
      file: incoming,
      mimeType: stored.mimeType,
    });

    const rowsWithBillUrl = parsed.rows.map((row) => ({
      ...row,
      billFileUrl: stored.publicFileUrl,
    }));

    let autoSavedCount = 0;

    if (rowsWithBillUrl.length > 0) {
      const persisted = await persistMedicalStockRows(organizationId, rowsWithBillUrl);
      autoSavedCount = persisted.savedCount;
    }

    const billId = randomUUID();

    const bill = await insertUploadedMedicalBill({
      id: billId,
      organizationId,
      originalFileName: incoming.name,
      storedFileName: stored.storedFileName,
      mimeType: stored.mimeType,
      fileSize: stored.size,
      fileUrl: stored.publicFileUrl,
      parseStatus: parsed.parseStatus,
      parseMessage:
        rowsWithBillUrl.length > 0
          ? `${parsed.parseMessage} Stock updated automatically for ${autoSavedCount} row(s).`
          : parsed.parseMessage,
      extractedRows: rowsWithBillUrl,
    });

    const response: UploadMedicalBillResponse = {
      success: true,
      message:
        rowsWithBillUrl.length > 0
          ? `${parsed.parseMessage} Stock updated automatically for ${autoSavedCount} row(s).`
          : parsed.parseMessage,
      bill: {
        id: bill.id,
        organizationId: bill.organizationId,
        originalFileName: bill.originalFileName,
        storedFileName: bill.storedFileName,
        mimeType: bill.mimeType,
        fileSize: bill.fileSize,
        fileUrl: bill.fileUrl,
        parseStatus: bill.parseStatus as "PENDING" | "SUCCESS" | "FAILED" | "UNSUPPORTED",
        parseMessage: bill.parseMessage,
        extractedRows: rowsWithBillUrl,
        createdAt: new Date(bill.createdAt).toISOString(),
        updatedAt: new Date(bill.updatedAt).toISOString(),
      },
      extractedRows: rowsWithBillUrl,
      autoSavedCount,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upload failed due to an unexpected error.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}