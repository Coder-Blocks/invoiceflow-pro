import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

type LedgerSummary = {
  ledgerId: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
};

export async function GET() {
  try {
    const active = await requireActiveOrganization();
    const organizationId = active.organizationId;

    const [ledgers, journalEntries] = await Promise.all([
      prisma.ledger.findMany({
        where: { organizationId },
        orderBy: [{ type: "asc" }, { name: "asc" }],
      }),

      prisma.journalEntry.findMany({
        where: { organizationId },
        include: {
          lines: {
            include: {
              ledger: true,
            },
          },
        },
        orderBy: {
          voucherDate: "desc",
        },
      }),
    ]);

    const ledgerMap = new Map<string, LedgerSummary>();

    for (const ledger of ledgers) {
      ledgerMap.set(ledger.id, {
        ledgerId: ledger.id,
        name: ledger.name,
        type: ledger.type,
        debit: 0,
        credit: 0,
        balance: 0,
      });
    }

   for (const entry of journalEntries) {
  for (const line of entry.lines) {

    if (!line.ledgerId) continue; // ✅ FIX

    const ledger = ledgerMap.get(line.ledgerId);
    if (!ledger) continue;

    ledger.debit += Number(line.debit || 0);
    ledger.credit += Number(line.credit || 0);
  }
}

    for (const ledger of ledgerMap.values()) {
      if (ledger.type === "ASSET" || ledger.type === "EXPENSE") {
        ledger.balance = ledger.debit - ledger.credit;
      } else {
        ledger.balance = ledger.credit - ledger.debit;
      }
    }

    const ledgerSummary = Array.from(ledgerMap.values());

    const totalDebit = ledgerSummary.reduce((sum, item) => sum + item.debit, 0);
    const totalCredit = ledgerSummary.reduce(
      (sum, item) => sum + item.credit,
      0
    );

    const income = ledgerSummary
      .filter((item) => item.type === "INCOME")
      .reduce((sum, item) => sum + item.balance, 0);

    const expenses = ledgerSummary
      .filter((item) => item.type === "EXPENSE")
      .reduce((sum, item) => sum + item.balance, 0);

    const assets = ledgerSummary
      .filter((item) => item.type === "ASSET")
      .reduce((sum, item) => sum + item.balance, 0);

    const liabilities = ledgerSummary
      .filter((item) => item.type === "LIABILITY")
      .reduce((sum, item) => sum + item.balance, 0);

    const equity = ledgerSummary
      .filter((item) => item.type === "EQUITY")
      .reduce((sum, item) => sum + item.balance, 0);

    const profit = income - expenses;

    const recentEntries = journalEntries.slice(0, 20).map((entry) => ({
      id: entry.id,
      date: entry.voucherDate,
      voucherNumber: entry.voucherNumber,
      narration: entry.narration || "-",
      reference: entry.reference || "-",
      status: entry.status,
      totalDebit: entry.lines.reduce(
        (sum, line) => sum + Number(line.debit || 0),
        0
      ),
      totalCredit: entry.lines.reduce(
        (sum, line) => sum + Number(line.credit || 0),
        0
      ),
      lines: entry.lines.map((line) => ({
        id: line.id,
        ledgerName: line.ledger?.name,
        ledgerType: line.ledger?.type,
        debit: Number(line.debit || 0),
        credit: Number(line.credit || 0),
      })),
    }));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalDebit,
          totalCredit,
          difference: totalDebit - totalCredit,
          income,
          expenses,
          profit,
          assets,
          liabilities,
          equity,
        },
        ledgerSummary,
        recentEntries,
      },
    });
  } catch (error) {
    console.error("ACCOUNTING_REPORT_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to load accounting reports" },
      { status: 500 }
    );
  }
}