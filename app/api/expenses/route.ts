import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";
import { postExpenseJournal } from "@/lib/accounting/posting";

export async function GET() {
  try {
    const active = await requireActiveOrganization();

    const expenses = await prisma.expense.findMany({
      where: {
        organizationId: active.organizationId,
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: expenses,
    });
  } catch (error) {
    console.error("GET_EXPENSES_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const active = await requireActiveOrganization();
    const body = await req.json();

    const expense = await prisma.expense.create({
      data: {
        organizationId: active.organizationId,

        title:
          body.title ||
          body.vendor ||
          body.vendorName ||
          "Business Expense",

        amount: Number(body.amount || 0),
        category: body.category || "General",

        date: body.date
          ? new Date(body.date)
          : body.expenseDate
          ? new Date(body.expenseDate)
          : new Date(),

        vendor: body.vendor || body.vendorName || null,
        notes: body.notes || null,

        fileUrl: body.fileUrl || body.billUrl || null,
        sourceType: body.sourceType || "MANUAL",
        parsedText: body.parsedText || null,
        upiRef: body.upiRef || body.reference || body.upiReference || null,

        cgst: Number(body.cgst || 0),
        sgst: Number(body.sgst || 0),
        igst: Number(body.igst || 0),
        gstRate: Number(body.gstRate || 0),
      },
    });

    await postExpenseJournal({
  organizationId: active.organizationId,
  title: expense.title,
  amount: Number(expense.amount),
  method: "Bank",
  voucherDate: expense.date,
});

    return NextResponse.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    console.error("CREATE_EXPENSE_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create expense",
      },
      { status: 500 }
    );
  }
}