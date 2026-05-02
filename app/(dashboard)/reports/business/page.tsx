"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Summary = {
  invoiceValue: number;
  collected: number;
  outstanding: number;
  expenseValue: number;
  netProfit: number;
};

type MonthlyTrend = {
  month: string;
  revenue: number;
  collected: number;
  expenses: number;
  profit: number;
};

type ReportData = {
  summary: Summary;
  monthlyTrends: MonthlyTrend[];
};

function money(value: number) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

export default function BusinessReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadReports() {
    try {
      setLoading(true);

      const res = await fetch("/api/reports/business", {
        cache: "no-store",
      });

      const json = await res.json();

      if (!json.success) {
        alert(json.error || "Failed to load business reports");
        setData(null);
        return;
      }

      const safeData: ReportData = {
        summary: {
          invoiceValue: Number(json.data?.summary?.invoiceValue || 0),
          collected: Number(json.data?.summary?.collected || 0),
          outstanding: Number(json.data?.summary?.outstanding || 0),
          expenseValue: Number(json.data?.summary?.expenseValue || 0),
          netProfit: Number(json.data?.summary?.netProfit || 0),
        },
        monthlyTrends: Array.isArray(json.data?.monthlyTrends)
          ? json.data.monthlyTrends.map((item: Partial<MonthlyTrend>) => ({
              month: String(item.month || "-"),
              revenue: Number(item.revenue || 0),
              collected: Number(item.collected || 0),
              expenses: Number(item.expenses || 0),
              profit: Number(item.profit || 0),
            }))
          : [],
      };

      setData(safeData);
    } catch (error) {
      console.error("LOAD_BUSINESS_REPORTS_ERROR:", error);
      alert("Error loading reports");
      setData(null);
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
        Loading business reports...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-slate-600 shadow-sm">
        No report data found.
      </div>
    );
  }

  const s = data.summary;

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-gradient-to-r from-blue-700 to-indigo-700 p-8 text-white shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">
          Business Intelligence
        </p>

        <h1 className="mt-3 text-4xl font-black">Business Reports</h1>

        <p className="mt-2 text-blue-100">
          Revenue, profit, cash collection and expense analytics.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card title="Invoice Value" value={money(s.invoiceValue)} />
        <Card title="Collected" value={money(s.collected)} />
        <Card title="Outstanding" value={money(s.outstanding)} />
        <Card title="Expenses" value={money(s.expenseValue)} />
        <Card
          title="Net Profit"
          value={money(s.netProfit)}
          danger={s.netProfit < 0}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={loadReports}
          className="rounded-md border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Refresh
        </button>

        <a
          href="/api/reports/business/export"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Export CSV
        </a>
      </div>

      <section className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Monthly Revenue"
          subtitle="Invoice value vs collected amount"
        >
          {data.monthlyTrends.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="h-[300px] min-h-[300px] w-full min-w-0">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => money(Number(value))} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Invoice Value"
                    stroke="#2563eb"
                    fill="#dbeafe"
                  />
                  <Area
                    type="monotone"
                    dataKey="collected"
                    name="Collected"
                    stroke="#16a34a"
                    fill="#dcfce7"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Profit Trends" subtitle="Profit and expenses by month">
          {data.monthlyTrends.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="h-[300px] min-h-[300px] w-full min-w-0">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => money(Number(value))} />
                  <Legend />
                  <Bar dataKey="profit" name="Profit" fill="#2563eb" />
                  <Bar dataKey="expenses" name="Expenses" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Smart Analysis</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Insight
            title="Collection Health"
            value={
              s.invoiceValue > 0
                ? `${((s.collected / s.invoiceValue) * 100).toFixed(
                    1
                  )}% collected`
                : "No invoice data"
            }
          />

          <Insight
            title="Outstanding Risk"
            value={
              s.invoiceValue > 0 && s.outstanding > s.invoiceValue * 0.3
                ? "High outstanding. Follow up customers."
                : "Outstanding level is manageable."
            }
            danger={s.invoiceValue > 0 && s.outstanding > s.invoiceValue * 0.3}
          />

          <Insight
            title="Profit Status"
            value={
              s.netProfit >= 0
                ? "Business is currently profitable."
                : "Business is running in loss. Reduce expenses."
            }
            danger={s.netProfit < 0}
          />
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

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      <div className="mt-6 h-[300px] min-h-[300px] w-full min-w-0">
        {children}
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[300px] min-h-[300px] w-full items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
      No chart data found.
    </div>
  );
}

function Insight({
  title,
  value,
  danger,
}: {
  title: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p
        className={`mt-1 font-semibold ${
          danger ? "text-red-600" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}