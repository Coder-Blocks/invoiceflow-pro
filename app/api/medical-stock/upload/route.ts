import { readFile } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveOrganizationIdFromRequest } from "@/lib/medical-stock/organization";
import { parseUploadedMedicalBill } from "@/lib/medical-stock/parser";
import { storeMedicalUploadFile } from "@/lib/medical-stock/storage";
import type { UploadMedicalBillResponse } from "@/types/medical-stock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const organizationId = await resolveOrganizationIdFromRequest(request, { formData });

    if (!organizationId) {
      return NextResponse.json(
        { success: false, message: "Organization ID is required." },
        { status: 400 },
      );
    }

    const incoming = formData.get("file");

    if (!(incoming instanceof File)) {
      return NextResponse.json(
        { success: false, message: "No upload file received." },
        { status: 400 },
      );
    }

    const stored = await storeMedicalUploadFile(incoming);
    const fileBuffer = await readFile(stored.absoluteFilePath);
    const parsed = await parseUploadedMedicalBill({
      buffer: fileBuffer,
      mimeType: stored.mimeType,
    });

    const rowsWithBillUrl = parsed.rows.map((row) => ({
      ...row,
      billFileUrl: stored.publicFileUrl,
    }));

    const bill = await prisma.uploadedMedicalBill.create({
      data: {
        organizationId,
        originalFileName: incoming.name,
        storedFileName: stored.storedFileName,
        mimeType: stored.mimeType,
        fileSize: stored.size,
        fileUrl: stored.publicFileUrl,
        parseStatus: parsed.parseStatus,
        parseMessage: parsed.parseMessage,
        extractedRowsJson: rowsWithBillUrl,
      },
    });

    const response: UploadMedicalBillResponse = {
      success: true,
      message: parsed.parseMessage,
      bill: {
        id: bill.id,
        organizationId: bill.organizationId,
        originalFileName: bill.originalFileName,
        storedFileName: bill.storedFileName,
        mimeType: bill.mimeType,
        fileSize: bill.fileSize,
        fileUrl: bill.fileUrl,
        parseStatus: bill.parseStatus,
        parseMessage: bill.parseMessage,
        extractedRows: rowsWithBillUrl,
        createdAt: bill.createdAt.toISOString(),
        updatedAt: bill.updatedAt.toISOString(),
      },
      extractedRows: rowsWithBillUrl,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upload failed due to an unexpected error.";

    return NextResponse.json(
      { success: false, message },
      { status: 500 },
    );
  }
}