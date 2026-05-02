import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

const journalLineSchema = z.object({
  accountId: z.string().min(1),
  debit: z.number().min(0),
  credit: z.number().min(0),
  description: z.string().optional().nullable(),
});

const journalSchema = z.object({
  voucherDate: z.string().min(1),
  narration: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  lines: z.array(journalLineSchema).min(2),
});

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export async function GET() {
  try {
    const active = await requireActiveOrganization();

    const journals = await prisma.journalEntry.findMany({
      where: {
        organizationId: active.organizationId,
      },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
      orderBy: {
        voucherDate: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: journals,
    });
  } catch (error) {
    console.error("GET_JOURNALS_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch journals" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const active = await requireActiveOrganization();
    const body = await req.json();
    const parsed = journalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid journal data" },
        { status: 400 }
      );
    }

    const validLines = parsed.data.lines.filter(
      (line) => Number(line.debit) > 0 || Number(line.credit) > 0
    );

    if (validLines.length < 2) {
      return NextResponse.json(
        { success: false, error: "Minimum two journal lines required" },
        { status: 400 }
      );
    }

    for (const line of validLines) {
      if (line.debit > 0 && line.credit > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "One line cannot have both debit and credit",
          },
          { status: 400 }
        );
      }
    }

    const totalDebit = round2(
      validLines.reduce((sum, line) => sum + Number(line.debit || 0), 0)
    );

    const totalCredit = round2(
      validLines.reduce((sum, line) => sum + Number(line.credit || 0), 0)
    );

    if (totalDebit !== totalCredit) {
      return NextResponse.json(
        {
          success: false,
          error: `Journal not balanced. Debit ₹${totalDebit} and Credit ₹${totalCredit}`,
        },
        { status: 400 }
      );
    }

    const count = await prisma.journalEntry.count({
      where: {
        organizationId: active.organizationId,
      },
    });

    const voucherNumber = `JV-${String(count + 1).padStart(5, "0")}`;

    const journal = await prisma.journalEntry.create({
      data: {
        organizationId: active.organizationId,
        voucherNumber,
        voucherDate: new Date(parsed.data.voucherDate),
        narration: parsed.data.narration || null,
        reference: parsed.data.reference || null,
        status: "POSTED",
        lines: {
          create: validLines.map((line) => ({
            organizationId: active.organizationId,
            accountId: line.accountId,
            debit: line.debit,
            credit: line.credit,
            description: line.description || null,
          })),
        },
      },
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: journal,
    });
  } catch (error) {
    console.error("CREATE_JOURNAL_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create journal entry" },
      { status: 500 }
    );
  }
}