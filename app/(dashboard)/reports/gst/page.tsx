"use client";

import { useEffect, useState } from "react";

export default function GSTAdvancedPage() {
  const [data, setData] = useState<any>(null);
  const [month, setMonth] = useState("");

  async function fetchData() {
    const res = await fetch(`/api/gst/advanced?month=${month}`);
    const json = await res.json();
    if (json.success) setData(json);
  }

  useEffect(() => {
    fetchData();
  }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-slate-900">Advanced GST Reports</h1>

        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-md border p-2"
          />
          <button onClick={fetchData} className="rounded-md bg-blue-600 px-4 py-2 text-white">
            Apply
          </button>
          <a href={`/api/gst/export?month=${month}`} className="rounded-md border px-4 py-2">
            Export CSV
          </a>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Output GST" value={data.summary.outputGST} />
        <Card title="Input GST" value={data.summary.inputGST} />
        <Card title="Net GST" value={data.summary.netGST} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Mini title="CGST" value={data.summary.cgst} />
        <Mini title="SGST" value={data.summary.sgst} />
        <Mini title="IGST" value={data.summary.igst} />
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="mt-2 text-lg font-semibold text-slate-900">
        ₹{Number(value).toFixed(2)}
      </h2>
    </div>
  );
}

function Mini({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-3">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="font-semibold">₹{Number(value).toFixed(2)}</p>
    </div>
  );
}