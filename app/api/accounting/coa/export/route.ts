import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

const typeOrder = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];

const typeLabels: Record<string, string> = {
  ASSET: "ASSETS",
  LIABILITY: "LIABILITIES",
  EQUITY: "EQUITY",
  INCOME: "INCOME",
  EXPENSE: "EXPENSES",
};

export async function GET() {
  try {
    const active = await requireActiveOrganization();

    const accounts = await prisma.accountLedger.findMany({
      where: {
        organizationId: active.organizationId,
        isArchived: false,
      },
      include: {
        parent: true,
      },
      orderBy: [{ type: "asc" }, { code: "asc" }, { name: "asc" }],
    });

    const rows: Array<Record<string, string | number>> = [];

    rows.push({
      "Account Name": "Chart of Accounts",
      Code: "",
      Type: "",
      Parent: "",
      Level: "",
      "System Account": "",
    });

    rows.push({
      "Account Name": active.organization.name,
      Code: "",
      Type: "",
      Parent: "",
      Level: "",
      "System Account": "",
    });

    rows.push({
      "Account Name": "",
      Code: "",
      Type: "",
      Parent: "",
      Level: "",
      "System Account": "",
    });

    for (const type of typeOrder) {
      const groupAccounts = accounts.filter((account) => account.type === type);

      rows.push({
        "Account Name": typeLabels[type],
        Code: "",
        Type: type,
        Parent: "",
        Level: "GROUP",
        "System Account": "",
      });

      const mainAccounts = groupAccounts.filter((account) => !account.parentId);

      for (const main of mainAccounts) {
        rows.push({
          "Account Name": main.name,
          Code: main.code || "",
          Type: main.type,
          Parent: "",
          Level: "Main Account",
          "System Account": main.isSystem ? "Yes" : "No",
        });

        const children = groupAccounts.filter(
          (account) => account.parentId === main.id
        );

        for (const child of children) {
          rows.push({
            "Account Name": `   ↳ ${child.name}`,
            Code: child.code || "",
            Type: child.type,
            Parent: main.name,
            Level: "Sub Account",
            "System Account": child.isSystem ? "Yes" : "No",
          });
        }
      }

      rows.push({
        "Account Name": "",
        Code: "",
        Type: "",
        Parent: "",
        Level: "",
        "System Account": "",
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: [
        "Account Name",
        "Code",
        "Type",
        "Parent",
        "Level",
        "System Account",
      ],
    });

    worksheet["!cols"] = [
      { wch: 34 },
      { wch: 12 },
      { wch: 16 },
      { wch: 24 },
      { wch: 16 },
      { wch: 16 },
    ];

    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:F1");

    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];

        if (!cell) continue;

        cell.s = {
          font: {
            name: "Calibri",
            sz: 11,
          },
          alignment: {
            vertical: "center",
          },
        };
      }
    }

    // Title row
    worksheet["A2"].s = {
      font: {
        bold: true,
        sz: 18,
        color: { rgb: "1E3A8A" },
      },
      alignment: {
        horizontal: "center",
      },
    };

    // Organization row
    worksheet["A3"].s = {
      font: {
        bold: true,
        sz: 12,
        color: { rgb: "334155" },
      },
    };

    // Header row
    const headerRow = 1;
    for (let col = 0; col <= 5; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: headerRow - 1, c: col });
      const cell = worksheet[cellAddress];
      if (!cell) continue;

      cell.s = {
        font: {
          bold: true,
          color: { rgb: "FFFFFF" },
        },
        fill: {
          fgColor: { rgb: "1D4ED8" },
        },
        alignment: {
          horizontal: "center",
          vertical: "center",
        },
      };
    }

    // Group row colors
    for (let row = 0; row <= range.e.r; row++) {
      const accountCellAddress = XLSX.utils.encode_cell({ r: row, c: 0 });
      const levelCellAddress = XLSX.utils.encode_cell({ r: row, c: 4 });
      const typeCellAddress = XLSX.utils.encode_cell({ r: row, c: 2 });

      const accountCell = worksheet[accountCellAddress];
      const levelCell = worksheet[levelCellAddress];
      const typeCell = worksheet[typeCellAddress];

      if (!accountCell || !levelCell) continue;

      if (levelCell.v === "GROUP") {
        const type = String(typeCell?.v || "");
        const color =
          type === "ASSET"
            ? "DCFCE7"
            : type === "LIABILITY"
            ? "FEE2E2"
            : type === "EQUITY"
            ? "E0E7FF"
            : type === "INCOME"
            ? "DBEAFE"
            : type === "EXPENSE"
            ? "FEF3C7"
            : "F1F5F9";

        for (let col = 0; col <= 5; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];

          if (!cell) continue;

          cell.s = {
            font: {
              bold: true,
              color: { rgb: "111827" },
            },
            fill: {
              fgColor: { rgb: color },
            },
            alignment: {
              vertical: "center",
            },
          };
        }
      }
    }

    worksheet["!merges"] = [
      {
        s: { r: 1, c: 0 },
        e: { r: 1, c: 5 },
      },
      {
        s: { r: 2, c: 0 },
        e: { r: 2, c: 5 },
      },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Chart of Accounts");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
      cellStyles: true,
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="chart-of-accounts-tally-style.xlsx"',
      },
    });
  } catch (error) {
    console.error("EXPORT_COA_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to export COA" },
      { status: 500 }
    );
  }
}