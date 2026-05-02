import { prisma } from "@/lib/prisma";

type PostingLine = {
  accountName: string;
  debit?: number;
  credit?: number;
  description?: string;
};

async function getAccountId(organizationId: string, accountName: string) {
  const account = await prisma.accountLedger.findFirst({
    where: {
      organizationId,
      name: accountName,
      isArchived: false,
    },
  });

  if (!account) {
    throw new Error(
      `Account missing: ${accountName}. Go to Chart of Accounts and click Create Default COA.`
    );
  }

  return account.id;
}

async function createInventoryJournal(params: {
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
    throw new Error("Debit and credit mismatch");
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

  const journalLines = [];

  for (const line of params.lines) {
    journalLines.push({
      organizationId: params.organizationId,
      accountId: await getAccountId(params.organizationId, line.accountName),
      debit: line.debit || 0,
      credit: line.credit || 0,
      description: line.description || null,
    });
  }

  return await prisma.journalEntry.create({
    data: {
      organizationId: params.organizationId,
      voucherNumber,
      voucherDate: params.voucherDate || new Date(),
      narration: params.narration,
      reference: params.reference || null,
      status: "POSTED",
      lines: {
        create: journalLines,
      },
    },
  });
}

export async function postInventoryPurchaseJournal(params: {
  organizationId: string;
  medicineName: string;
  batchNumber: string;
  amount: number;
  paymentAccount?: string;
  voucherDate?: Date | null;
}) {
  return await createInventoryJournal({
    organizationId: params.organizationId,
    voucherPrefix: "STK-IN",
    voucherDate: params.voucherDate || new Date(),
    narration: `Inventory purchase: ${params.medicineName}`,
    reference: params.batchNumber,
    lines: [
      {
        accountName: "Inventory",
        debit: params.amount,
        description: `Stock added for ${params.medicineName}`,
      },
      {
        accountName: params.paymentAccount || "Payables",
        credit: params.amount,
        description: "Inventory purchase",
      },
    ],
  });
}

export async function postCOGSJournal(params: {
  organizationId: string;
  medicineName: string;
  batchNumber: string;
  costAmount: number;
  voucherDate?: Date | null;
}) {
  return await createInventoryJournal({
    organizationId: params.organizationId,
    voucherPrefix: "COGS",
    voucherDate: params.voucherDate || new Date(),
    narration: `COGS posted for ${params.medicineName}`,
    reference: params.batchNumber,
    lines: [
      {
        accountName: "Cost of Goods Sold",
        debit: params.costAmount,
        description: `Cost for sold medicine: ${params.medicineName}`,
      },
      {
        accountName: "Inventory",
        credit: params.costAmount,
        description: `Inventory reduced for ${params.medicineName}`,
      },
    ],
  });
}

export async function postInventorySaleRevenueJournal(params: {
  organizationId: string;
  medicineName: string;
  batchNumber: string;
  saleAmount: number;
  paymentAccount?: string;
  voucherDate?: Date | null;
}) {
  return await createInventoryJournal({
    organizationId: params.organizationId,
    voucherPrefix: "STK-SALE",
    voucherDate: params.voucherDate || new Date(),
    narration: `Inventory sale: ${params.medicineName}`,
    reference: params.batchNumber,
    lines: [
      {
        accountName: params.paymentAccount || "Cash",
        debit: params.saleAmount,
        description: `Sale received for ${params.medicineName}`,
      },
      {
        accountName: "Sales",
        credit: params.saleAmount,
        description: `Inventory sale revenue for ${params.medicineName}`,
      },
    ],
  });
}