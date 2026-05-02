import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

export async function GET() {
  try {
    const active = await requireActiveOrganization();
    const organizationId = active.organizationId;

    const [stocks, sales] = await Promise.all([
      prisma.medicineStock.findMany({
        where: { organizationId },
        orderBy: { medicineName: "asc" },
      }),
      prisma.medicineSale.findMany({
        where: { organizationId },
        orderBy: { soldAt: "desc" },
      }),
    ]);

    const totalStockItems = stocks.length;

    const totalStockQuantity = stocks.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );

    const stockCostValue = stocks.reduce(
      (sum, item) =>
        sum + Number(item.quantity || 0) * Number(item.costPrice || 0),
      0
    );

    const salesValue = sales.reduce(
      (sum, item) => sum + Number(item.saleAmount || 0),
      0
    );

    const salesCost = sales.reduce(
      (sum, item) => sum + Number(item.costAmount || 0),
      0
    );

    const salesProfit = salesValue - salesCost;

    const lowStock = stocks
      .filter(
        (item) =>
          Number(item.quantity || 0) <= Number(item.lowStockThreshold || 0)
      )
      .map((item) => ({
        id: item.id,
        medicineName: item.medicineName,
        quantity: item.quantity,
        unitType: item.unitType,
        batchNumber: item.batchNumber,
        lowStockThreshold: item.lowStockThreshold,
      }));

    const today = new Date();
    const next30 = new Date();
    next30.setDate(today.getDate() + 30);

    const expiringSoon = stocks
      .filter((item) => {
        const expiry = new Date(item.expiryDate);
        return expiry >= today && expiry <= next30;
      })
      .map((item) => ({
        id: item.id,
        medicineName: item.medicineName,
        expiryDate: item.expiryDate,
        quantity: item.quantity,
        unitType: item.unitType,
        batchNumber: item.batchNumber,
      }));

    const soldMap = new Map<
      string,
      {
        medicineName: string;
        quantitySold: number;
        saleAmount: number;
        costAmount: number;
        profit: number;
      }
    >();

    for (const sale of sales) {
      const key = sale.medicineName || "Unknown";

      const existing =
        soldMap.get(key) || {
          medicineName: key,
          quantitySold: 0,
          saleAmount: 0,
          costAmount: 0,
          profit: 0,
        };

      existing.quantitySold += Number(sale.quantitySold || 0);
      existing.saleAmount += Number(sale.saleAmount || 0);
      existing.costAmount += Number(sale.costAmount || 0);
      existing.profit = existing.saleAmount - existing.costAmount;

      soldMap.set(key, existing);
    }

    const salesAnalytics = Array.from(soldMap.values()).sort(
      (a, b) => b.quantitySold - a.quantitySold
    );

    const fastMoving = salesAnalytics.slice(0, 10);

    const slowMoving = salesAnalytics
      .filter((item) => item.quantitySold > 0)
      .sort((a, b) => a.quantitySold - b.quantitySold)
      .slice(0, 10);

    const soldNames = new Set(sales.map((sale) => sale.medicineName));

    const deadStock = stocks
      .filter((item) => !soldNames.has(item.medicineName))
      .map((item) => ({
        id: item.id,
        medicineName: item.medicineName,
        quantity: item.quantity,
        unitType: item.unitType,
        batchNumber: item.batchNumber,
        stockValue: Number(item.quantity || 0) * Number(item.costPrice || 0),
      }));

    const stockHealth =
      lowStock.length > 10
        ? "CRITICAL"
        : lowStock.length > 5
          ? "WARNING"
          : "GOOD";

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalStockItems,
          totalStockQuantity,
          stockCostValue,
          salesValue,
          salesCost,
          salesProfit,
          lowStockCount: lowStock.length,
          expiringSoonCount: expiringSoon.length,
          deadStockCount: deadStock.length,
          stockHealth,
        },
        lowStock,
        expiringSoon,
        fastMoving,
        slowMoving,
        deadStock,
      },
    });
  } catch (error) {
    console.error("INVENTORY_REPORT_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to load inventory report" },
      { status: 500 }
    );
  }
}