import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";
import {
  postCOGSJournal,
  postInventorySaleRevenueJournal,
} from "@/lib/accounting/inventory-posting";

export async function POST(req: Request) {
  try {
    const active = await requireActiveOrganization();
    const body = await req.json();

    const stockId = String(body.stockId || "");
    const quantitySold = Number(body.quantitySold || 0);
    const saleAmount = Number(body.saleAmount || 0);
    const paymentAccount = body.paymentAccount || "Cash";
    const notes = body.notes ? String(body.notes) : null;

    if (!stockId || quantitySold <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid stock or quantity" },
        { status: 400 }
      );
    }

    const stock = await prisma.medicineStock.findFirst({
      where: {
        id: stockId,
        organizationId: active.organizationId,
      },
    });

    if (!stock) {
      return NextResponse.json(
        { success: false, error: "Medicine stock not found" },
        { status: 404 }
      );
    }

    if (Number(stock.quantity) < quantitySold) {
      return NextResponse.json(
        { success: false, error: "Not enough stock available" },
        { status: 400 }
      );
    }

    const costAmount = quantitySold * Number(stock.costPrice);

    const updated = await prisma.$transaction(async (tx) => {
      const sale = await tx.medicineSale.create({
        data: {
          organizationId: active.organizationId,
          stockId: stock.id,
          medicineName: stock.medicineName,
          quantitySold,
          saleAmount,
          costAmount,
          notes,
        },
      });

      const updatedStock = await tx.medicineStock.update({
        where: {
          id: stock.id,
        },
        data: {
          quantity: {
            decrement: quantitySold,
          },
        },
      });

      return {
        sale,
        updatedStock,
      };
    });

    if (costAmount > 0) {
      await postCOGSJournal({
        organizationId: active.organizationId,
        medicineName: stock.medicineName,
        batchNumber: stock.batchNumber,
        costAmount,
        voucherDate: new Date(),
      });
    }

    if (saleAmount > 0) {
      await postInventorySaleRevenueJournal({
        organizationId: active.organizationId,
        medicineName: stock.medicineName,
        batchNumber: stock.batchNumber,
        saleAmount,
        paymentAccount,
        voucherDate: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("SELL_MEDICINE_ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to sell medicine",
      },
      { status: 500 }
    );
  }
}