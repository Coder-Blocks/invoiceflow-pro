import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

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

    const invoices = await prisma.invoice.findMany({
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
      },
    });

    const expenses = await prisma.expense.findMany({
      where: {
        organizationId: active.organizationId,
        date: startDate
          ? {
              gte: startDate,
              lte: endDate,
            }
          : undefined,
      },
    });

    let outputGST = 0;
    let inputGST = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    const gstr1 = invoices.map((inv) => {
      const gst = Number(inv.taxAmount || 0);
      outputGST += gst;

      return {
        invoiceNo: inv.invoiceNumber,
        date: inv.issueDate,
        customer: inv.customer?.name || "N/A",
        amount: Number(inv.totalAmount),
        gst,
      };
    });

    const gstr2 = expenses.map((exp) => {
      const c = Number(exp.cgst || 0);
      const s = Number(exp.sgst || 0);
      const i = Number(exp.igst || 0);

      cgst += c;
      sgst += s;
      igst += i;
      inputGST += c + s + i;

      return {
        vendor: exp.vendor || "N/A",
        amount: Number(exp.amount),
        cgst: c,
        sgst: s,
        igst: i,
        date: exp.date,
      };
    });

    return NextResponse.json({
      success: true,
      summary: {
        outputGST,
        inputGST,
        netGST: outputGST - inputGST,
        cgst,
        sgst,
        igst,
      },
      gstr1,
      gstr2,
    });
  } catch (error) {
    console.error("ADVANCED_GST_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load GST report" },
      { status: 500 }
    );
  }
}