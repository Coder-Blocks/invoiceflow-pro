"use client";

import { useEffect, useState } from "react";

type ReportRow = {
  accountId: string;
  code: string | null;
  name: string;
  amount: number;
};

type ProfitLossData = {
  incomeRows: ReportRow[];
  expenseRows: ReportRow[];
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
};

export default function ProfitLossPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchReport() {
    setLoading(true);

    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const res = await fetch(`/api/accounting/profit-loss?${params.toString()}`);
    const json = await res.json();

    setLoading(false);

    if (!json.success) {
      alert(json.error || "Failed to load Profit & Loss");
      return;
    }

    setData(json.data);
  }

  async function downloadExcel() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const res = await fetch(
      `/api/accounting/profit-loss/export?${params.toString()}`
    );

    if (!res.ok) {
      alert("Failed to download Excel");
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "profit-and-loss.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  useEffect(() => {
    fetchReport();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Profit & Loss</h1>
          <p className="mt-1 text-slate-600">
            Income, expenses, and net profit report.
          </p>
        </div>

        <button
          onClick={downloadExcel}
          className="rounded-md bg-green-600 px-4 py-2 text-white"
        >
          Download Excel
        </button>
      </div>

      <div className="grid gap-4 rounded-2xl border bg-white p-6 shadow-sm md:grid-cols-4">
        <input
          type="date"
          className="rounded-md border p-3"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />

        <input
          type="date"
          className="rounded-md border p-3"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />

        <button
          onClick={fetchReport}
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-white md:col-span-2"
        >
          {loading ? "Loading..." : "View Report"}
        </button>
      </div>

      {data ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card title="Total Income" value={data.totalIncome} />
            <Card title="Total Expenses" value={data.totalExpenses} />
            <Card
              title={data.netProfit >= 0 ? "Net Profit" : "Net Loss"}
              value={data.netProfit}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <ReportBox
              title="Income"
              rows={data.incomeRows}
              total={data.totalIncome}
            />

            <ReportBox
              title="Expenses"
              rows={data.expenseRows}
              total={data.totalExpenses}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="mt-2 text-2xl font-bold text-slate-900">
        ₹{Number(value).toFixed(2)}
      </h2>
    </div>
  );
}

function ReportBox({
  title,
  rows,
  total,
}: {
  title: string;
  rows: ReportRow[];
  total: number;
}) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-slate-900">{title}</h2>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No records.</p>
        ) : (
          rows.map((row) => (
            <div
              key={row.accountId}
              className="flex items-center justify-between rounded-xl border p-4"
            >
              <div>
                <p className="font-semibold text-slate-900">{row.name}</p>
                <p className="text-sm text-slate-500">
                  Code: {row.code || "-"}
                </p>
              </div>
              <p className="font-semibold text-blue-700">
                ₹{Number(row.amount).toFixed(2)}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t pt-4 font-bold">
        <span>Total {title}</span>
        <span>₹{Number(total).toFixed(2)}</span>
      </div>
    </div>
  );
}