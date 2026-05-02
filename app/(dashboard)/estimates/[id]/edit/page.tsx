"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Customer = {
  id: string;
  name: string;
};

type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountAmount: number;
};

type Props = {
  params: Promise<{ id: string }>;
};

export default function EditEstimatePage({ params }: Props) {
  const router = useRouter();
  const [id, setId] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [form, setForm] = useState({
    customerId: "",
    issueDate: "",
    expiryDate: "",
    notes: "",
    terms: "",
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  useEffect(() => {
    async function load() {
      const resolved = await params;
      setId(resolved.id);

      const [estimateRes, customersRes] = await Promise.all([
        fetch("/api/estimates"),
        fetch("/api/customers"),
      ]);

      const estimateData = await estimateRes.json();
      const customersData = await customersRes.json();

      if (customersData.success) {
        setCustomers(customersData.data);
      }

      if (estimateData.success) {
        const estimate = estimateData.data.find((item: any) => item.id === resolved.id);

        if (estimate) {
          const detailRes = await fetch(`/api/estimates/${resolved.id}`);
          const detailData = await detailRes.json();

          if (detailData.success) {
            const detailed = detailData.data;
            setForm({
              customerId: detailed.customerId || "",
              issueDate: detailed.issueDate
                ? new Date(detailed.issueDate).toISOString().slice(0, 10)
                : "",
              expiryDate: detailed.expiryDate
                ? new Date(detailed.expiryDate).toISOString().slice(0, 10)
                : "",
              notes: detailed.notes || "",
              terms: detailed.terms || "",
            });

            setLineItems(
              detailed.lineItems.map((item: any) => ({
                description: item.description,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
                taxRate: Number(item.taxRate),
                discountAmount: Number(item.discountAmount),
              }))
            );
          }
        }
      }

      setInitialLoading(false);
    }

    load();
  }, [params]);

  function updateLine(index: number, field: keyof LineItem, value: string) {
    setLineItems((items) =>
      items.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]:
                field === "description" ? value : Number(value),
            }
          : item
      )
    );
  }

  function addLine() {
    setLineItems((items) => [
      ...items,
      {
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 18,
        discountAmount: 0,
      },
    ]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch(`/api/estimates/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...form,
        customerId: form.customerId || null,
        lineItems,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!data.success) {
      alert(data.error || "Failed to update estimate");
      return;
    }

    router.push(`/estimates/${id}`);
    router.refresh();
  }

  if (initialLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Edit Estimate</h1>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <select
            className="rounded-md border p-3"
            value={form.customerId}
            onChange={(e) => setForm((p) => ({ ...p, customerId: e.target.value }))}
          >
            <option value="">Select Customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="rounded-md border p-3"
            value={form.issueDate}
            onChange={(e) => setForm((p) => ({ ...p, issueDate: e.target.value }))}
          />

          <input
            type="date"
            className="rounded-md border p-3"
            value={form.expiryDate}
            onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))}
          />
        </div>

        <div className="space-y-4">
          {lineItems.map((item, index) => (
            <div key={index} className="grid gap-3 rounded-xl border p-4 md:grid-cols-5">
              <input className="rounded-md border p-3 md:col-span-2" placeholder="Description" value={item.description} onChange={(e) => updateLine(index, "description", e.target.value)} />
              <input className="rounded-md border p-3" type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateLine(index, "quantity", e.target.value)} />
              <input className="rounded-md border p-3" type="number" placeholder="Unit Price" value={item.unitPrice} onChange={(e) => updateLine(index, "unitPrice", e.target.value)} />
              <input className="rounded-md border p-3" type="number" placeholder="GST %" value={item.taxRate} onChange={(e) => updateLine(index, "taxRate", e.target.value)} />
              <input className="rounded-md border p-3 md:col-span-2" type="number" placeholder="Discount" value={item.discountAmount} onChange={(e) => updateLine(index, "discountAmount", e.target.value)} />
            </div>
          ))}
        </div>

        <button type="button" onClick={addLine} className="rounded-md border px-4 py-2">
          Add Line Item
        </button>

        <textarea className="w-full rounded-md border p-3" placeholder="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
        <textarea className="w-full rounded-md border p-3" placeholder="Terms" value={form.terms} onChange={(e) => setForm((p) => ({ ...p, terms: e.target.value }))} />

        <button type="submit" disabled={loading} className="rounded-md bg-blue-600 px-4 py-3 text-white">
          {loading ? "Updating..." : "Update Estimate"}
        </button>
      </form>
    </div>
  );
}