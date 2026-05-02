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

export default function NewInvoicePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    customerId: "",
    issueDate: "",
    dueDate: "",
    notes: "",
    terms: "",
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      description: "",
      quantity: 1,
      unitPrice: 0,
      taxRate: 18,
      discountAmount: 0,
    },
  ]);

  useEffect(() => {
    fetch("/api/customers")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCustomers(data.data);
      });
  }, []);

  function updateLine(index: number, field: keyof LineItem, value: string) {
    setLineItems((items) =>
      items.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: field === "description" ? value : Number(value),
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

  const payload = {
    ...form,
    lineItems,
  };

  try {
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    // Grab the ID from any possible place in the response
    const invoiceId = data.data?.id || data.id || data.invoiceId;

    if (invoiceId) {
      router.push(`/invoices/${invoiceId}`);
    } else {
      router.push("/invoices"); // fallback if ID missing
    }
    router.refresh();
  } catch (err) {
    console.error(err);
    // No alert – as you requested
  } finally {
    setLoading(false);
  }
}

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">New Invoice</h1>

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
            value={form.dueDate}
            onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
          />
        </div>

        <div className="space-y-4">
          {lineItems.map((item, index) => (
            <div key={index} className="grid gap-3 rounded-xl border p-4 md:grid-cols-5">
              <input
                className="rounded-md border p-3 md:col-span-2"
                placeholder="Description"
                value={item.description}
                onChange={(e) => updateLine(index, "description", e.target.value)}
              />
              <input
                className="rounded-md border p-3"
                type="number"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => updateLine(index, "quantity", e.target.value)}
              />
              <input
                className="rounded-md border p-3"
                type="number"
                placeholder="Unit Price"
                value={item.unitPrice}
                onChange={(e) => updateLine(index, "unitPrice", e.target.value)}
              />
              <input
                className="rounded-md border p-3"
                type="number"
                placeholder="GST %"
                value={item.taxRate}
                onChange={(e) => updateLine(index, "taxRate", e.target.value)}
              />
              <input
                className="rounded-md border p-3 md:col-span-2"
                type="number"
                placeholder="Discount"
                value={item.discountAmount}
                onChange={(e) => updateLine(index, "discountAmount", e.target.value)}
              />
            </div>
          ))}
        </div>

        <button type="button" onClick={addLine} className="rounded-md border px-4 py-2">
          Add Line Item
        </button>

        <textarea
          className="w-full rounded-md border p-3"
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
        />
        <textarea
          className="w-full rounded-md border p-3"
          placeholder="Terms"
          value={form.terms}
          onChange={(e) => setForm((p) => ({ ...p, terms: e.target.value }))}
        />

        <button type="submit" disabled={loading} className="rounded-md bg-blue-600 px-4 py-3 text-white">
          {loading ? "Saving..." : "Create Invoice"}
        </button>
      </form>
    </div>
  );
}