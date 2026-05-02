import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";
import ExcelJS from "exceljs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const active = await requireActiveOrganization();

    const stocks = await prisma.medicineStock.findMany({
      where: { organizationId: active.organizationId },
      orderBy: [{ medicineName: "asc" }, { batchNumber: "asc" }],
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "TIC Smart Billing";
    const sheet = workbook.addWorksheet("Medical Stock");

    // Column headers matching the stock table
    sheet.columns = [
      { header: "Medicine Name", key: "medicineName", width: 35 },
      { header: "Quantity", key: "quantity", width: 12 },
      { header: "Unit", key: "unitType", width: 10 },
      { header: "Batch Number", key: "batchNumber", width: 18 },
      { header: "Expiry Date", key: "expiryDate", width: 15 },
      { header: "Cost Price (₹)", key: "costPrice", width: 18 },
      { header: "Low Stock Threshold", key: "lowStockThreshold", width: 20 },
      { header: "ID (do not edit)", key: "id", width: 25 }, // hidden identification column
    ];

    stocks.forEach((stock) => {
      sheet.addRow({
        medicineName: stock.medicineName,
        quantity: stock.quantity,
        unitType: stock.unitType,
        batchNumber: stock.batchNumber,
        expiryDate: stock.expiryDate.toISOString().slice(0, 10),
        costPrice: stock.costPrice,
        lowStockThreshold: stock.lowStockThreshold,
        id: stock.id,
      });
    });

    // Style header
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1D4ED8" },
    };
    sheet.views = [{ state: "frozen", ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="medical-stock-${Date.now()}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("EXPORT_STOCK_EXCEL_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to export stock Excel" },
      { status: 500 }
    );
  }
}