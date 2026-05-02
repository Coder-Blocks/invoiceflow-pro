import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { vendorName, issueDate, totalAmount, items } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "No items provided" },
        { status: 400 }
      );
    }

    const cleanItems = items.filter(
      (item: any) =>
        item.medicineName &&
        item.quantity > 0 &&
        item.batchNumber &&
        item.expiryDate &&
        item.costPrice >= 0
    );

    if (cleanItems.length === 0) {
      return NextResponse.json(
        { success: false, error: "Invalid items" },
        { status: 400 }
      );
    }

    const bill = await prisma.purchaseBill.create({
      data: {
        organizationId: "demo-org", // temp (replace later)
        vendorName,
        issueDate: new Date(issueDate),
        totalAmount,
        items: {
          create: cleanItems.map((item: any) => ({
            medicineName: item.medicineName,
            quantity: item.quantity,
            batchNumber: item.batchNumber,
            expiryDate: new Date(item.expiryDate),
            costPrice: item.costPrice,
            unitType: item.unitType || "STRIP",
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // STOCK UPDATE
    for (const item of cleanItems) {
      const existing = await prisma.medicineStock.findFirst({
        where: {
          medicineName: item.medicineName,
          batchNumber: item.batchNumber,
        },
      });

      if (existing) {
        await prisma.medicineStock.update({
          where: { id: existing.id },
          data: {
            quantity: existing.quantity + item.quantity,
          },
        });
      } else {
        await prisma.medicineStock.create({
          data: {
            organizationId: "demo-org",
            medicineName: item.medicineName,
            quantity: item.quantity,
            batchNumber: item.batchNumber,
            expiryDate: new Date(item.expiryDate),
            costPrice: item.costPrice,
            unitType: item.unitType || "STRIP",
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Saved to DB + Stock updated",
      data: bill,
    });

  } catch (error) {
    console.error("SAVE ERROR:", error);
    return NextResponse.json(
      { success: false, error: "DB save failed" },
      { status: 500 }
    );
  }
}