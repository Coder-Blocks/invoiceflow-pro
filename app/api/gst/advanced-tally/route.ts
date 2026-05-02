import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";
import { getGstSupplyType, isValidGSTIN, splitGST } from "@/lib/gst";

export async function GET(req: Request) {
  try {
    const active = await requireActiveOrganization();
    const { searchParams } = new URL(req.url);

    const month = searchParams.get("month");

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (month) {
      const [year, m] = month.split("-");
      startDate = new Date(Number(year), Number(m) - 1, 1);
      endDate = new Date(Number(year), Number(m), 0, 23, 59, 59);
    }

    const [invoices, expenses] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          organizationId: active.organizationId,
          issueDate: startDate
            ? {
                gte: startDate,
                lte: endDate,
              }
            : undefined,
        },
        include: {
          customer: true,
          lineItems: true,
        },
        orderBy: {
          issueDate: "asc",
        },
      }),
      prisma.expense.findMany({
        where: {
          organizationId: active.organizationId,
          date: startDate
            ? {
                gte: startDate,
                lte: endDate,
              }
            : undefined,
        },
        orderBy: {
          date: "asc",
        },
      }),
    ]);

    const gstr1Rows = invoices.flatMap((invoice) =>
      invoice.lineItems.map((item) => {
        const taxableValue =
          Number(item.lineSubtotal) - Number(item.discountAmount);
        const taxAmount = Number(item.lineTax);
        const gstType = item.gstType || "INTRA";
        const split = splitGST({ taxAmount, gstType });

        const customerGstin =
          (invoice.customer as unknown as { gstin?: string | null })?.gstin ||
          invoice.customer?.taxId ||
          "";

        const supplyType = getGstSupplyType(customerGstin);

        return {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.issueDate,
          customerName: invoice.customer?.name || "",
          customerGSTIN: customerGstin,
          customerGSTINValid: isValidGSTIN(customerGstin),
          supplyType,
          hsnCode: item.hsnCode || "",
          description: item.description,
          quantity: Number(item.quantity),
          taxableValue,
          gstRate: Number(item.taxRate),
          cgst: split.cgst,
          sgst: split.sgst,
          igst: split.igst,
          totalTax: taxAmount,
          invoiceTotal: Number(invoice.totalAmount),
          lineTotal: Number(item.lineTotal),
        };
      })
    );

    const purchaseRows = expenses.map((expense) => {
      const cgst = Number(expense.cgst || 0);
      const sgst = Number(expense.sgst || 0);
      const igst = Number(expense.igst || 0);
      const inputTax = cgst + sgst + igst;

      const vendorGstin =
        (expense as unknown as { vendorGstin?: string | null })?.vendorGstin ||
        "";

      return {
        expenseId: expense.id,
        date: expense.date,
        vendor: expense.vendor || "",
        vendorGSTIN: vendorGstin,
        vendorGSTINValid: isValidGSTIN(vendorGstin),
        title: expense.title,
        hsnCode: (expense as unknown as { hsnCode?: string | null })?.hsnCode || "",
        amount: Number(expense.amount),
        cgst,
        sgst,
        igst,
        inputTax,
        itcEligible: inputTax > 0,
      };
    });

    const hsnMap = new Map<
      string,
      {
        hsnCode: string;
        taxableValue: number;
        cgst: number;
        sgst: number;
        igst: number;
        totalTax: number;
        totalValue: number;
      }
    >();

    for (const row of gstr1Rows) {
      const key = row.hsnCode || "NO-HSN";

      const existing =
        hsnMap.get(key) ||
        {
          hsnCode: key,
          taxableValue: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          totalTax: 0,
          totalValue: 0,
        };

      existing.taxableValue += row.taxableValue;
      existing.cgst += row.cgst;
      existing.sgst += row.sgst;
      existing.igst += row.igst;
      existing.totalTax += row.totalTax;
      existing.totalValue += row.lineTotal;

      hsnMap.set(key, existing);
    }

    const b2bRows = gstr1Rows.filter((row) => row.supplyType === "B2B");
    const b2cRows = gstr1Rows.filter((row) => row.supplyType === "B2C");

    const outputCgst = gstr1Rows.reduce((sum, row) => sum + row.cgst, 0);
    const outputSgst = gstr1Rows.reduce((sum, row) => sum + row.sgst, 0);
    const outputIgst = gstr1Rows.reduce((sum, row) => sum + row.igst, 0);
    const outputTax = outputCgst + outputSgst + outputIgst;

    const inputCgst = purchaseRows.reduce((sum, row) => sum + row.cgst, 0);
    const inputSgst = purchaseRows.reduce((sum, row) => sum + row.sgst, 0);
    const inputIgst = purchaseRows.reduce((sum, row) => sum + row.igst, 0);
    const inputTax = inputCgst + inputSgst + inputIgst;

    const taxableSales = gstr1Rows.reduce(
      (sum, row) => sum + row.taxableValue,
      0
    );

    const totalSales = invoices.reduce(
      (sum, invoice) => sum + Number(invoice.totalAmount),
      0
    );

    const totalPurchases = expenses.reduce(
      (sum, expense) => sum + Number(expense.amount),
      0
    );

    const warnings = [
      ...gstr1Rows
        .filter((row) => row.supplyType === "B2B" && !row.customerGSTINValid)
        .map(
          (row) =>
            `Invalid GSTIN for customer ${row.customerName} in invoice ${row.invoiceNumber}`
        ),
      ...gstr1Rows
        .filter((row) => !row.hsnCode)
        .map((row) => `Missing HSN/SAC in invoice ${row.invoiceNumber}`),
      ...purchaseRows
        .filter((row) => row.vendorGSTIN && !row.vendorGSTINValid)
        .map((row) => `Invalid vendor GSTIN for ${row.vendor}`),
    ];

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalInvoices: invoices.length,
          taxableSales,
          totalSales,
          totalPurchases,
          outputCgst,
          outputSgst,
          outputIgst,
          outputTax,
          inputCgst,
          inputSgst,
          inputIgst,
          inputTax,
          netCgst: outputCgst - inputCgst,
          netSgst: outputSgst - inputSgst,
          netIgst: outputIgst - inputIgst,
          netPayable: outputTax - inputTax,
          b2bCount: b2bRows.length,
          b2cCount: b2cRows.length,
        },
        gstr1Rows,
        purchaseRows,
        hsnSummary: Array.from(hsnMap.values()),
        b2bRows,
        b2cRows,
        warnings,
      },
    });
  } catch (error) {
    console.error("ADVANCED_TALLY_GST_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load advanced GST data" },
      { status: 500 }
    );
  }
}