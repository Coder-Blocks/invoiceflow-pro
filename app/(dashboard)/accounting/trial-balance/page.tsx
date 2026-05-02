"use client";

import { useEffect, useState } from "react";

type TrialBalanceRow = {
  accountId: string;
  code: string | null;
  name: string;
  type: string;
  debit: number;
  credit: number;
  closingDebit: number;
  closingCredit: number;
};

export default function TrialBalancePage() {
  const [rows, setRows] = useState<TrialBalanceRow[]>([]);
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);
  const [balanced, setBalanced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  async function fetchTrialBalance() {
    try {
      setLoading(true);

      const res = await fetch("/api/accounting/trial-balance");
      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Failed to load trial balance");
        return;
      }

      setRows(data.data.rows || []);
      setTotalDebit(Number(data.data.totalDebit || 0));
      setTotalCredit(Number(data.data.totalCredit || 0));
      setBalanced(Boolean(data.data.balanced));
    } catch (error) {
      console.error("TRIAL_BALANCE_LOAD_ERROR:", error);
      alert("Failed to load trial balance");
    } finally {
      setLoading(false);
    }
  }

  async function downloadExcel() {
    try {
      setDownloading(true);

      const res = await fetch("/api/accounting/trial-balance/export");

      if (!res.ok) {
        alert("Failed to download Excel");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "trial-balance.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("TRIAL_BALANCE_EXCEL_DOWNLOAD_ERROR:", error);
      alert("Failed to download Excel");
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    fetchTrialBalance();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        Loading trial balance...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Trial Balance</h1>
          <p className="mt-1 text-slate-600">
            Check debit and credit closing balances.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchTrialBalance}
            className="rounded-md border px-4 py-2"
          >
            Refresh
          </button>

          <button
            onClick={downloadExcel}
            disabled={downloading}
            className="rounded-md bg-green-600 px-4 py-2 text-white disabled:opacity-60"
          >
            {downloading ? "Downloading..." : "Download Excel"}
          </button>

          <div
            className={`rounded-xl px-4 py-3 text-sm font-semibold ${
              balanced
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {balanced ? "Balanced" : "Not Balanced"}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Closing Debit" value={totalDebit} />
        <SummaryCard title="Closing Credit" value={totalCredit} />
        <SummaryCard
          title="Difference"
          value={Math.abs(totalDebit - totalCredit)}
        />
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            Trial Balance Report
          </h2>
          <p className="text-sm text-slate-500">{rows.length} accounts</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b">
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Account</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-right">Total Debit</th>
                <th className="px-4 py-3 text-right">Total Credit</th>
                <th className="px-4 py-3 text-right">Closing Debit</th>
                <th className="px-4 py-3 text-right">Closing Credit</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No ledger balances found. Create Chart of Accounts and post
                    journal entries first.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.accountId} className="border-b">
                    <td className="px-4 py-3">{row.code || "-"}</td>
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3">{row.type}</td>
                    <td className="px-4 py-3 text-right">
                      ₹{Number(row.debit || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      ₹{Number(row.credit || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      ₹{Number(row.closingDebit || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      ₹{Number(row.closingCredit || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            <tfoot>
              <tr className="bg-slate-100 font-bold">
                <td className="px-4 py-3" colSpan={5}>
                  Total
                </td>
                <td className="px-4 py-3 text-right">
                  ₹{Number(totalDebit).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right">
                  ₹{Number(totalCredit).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="mt-2 text-2xl font-bold text-blue-700">
        ₹{Number(value || 0).toFixed(2)}
      </h2>
    </div>
  );
}