"use client";

import { useEffect, useMemo, useState } from "react";

type AccountLedger = {
  id: string;
  name: string;
  code: string | null;
  type: string;
};

type LedgerRow = {
  id: string;
  date: string;
  voucherNumber: string;
  reference: string | null;
  narration: string | null;
  description: string | null;
  debit: number;
  credit: number;
  balance: number;
};

type LedgerData = {
  account: AccountLedger;
  rows: LedgerRow[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
};

export default function LedgerReportPage() {
  const [accounts, setAccounts] = useState<AccountLedger[]>([]);
  const [accountId, setAccountId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchAccounts() {
    const res = await fetch("/api/accounting/coa");
    const json = await res.json();

    if (json.success) {
      setAccounts(json.data);
    }
  }

  async function fetchLedger() {
    if (!accountId) {
      alert("Please select an account");
      return;
    }

    setLoading(true);

    const params = new URLSearchParams();
    params.set("accountId", accountId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const res = await fetch(`/api/accounting/ledger-report?${params.toString()}`);
    const json = await res.json();

    setLoading(false);

    if (!json.success) {
      alert(json.error || "Failed to load ledger");
      return;
    }

    setData(json.data);
  }

  async function downloadExcel() {
    if (!accountId) {
      alert("Please select an account");
      return;
    }

    const params = new URLSearchParams();
    params.set("accountId", accountId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const res = await fetch(
      `/api/accounting/ledger-report/export?${params.toString()}`
    );

    if (!res.ok) {
      alert("Failed to download Excel");
      return;
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "ledger-statement.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  useEffect(() => {
    fetchAccounts();
  }, []);

  const selectedAccount = useMemo(() => {
    return accounts.find((account) => account.id === accountId);
  }, [accounts, accountId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Ledger Report</h1>
          <p className="mt-1 text-slate-600">
            Account-wise debit, credit, and running balance statement.
          </p>
        </div>

        <button
          onClick={downloadExcel}
          className="rounded-md bg-green-600 px-4 py-2 text-white"
        >
          Download Excel
        </button>
      </div>

      <div className="grid gap-4 rounded-2xl border bg-white p-6 shadow-sm md:grid-cols-5">
        <select
          className="rounded-md border p-3 md:col-span-2"
          value={accountId}
          onChange={(e) => {
            setAccountId(e.target.value);
            setData(null);
          }}
        >
          <option value="">Select Account</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.code ? `${account.code} - ` : ""}
              {account.name} ({account.type})
            </option>
          ))}
        </select>

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
          onClick={fetchLedger}
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-white"
        >
          {loading ? "Loading..." : "View Ledger"}
        </button>
      </div>

      {selectedAccount ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card title="Account" value={selectedAccount.name} />
          <Card title="Type" value={selectedAccount.type} />
          <Card
            title="Total Debit"
            value={`₹${Number(data?.totalDebit || 0).toFixed(2)}`}
          />
          <Card
            title="Total Credit"
            value={`₹${Number(data?.totalCredit || 0).toFixed(2)}`}
          />
        </div>
      ) : null}

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Account Statement
            </h2>
            <p className="text-sm text-slate-500">
              {selectedAccount
                ? `${selectedAccount.name} ledger transactions`
                : "Select an account to view statement"}
            </p>
          </div>

          {data ? (
            <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              Closing Balance: ₹{Number(data.closingBalance).toFixed(2)}
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Voucher</th>
                <th className="px-4 py-3 text-left">Reference</th>
                <th className="px-4 py-3 text-left">Narration</th>
                <th className="px-4 py-3 text-right">Debit</th>
                <th className="px-4 py-3 text-right">Credit</th>
                <th className="px-4 py-3 text-right">Balance</th>
              </tr>
            </thead>

            <tbody>
              {!data || data.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No ledger transactions found.
                  </td>
                </tr>
              ) : (
                data.rows.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="px-4 py-3">
                      {new Date(row.date).toISOString().slice(0, 10)}
                    </td>
                    <td className="px-4 py-3">{row.voucherNumber}</td>
                    <td className="px-4 py-3">{row.reference || "-"}</td>
                    <td className="px-4 py-3">
                      {row.narration || row.description || "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      ₹{Number(row.debit).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      ₹{Number(row.credit).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      ₹{Number(row.balance).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {data ? (
              <tfoot>
                <tr className="bg-slate-100 font-bold">
                  <td className="px-4 py-3" colSpan={4}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-right">
                    ₹{Number(data.totalDebit).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    ₹{Number(data.totalCredit).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    ₹{Number(data.closingBalance).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="mt-2 text-lg font-semibold text-slate-900">{value}</h2>
    </div>
  );
}