"use client";

import { useEffect, useState } from "react";

type GstData = {
  summary: Record<string, number>;
  gstr1Rows: any[];
  purchaseRows: any[];
  hsnSummary: any[];
  b2bRows: any[];
  b2cRows: any[];
  warnings: string[];
};

function money(value: number) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

export default function AdvancedGSTPage() {
  const [month, setMonth] = useState("");
  const [data, setData] = useState<GstData | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setLoading(true);

      const res = await fetch(`/api/gst/advanced-tally?month=${month}`, {
        cache: "no-store",
      });

      const json = await res.json();

      if (!json.success) {
        alert(json.error || "Failed to load GST report");
        return;
      }

      setData(json.data);
    } catch (error) {
      console.error("LOAD_ADVANCED_GST_ERROR:", error);
      alert("Failed to load advanced GST report");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (!data) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        Loading Advanced GST...
      </div>
    );
  }

  const s = data.summary;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Advanced GST Reports
          </h1>
          <p className="mt-1 text-slate-600">
            Tally-style GST register, GSTR-1, GSTR-3B, HSN summary and ITC.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <input
            type="month"
            className="rounded-md border px-3 py-2"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />

          <button
            onClick={load}
            disabled={loading}
            className="rounded-md border px-4 py-2"
          >
            {loading ? "Loading..." : "Apply"}
          </button>

          <a
            href={`/api/gst/advanced-tally/export?month=${month}`}
            className="rounded-md bg-blue-600 px-4 py-2 text-white"
          >
            Export GST CSV
          </a>
        </div>
      </div>

      {data.warnings.length > 0 ? (
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
          <h2 className="font-bold text-yellow-800">GST Warnings</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-yellow-800">
            {data.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <section>
        <h2 className="mb-4 text-xl font-semibold">GSTR-3B Summary</h2>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
          <Card title="Taxable Sales" value={money(s.taxableSales)} />
          <Card title="Total Sales" value={money(s.totalSales)} />
          <Card title="Total Purchases" value={money(s.totalPurchases)} />
          <Card title="Output GST" value={money(s.outputTax)} />
          <Card title="Input ITC" value={money(s.inputTax)} />
          <Card title="Net GST Payable" value={money(s.netPayable)} danger={s.netPayable > 0} />
          <Card title="B2B Rows" value={String(s.b2bCount)} />
          <Card title="B2C Rows" value={String(s.b2cCount)} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Tax Split</h2>

        <div className="grid gap-4 md:grid-cols-3">
          <TaxCard
            title="CGST"
            output={s.outputCgst}
            input={s.inputCgst}
            net={s.netCgst}
          />
          <TaxCard
            title="SGST"
            output={s.outputSgst}
            input={s.inputSgst}
            net={s.netSgst}
          />
          <TaxCard
            title="IGST"
            output={s.outputIgst}
            input={s.inputIgst}
            net={s.netIgst}
          />
        </div>
      </section>

      <TableSection
        title="GSTR-1 Sales Register"
        columns={[
          "Invoice",
          "Date",
          "Customer",
          "GSTIN",
          "Supply",
          "HSN",
          "Taxable",
          "Rate",
          "CGST",
          "SGST",
          "IGST",
          "Total",
        ]}
        rows={data.gstr1Rows.map((row) => [
          row.invoiceNumber,
          row.invoiceDate ? new Date(row.invoiceDate).toISOString().slice(0, 10) : "-",
          row.customerName,
          row.customerGSTIN || "-",
          row.supplyType,
          row.hsnCode || "-",
          money(row.taxableValue),
          `${Number(row.gstRate).toFixed(2)}%`,
          money(row.cgst),
          money(row.sgst),
          money(row.igst),
          money(row.lineTotal),
        ])}
      />

      <TableSection
        title="HSN/SAC Summary"
        columns={[
          "HSN/SAC",
          "Taxable",
          "CGST",
          "SGST",
          "IGST",
          "Total Tax",
          "Total Value",
        ]}
        rows={data.hsnSummary.map((row) => [
          row.hsnCode,
          money(row.taxableValue),
          money(row.cgst),
          money(row.sgst),
          money(row.igst),
          money(row.totalTax),
          money(row.totalValue),
        ])}
      />

      <TableSection
        title="Purchase ITC Register"
        columns={[
          "Date",
          "Vendor",
          "GSTIN",
          "Title",
          "Amount",
          "CGST",
          "SGST",
          "IGST",
          "ITC",
        ]}
        rows={data.purchaseRows.map((row) => [
          row.date ? new Date(row.date).toISOString().slice(0, 10) : "-",
          row.vendor || "-",
          row.vendorGSTIN || "-",
          row.title || "-",
          money(row.amount),
          money(row.cgst),
          money(row.sgst),
          money(row.igst),
          row.itcEligible ? "Eligible" : "No ITC",
        ])}
      />
    </div>
  );
}

function Card({
  title,
  value,
  danger,
}: {
  title: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className={`mt-2 text-xl font-bold ${danger ? "text-red-600" : "text-blue-700"}`}>
        {value}
      </h2>
    </div>
  );
}

function TaxCard({
  title,
  output,
  input,
  net,
}: {
  title: string;
  output: number;
  input: number;
  net: number;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Output</span>
          <span>{money(output)}</span>
        </div>
        <div className="flex justify-between">
          <span>Input</span>
          <span>{money(input)}</span>
        </div>
        <div className="flex justify-between border-t pt-2 font-bold">
          <span>Net</span>
          <span className={net > 0 ? "text-red-600" : "text-green-600"}>
            {money(net)}
          </span>
        </div>
      </div>
    </div>
  );
}

function TableSection({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: string[][];
}) {
  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-slate-900">{title}</h2>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-700"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  No records found.
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b last:border-b-0">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`${rowIndex}-${cellIndex}`}
                      className="whitespace-nowrap px-4 py-3 text-slate-700"
                    >
                      {cell || "-"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}