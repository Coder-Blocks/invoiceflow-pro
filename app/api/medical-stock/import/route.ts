import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";
import ExcelJS from "exceljs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExcelRow = {
  id?: string;
  medicineName: string;
  quantity: number;
  unitType: string;
  batchNumber: string;
  expiryDate: string;
  costPrice: number;
  lowStockThreshold: number;
};

export async function POST(req: Request) {
  try {
    const active = await requireActiveOrganization();
    const formData = await req.formData();
    const file = formData.get("file");

    console.log(
      "file instance?",
      file instanceof File,
      "name:",
      (file as any)?.name
    );

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "No Excel file uploaded" },
        { status: 400 }
      );
    }

    // 🔧 TypeScript error fix: as any
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const sheet = workbook.getWorksheet("Medical Stock");
    if (!sheet) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid sheet name. Please use the exported 'Medical Stock' sheet.",
        },
        { status: 400 }
      );
    }

    const rows: ExcelRow[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header

      const id = String(row.getCell(8).value ?? "").trim();
      const medicineName = String(row.getCell(1).value ?? "").trim();
      const quantity = Number(row.getCell(2).value) || 0;
      const unitType = String(row.getCell(3).value ?? "STRIP").trim();
      const batchNumber = String(row.getCell(4).value ?? "").trim();
      const rawExpiry = String(row.getCell(5).value ?? "").trim();
      const costPrice = Number(row.getCell(6).value) || 0;
      const lowStockThreshold = Number(row.getCell(7).value) || 10;

      if (!medicineName || quantity <= 0 || !batchNumber || !rawExpiry) {
        return;
      }

      const expiryDate = /^\d{4}-\d{2}-\d{2}$/.test(rawExpiry)
        ? rawExpiry
        : new Date().toISOString().slice(0, 10);

      rows.push({
        id: id || undefined,
        medicineName,
        quantity,
        unitType,
        batchNumber,
        expiryDate,
        costPrice,
        lowStockThreshold,
      });
    });

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid rows found in Excel" },
        { status: 400 }
      );
    }

    const results = await prisma.$transaction(async (tx) => {
      const upserted: any[] = [];
      const errors: string[] = [];

      for (const row of rows) {
        try {
          if (row.id) {
            const existing = await tx.medicineStock.findFirst({
              where: {
                id: row.id,
                organizationId: active.organizationId,
              },
            });

            if (!existing) {
              errors.push(`ID ${row.id} not found. Creating new entry.`);
              const newStock = await tx.medicineStock.create({
                data: {
                  organizationId: active.organizationId,
                  medicineName: row.medicineName,
                  quantity: row.quantity,
                  unitType: row.unitType,
                  batchNumber: row.batchNumber,
                  expiryDate: new Date(row.expiryDate),
                  costPrice: row.costPrice,
                  lowStockThreshold: row.lowStockThreshold,
                },
              });
              upserted.push(newStock);
              continue;
            }

            const updated = await tx.medicineStock.update({
              where: { id: row.id },
              data: {
                medicineName: row.medicineName,
                quantity: row.quantity,
                unitType: row.unitType,
                batchNumber: row.batchNumber,
                expiryDate: new Date(row.expiryDate),
                costPrice: row.costPrice,
                lowStockThreshold: row.lowStockThreshold,
              },
            });
            upserted.push(updated);
          } else {
            const created = await tx.medicineStock.create({
              data: {
                organizationId: active.organizationId,
                medicineName: row.medicineName,
                quantity: row.quantity,
                unitType: row.unitType,
                batchNumber: row.batchNumber,
                expiryDate: new Date(row.expiryDate),
                costPrice: row.costPrice,
                lowStockThreshold: row.lowStockThreshold,
              },
            });
            upserted.push(created);
          }
        } catch (err: any) {
          errors.push(
            `Row "${row.medicineName}" failed: ${err.message || err}`
          );
        }
      }

      return { upserted, errors };
    });

    return NextResponse.json({
      success: true,
      message: `Processed ${results.upserted.length} rows. ${results.errors.length} errors.`,
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error) {
    console.error("FULL_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to import stock Excel" },
      { status: 500 }
    );
  }
}