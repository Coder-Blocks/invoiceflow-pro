"use client";

import { useEffect, useState } from "react";

type ReportRow = {
  accountId: string;
  code: string | null;
  name: string;
  amount: number;
};

type BalanceSheetData = {
  assetRows: ReportRow[];
  liabilityRows: ReportRow[];
  equityRows: ReportRow[];
  retainedEarnings: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  balanced: boolean;
};

export default function BalanceSheetPage() {
  const [asOf, setAsOf] = useState("");
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchReport() {
    setLoading(true);

    const params = new URLSearchParams();
    if (asOf) params.set("asOf", asOf);

    const res = await fetch(`/api/accounting/balance-sheet?${params.toString()}`);
    const json = await res.json();

    setLoading(false);

    if (!json.success) {
      alert(json.error || "Failed to load Balance Sheet");
      return;
    }

    setData(json.data);
  }

  async function downloadExcel() {
    const params = new URLSearchParams();
    if (asOf) params.set("asOf", asOf);

    const res = await fetch(
      `/api/accounting/balance-sheet/export?${params.toString()}`
    );

    if (!res.ok) {
      alert("Failed to download Excel");
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "balance-sheet.xlsx";
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
          <h1 className="text-3xl font-bold text-slate-900">Balance Sheet</h1>
          <p className="mt-1 text-slate-600">
            Assets, liabilities, equity, and retained earnings.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={downloadExcel}
            className="rounded-md bg-green-600 px-4 py-2 text-white"
          >
            Download Excel
          </button>

          {data ? (
            <div
              className={`rounded-md px-4 py-2 text-sm font-semibold ${
                data.balanced
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {data.balanced ? "Balanced" : "Not Balanced"}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border bg-white p-6 shadow-sm md:grid-cols-3">
        <input
          type="date"
          className="rounded-md border p-3"
          value={asOf}
          onChange={(e) => setAsOf(e.target.value)}
        />

        <button
          onClick={fetchReport}
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-white md:col-span-2"
        >
          {loading ? "Loading..." : "View Balance Sheet"}
        </button>
      </div>

      {data ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card title="Total Assets" value={data.totalAssets} />
            <Card title="Total Liabilities" value={data.totalLiabilities} />
            <Card title="Total Equity" value={data.totalEquity} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <ReportBox
              title="Assets"
              rows={data.assetRows}
              total={data.totalAssets}
            />

            <div className="space-y-6">
              <ReportBox
                title="Liabilities"
                rows={data.liabilityRows}
                total={data.totalLiabilities}
              />

              <ReportBox
                title="Equity"
                rows={[
                  ...data.equityRows,
                  {
                    accountId: "retained-earnings",
                    code: "",
                    name: "Retained Earnings",
                    amount: data.retainedEarnings,
                  },
                ]}
                total={data.totalEquity}
              />
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total Liabilities + Equity</span>
              <span>
                ₹{Number(data.totalLiabilitiesAndEquity).toFixed(2)}
              </span>
            </div>
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