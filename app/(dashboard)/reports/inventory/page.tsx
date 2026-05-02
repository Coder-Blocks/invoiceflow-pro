"use client";

import { useEffect, useState } from "react";

function money(v: number) {
  return `₹${Number(v || 0).toFixed(2)}`;
}

export default function InventoryPage() {
  const [data, setData] = useState<any>(null);

  async function load() {
    const res = await fetch("/api/reports/inventory");
    const json = await res.json();

    if (!json.success) {
      alert("Error loading inventory");
      return;
    }

    setData(json.data);
  }

  useEffect(() => {
    load();
  }, []);

  if (!data) return <div>Loading...</div>;

  const s = data.summary;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Inventory Intelligence</h1>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card title="Stock Value" value={money(s.stockCostValue)} />
        <Card title="Selling Value" value={money(s.stockSellingValue)} />
        <Card title="Expected Profit" value={money(s.expectedProfit)} />
        <Card title="Stock Health" value={s.stockHealth} />
      </div>

      {/* ALERTS */}
      <Section title="Low Stock">
        {data.lowStock.map((i: any) => (
          <Item key={i.id} name={i.medicineName} value={i.quantity} />
        ))}
      </Section>

      <Section title="Expiring Soon">
        {data.expiringSoon.map((i: any) => (
          <Item key={i.id} name={i.medicineName} value={i.expiryDate} />
        ))}
      </Section>

      {/* ANALYTICS */}
      <Section title="Fast Moving">
        {data.fastMoving.map((i: any) => (
          <Item key={i.medicineName} name={i.medicineName} value={i.sold} />
        ))}
      </Section>

      <Section title="Slow Moving">
        {data.slowMoving.map((i: any) => (
          <Item key={i.medicineName} name={i.medicineName} value={i.sold} />
        ))}
      </Section>

      <Section title="Dead Stock">
        {data.deadStock.map((i: any) => (
          <Item key={i.id} name={i.medicineName} value="No sales" />
        ))}
      </Section>

      <a
        href="/api/reports/inventory/export"
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Export CSV
      </a>
    </div>
  );
}

function Card({ title, value }: any) {
  return (
    <div className="p-4 border rounded shadow bg-white">
      <p>{title}</p>
      <h2 className="text-xl font-bold">{value}</h2>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="border p-4 rounded bg-white">
      <h2 className="font-bold mb-2">{title}</h2>
      {children.length === 0 ? "No data" : children}
    </div>
  );
}

function Item({ name, value }: any) {
  return (
    <div className="flex justify-between border-b py-1">
      <span>{name}</span>
      <span>{value}</span>
    </div>
  );
}