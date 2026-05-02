"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Brain,
  FileText,
  Package,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import PremiumCard from "@/components/ui/premium-card";
import SkeletonCard from "@/components/ui/skeleton-card";


type DashboardData = {
  summary: {
    invoiceValue: number;
    collected: number;
    outstanding: number;
    expenseValue: number;
    netProfit: number;
  };
  monthlyTrends: {
    month: string;
    revenue: number;
    collected: number;
    profit: number;
  }[];
  lowStock: any[];
  recentInvoices: any[];
};

function money(value: number) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard/summary");
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="premium-gradient rounded-3xl p-8 text-white">
          <div className="skeleton h-6 w-40 rounded bg-white/20" />
          <div className="skeleton mt-4 h-10 w-80 rounded bg-white/20" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!data) {
    return <div>No data</div>;
  }

  const s = data.summary;

  return (
    <div className="space-y-8">
      {/* HERO */}
      <section className="premium-gradient rounded-3xl p-8 text-white">
        <h1 className="text-3xl font-bold">
          Good morning 👋
        </h1>
        <p className="mt-2 text-blue-100">
          Your business insights are ready.
        </p>

        <div className="mt-4 flex gap-3">
          <Link href="/invoices/new" className="bg-white text-blue-600 px-4 py-2 rounded">
            Create Invoice
          </Link>

          <Link href="/ai-brain" className="bg-blue-500 px-4 py-2 rounded">
            Ask AI
          </Link>
        </div>
      </section>

      {/* KPI */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Revenue" value={money(s.invoiceValue)} icon={<Receipt />} />
        <KpiCard title="Collected" value={money(s.collected)} icon={<Wallet />} />
        <KpiCard title="Outstanding" value={money(s.outstanding)} icon={<FileText />} />
        <KpiCard title="Profit" value={money(s.netProfit)} icon={<TrendingUp />} />
      </div>

      {/* CHART */}
      <PremiumCard>
        <div className="flex justify-between">
          <h2 className="font-bold text-lg">Revenue Trend</h2>
          <BarChart3 />
        </div>

        <div className="mt-6 w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="#2563eb" fill="#93c5fd" />
              <Area type="monotone" dataKey="collected" stroke="#16a34a" fill="#86efac" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </PremiumCard>

      {/* AI */}
      <PremiumCard>
        <div className="flex gap-3">
          <Brain className="text-blue-600" />
          <div>
            <h2 className="font-bold">AI Business Brain</h2>
            <p className="text-sm text-gray-500">
              Smart suggestions based on your data.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm">
            {s.outstanding > s.invoiceValue * 0.3
              ? "High pending payments. Follow up."
              : "Cash flow looks healthy."}
          </p>
        </div>
      </PremiumCard>

      {/* LOW STOCK */}
      <PremiumCard>
        <div className="flex justify-between">
          <h2 className="font-bold">Low Stock</h2>
          <Package />
        </div>

        {data.lowStock.length === 0 ? (
          <p className="text-sm text-gray-500 mt-4">No low stock</p>
        ) : (
          data.lowStock.map((item: any) => (
            <div key={item.id} className="mt-3 border p-3 rounded">
              {item.medicineName} — {item.quantity}
            </div>
          ))
        )}
      </PremiumCard>
    </div>
  );
}

function KpiCard({ title, value, icon }: any) {
  return (
    <PremiumCard>
      <div className="flex justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <h2 className="text-xl font-bold">{value}</h2>
        </div>
        <div className="text-blue-600">{icon}</div>
      </div>
    </PremiumCard>
  );
}