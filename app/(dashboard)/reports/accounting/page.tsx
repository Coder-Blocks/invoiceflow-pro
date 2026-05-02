"use client";

import { useEffect, useState } from "react";

type Summary = {
  totalDebit: number;
  totalCredit: number;
  difference: number;
  income: number;
  expenses: number;
  profit: number;
  assets: number;
  liabilities: number;
  equity: number;
};

type LedgerSummary = {
  ledgerId: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
};

type RecentEntry = {
  id: string;
  date: string;
  narration: string;
  referenceType: string;
  referenceId: string;
  totalDebit: number;
  totalCredit: number;
  lines: {
    id: string;
    ledgerName: string;
    ledgerType: string;
    debit: number;
    credit: number;
  }[];
};

type AccountingReportData = {
  summary: Summary;
  ledgerSummary: LedgerSummary[];
  recentEntries: RecentEntry[];
};

function money(value: number) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

export default function AccountingReportsPage() {
  const [data, setData] = useState<AccountingReportData | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadReports() {
    try {
      setLoading(true);

      const res = await fetch("/api/reports/accounting", {
        cache: "no-store",
      });

      const json = await res.json();

      if (!json.success) {
        alert(json.error || "Failed to load accounting reports");
        return;
      }

      setData(json.data);
    } catch (error) {
      console.error("LOAD_ACCOUNTING_REPORTS_ERROR:", error);
      alert("Failed to load accounting reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-slate-600 shadow-sm">
        Loading accounting reports...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-slate-600 shadow-sm">
        No accounting report data found.
      </div>
    );
  }

  const s = data.summary;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Accounting Reports
          </h1>
          <p className="mt-1 text-slate-600">
            Ledger summary, trial balance, profit and loss, and journal entries.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={loadReports}
            className="rounded-md border px-4 py-2 text-sm font-medium"
          >
            Refresh
          </button>

          <a
            href="/api/reports/accounting/export"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            Export CSV
          </a>
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-slate-900">
          Trial Balance Summary
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <Card title="Total Debit" value={money(s.totalDebit)} />
          <Card title="Total Credit" value={money(s.totalCredit)} />
          <Card
            title="Difference"
            value={money(s.difference)}
            danger={Math.abs(s.difference) > 0.01}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-slate-900">
          Profit & Loss
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <Card title="Income" value={money(s.income)} />
          <Card title="Expenses" value={money(s.expenses)} />
          <Card
            title="Net Profit"
            value={money(s.profit)}
            danger={s.profit < 0}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-slate-900">
          Balance Sheet Snapshot
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <Card title="Assets" value={money(s.assets)} />
          <Card title="Liabilities" value={money(s.liabilities)} />
          <Card title="Equity" value={money(s.equity)} />
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">
          Ledger Summary
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Ledger
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Debit
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Credit
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  Balance
                </th>
              </tr>
            </thead>

            <tbody>
              {data.ledgerSummary.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    No ledgers found.
                  </td>
                </tr>
              ) : (
                data.ledgerSummary.map((ledger) => (
                  <tr key={ledger.ledgerId} className="border-b last:border-b-0">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {ledger.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {ledger.type}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {money(ledger.debit)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {money(ledger.credit)}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 font-semibold ${
                        ledger.balance < 0 ? "text-red-600" : "text-blue-700"
                      }`}
                    >
                      {money(ledger.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">
          Recent Journal Entries
        </h2>

        <div className="space-y-4">
          {data.recentEntries.length === 0 ? (
            <p className="text-sm text-slate-500">
              No journal entries found.
            </p>
          ) : (
            data.recentEntries.map((entry) => (
              <div key={entry.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {entry.narration}
                    </p>
                    <p className="text-sm text-slate-500">
                      {entry.date
                        ? new Date(entry.date).toISOString().slice(0, 10)
                        : "-"}{" "}
                      • {entry.referenceType}
                    </p>
                  </div>

                  <div className="text-right text-sm">
                    <p>Dr {money(entry.totalDebit)}</p>
                    <p>Cr {money(entry.totalCredit)}</p>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Ledger</th>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-left">Debit</th>
                        <th className="px-3 py-2 text-left">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.lines.map((line) => (
                        <tr key={line.id} className="border-b last:border-b-0">
                          <td className="px-3 py-2">{line.ledgerName}</td>
                          <td className="px-3 py-2">{line.ledgerType}</td>
                          <td className="px-3 py-2">{money(line.debit)}</td>
                          <td className="px-3 py-2">{money(line.credit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
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
      <h2
        className={`mt-2 text-xl font-bold ${
          danger ? "text-red-600" : "text-blue-700"
        }`}
      >
        {value}
      </h2>
    </div>
  );
}