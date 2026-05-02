import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";
import type { AccountType } from "@prisma/client";

const defaultAccounts: Array<{
  name: string;
  code: string;
  type: AccountType;
  children?: Array<{
    name: string;
    code: string;
    type: AccountType;
  }>;
}> = [
  {
    name: "Assets",
    code: "1000",
    type: "ASSET",
    children: [
      { name: "Cash", code: "1010", type: "ASSET" },
      { name: "Bank", code: "1020", type: "ASSET" },
      { name: "Inventory", code: "1030", type: "ASSET" },
      { name: "Accounts Receivable", code: "1040", type: "ASSET" },
    ],
  },
  {
    name: "Liabilities",
    code: "2000",
    type: "LIABILITY",
    children: [
      { name: "Loans", code: "2010", type: "LIABILITY" },
      { name: "Payables", code: "2020", type: "LIABILITY" },
      { name: "GST Payable", code: "2030", type: "LIABILITY" },
    ],
  },
  {
    name: "Equity",
    code: "3000",
    type: "EQUITY",
    children: [{ name: "Owner Capital", code: "3010", type: "EQUITY" }],
  },
  {
    name: "Income",
    code: "4000",
    type: "INCOME",
    children: [
      { name: "Sales", code: "4010", type: "INCOME" },
      { name: "Service Income", code: "4020", type: "INCOME" },
    ],
  },
  {
    name: "Expenses",
    code: "5000",
    type: "EXPENSE",
    children: [
      { name: "Purchase", code: "5010", type: "EXPENSE" },
      { name: "Rent", code: "5020", type: "EXPENSE" },
      { name: "Salary", code: "5030", type: "EXPENSE" },
      { name: "Utilities", code: "5040", type: "EXPENSE" },
      { name: "Transport", code: "5050", type: "EXPENSE" },
    ],
  },
];

export async function POST() {
  try {
    const active = await requireActiveOrganization();

    for (const group of defaultAccounts) {
      const parent = await prisma.accountLedger.upsert({
        where: {
          organizationId_name: {
            organizationId: active.organizationId,
            name: group.name,
          },
        },
        update: {},
        create: {
          organizationId: active.organizationId,
          name: group.name,
          code: group.code,
          type: group.type,
          isSystem: true,
        },
      });

      for (const child of group.children || []) {
        await prisma.accountLedger.upsert({
          where: {
            organizationId_name: {
              organizationId: active.organizationId,
              name: child.name,
            },
          },
          update: {},
          create: {
            organizationId: active.organizationId,
            name: child.name,
            code: child.code,
            type: child.type,
            parentId: parent.id,
            isSystem: true,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Default chart of accounts created",
    });
  } catch (error) {
    console.error("SEED_COA_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to seed chart of accounts" },
      { status: 500 }
    );
  }
}