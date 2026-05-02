import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";
import { postInventoryPurchaseJournal } from "@/lib/accounting/inventory-posting";

export async function GET() {
  try {
    const active = await requireActiveOrganization();

    const stocks = await prisma.medicineStock.findMany({
      where: {
        organizationId: active.organizationId,
      },
      orderBy: [{ medicineName: "asc" }, { createdAt: "desc" }],
    });

    const lowStock = stocks.filter(
      (item) => Number(item.quantity) <= Number(item.lowStockThreshold)
    );

    return NextResponse.json({
      success: true,
      data: {
        stocks,
        lowStock,
      },
    });
  } catch (error) {
    console.error("GET_MEDICAL_STOCK_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch medical stock" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const active = await requireActiveOrganization();
    const body = await req.json();

    const quantity = Number(body.quantity || 0);
    const costPrice = Number(body.costPrice || 0);
    const paymentAccount = body.paymentAccount || "Payables";

    const stock = await prisma.medicineStock.create({
      data: {
        organizationId: active.organizationId,
        medicineName: String(body.medicineName || ""),
        quantity,
        unitType: String(body.unitType || "STRIP"),
        batchNumber: String(body.batchNumber || ""),
        expiryDate: new Date(body.expiryDate),
        costPrice,
        lowStockThreshold:
          body.lowStockThreshold !== undefined
            ? Number(body.lowStockThreshold)
            : String(body.unitType || "STRIP") === "BOTTLE"
            ? 5
            : 10,
      },
    });

    const inventoryAmount = quantity * costPrice;

    if (inventoryAmount > 0) {
      await postInventoryPurchaseJournal({
        organizationId: active.organizationId,
        medicineName: stock.medicineName,
        batchNumber: stock.batchNumber,
        amount: inventoryAmount,
        paymentAccount,
        voucherDate: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      data: stock,
    });
  } catch (error) {
    console.error("CREATE_MEDICAL_STOCK_ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create stock entry",
      },
      { status: 500 }
    );
  }
}