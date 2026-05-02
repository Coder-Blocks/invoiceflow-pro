import { prisma } from "@/lib/prisma";
import { AccountType } from "@prisma/client"; // ✅ import enum

type PostingLine = {
  accountName: string;
  debit?: number;
  credit?: number;
  description?: string;
};

// Auto‑map common account names to AccountType
function getAccountType(name: string): AccountType {
  const n = name.toLowerCase();
  if (n.includes("receivable") || n.includes("cash") || n.includes("bank")) return "ASSET";
  if (n.includes("payable") || n.includes("loan")) return "LIABILITY";
  if (n.includes("sales") || n.includes("income") || n.includes("revenue")) return "INCOME";
  if (n.includes("purchase") || n.includes("expense") || n.includes("cost")) return "EXPENSE";
  return "ASSET"; // fallback
}

async function getAccountId(organizationId: string, accountName: string) {
  let account = await prisma.accountLedger.findFirst({
    where: {
      organizationId,
      name: accountName,
      isArchived: false,
    },
  });

  if (!account) {
    account = await prisma.accountLedger.create({
      data: {
        organizationId,
        name: accountName,
        type: getAccountType(accountName), // ✅ required field
        // code: accountName.toUpperCase().replace(/ /g, "_"), // optional
      },
    });
  }

  return account.id;
}

async function createJournalEntry(params: {
  organizationId: string;
  voucherPrefix: string;
  voucherDate?: Date;
  narration: string;
  reference?: string;
  lines: PostingLine[];
}) {
  const totalDebit = params.lines.reduce(
    (sum, line) => sum + Number(line.debit || 0),
    0
  );

  const totalCredit = params.lines.reduce(
    (sum, line) => sum + Number(line.credit || 0),
    0
  );

  if (Math.round(totalDebit * 100) !== Math.round(totalCredit * 100)) {
    throw new Error("Auto posting failed: debit and credit mismatch");
  }

  const count = await prisma.journalEntry.count({
    where: {
      organizationId: params.organizationId,
    },
  });

  const voucherNumber = `${params.voucherPrefix}-${String(count + 1).padStart(
    5,
    "0"
  )}`;

  return await prisma.journalEntry.create({
    data: {
      organizationId: params.organizationId,
      voucherNumber,
      voucherDate: params.voucherDate || new Date(),
      narration: params.narration,
      reference: params.reference || null,
      status: "POSTED",
      lines: {
        create: await Promise.all(
          params.lines.map(async (line) => ({
            organizationId: params.organizationId,
            accountId: await getAccountId(params.organizationId, line.accountName),
            debit: line.debit || 0,
            credit: line.credit || 0,
            description: line.description || null,
          }))
        ),
      },
    },
  });
}

export async function postInvoiceJournal(params: {
  organizationId: string;
  invoiceNumber: string;
  totalAmount: number;
  voucherDate?: Date | null;
}) {
  return await createJournalEntry({
    organizationId: params.organizationId,
    voucherPrefix: "INV-JV",
    voucherDate: params.voucherDate || new Date(),
    narration: `Invoice created: ${params.invoiceNumber}`,
    reference: params.invoiceNumber,
    lines: [
      {
        accountName: "Accounts Receivable",
        debit: params.totalAmount,
        description: "Customer receivable",
      },
      {
        accountName: "Sales",
        credit: params.totalAmount,
        description: "Sales income",
      },
    ],
  });
}

export async function postPaymentJournal(params: {
  organizationId: string;
  invoiceNumber: string;
  amount: number;
  method: string;
  voucherDate?: Date | null;
}) {
  const debitAccount =
    params.method.toLowerCase().includes("cash") ? "Cash" : "Bank";

  return await createJournalEntry({
    organizationId: params.organizationId,
    voucherPrefix: "PAY-JV",
    voucherDate: params.voucherDate || new Date(),
    narration: `Payment received for invoice: ${params.invoiceNumber}`,
    reference: params.invoiceNumber,
    lines: [
      {
        accountName: debitAccount,
        debit: params.amount,
        description: "Payment received",
      },
      {
        accountName: "Accounts Receivable",
        credit: params.amount,
        description: "Receivable reduced",
      },
    ],
  });
}

export async function postExpenseJournal(params: {
  organizationId: string;
  title: string;
  amount: number;
  method?: string;
  vendorName?: string;
  voucherDate?: Date | null;
}) {
  const creditAccount =
    params.method?.toLowerCase().includes("cash") ? "Cash" : "Bank";

  return await createJournalEntry({
    organizationId: params.organizationId,
    voucherPrefix: "EXP-JV",
    voucherDate: params.voucherDate || new Date(),
    narration: `Expense recorded: ${params.title}${params.vendorName ? ` - ${params.vendorName}` : ""}`,
    reference: params.title,
    lines: [
      {
        accountName: "Purchase",
        debit: params.amount,
        description: "Expense / purchase recorded",
      },
      {
        accountName: creditAccount,
        credit: params.amount,
        description: "Payment made",
      },
    ],
  });
}