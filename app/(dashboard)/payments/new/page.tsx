"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Invoice = {
  id: string;
  invoiceNumber: string;
  balanceDue: string | number;
};

export default function NewPaymentPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    invoiceId: "",
    amount: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    method: "",
    reference: "",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/invoices")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setInvoices(
            data.data.filter((item: Invoice) => Number(item.balanceDue) > 0)
          );
        }
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...form,
        amount: Number(form.amount),
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!data.success) {
      alert(data.error || "Failed to create payment");
      return;
    }

    router.push("/payments");
    router.refresh();
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-3xl font-bold text-slate-900">New Payment</h1>

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border bg-white p-6 shadow-sm">
        <select
          className="rounded-md border p-3"
          value={form.invoiceId}
          onChange={(e) => setForm((p) => ({ ...p, invoiceId: e.target.value }))}
          required
        >
          <option value="">Select Invoice</option>
          {invoices.map((invoice) => (
            <option key={invoice.id} value={invoice.id}>
              {invoice.invoiceNumber} — Due ₹{Number(invoice.balanceDue).toFixed(2)}
            </option>
          ))}
        </select>

        <input
          className="rounded-md border p-3"
          type="number"
          placeholder="Amount"
          value={form.amount}
          onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
          required
        />

        <input
          className="rounded-md border p-3"
          type="date"
          value={form.paymentDate}
          onChange={(e) => setForm((p) => ({ ...p, paymentDate: e.target.value }))}
          required
        />

        <input
          className="rounded-md border p-3"
          placeholder="Method"
          value={form.method}
          onChange={(e) => setForm((p) => ({ ...p, method: e.target.value }))}
          required
        />

        <input
          className="rounded-md border p-3"
          placeholder="Reference"
          value={form.reference}
          onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))}
        />

        <textarea
          className="rounded-md border p-3"
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
        />

        <button type="submit" disabled={loading} className="rounded-md bg-blue-600 px-4 py-3 text-white">
          {loading ? "Saving..." : "Save Payment"}
        </button>
      </form>
    </div>
  );
}