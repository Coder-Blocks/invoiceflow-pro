"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    taxId: "",
    billingAddress: "",
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!data.success) {
      alert(data.error || "Failed to create customer");
      return;
    }

    router.push("/customers");
    router.refresh();
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-3xl font-bold text-slate-900">New Customer</h1>

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border bg-white p-6 shadow-sm">
        <input className="rounded-md border p-3" placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
        <input className="rounded-md border p-3" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
        <input className="rounded-md border p-3" placeholder="Phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
        <input className="rounded-md border p-3" placeholder="Company Name" value={form.companyName} onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))} />
        <input className="rounded-md border p-3" placeholder="GST / Tax ID" value={form.taxId} onChange={(e) => setForm((p) => ({ ...p, taxId: e.target.value }))} />
        <textarea className="rounded-md border p-3" placeholder="Billing Address" value={form.billingAddress} onChange={(e) => setForm((p) => ({ ...p, billingAddress: e.target.value }))} />
        <textarea className="rounded-md border p-3" placeholder="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
        <button type="submit" disabled={loading} className="rounded-md bg-blue-600 px-4 py-3 text-white">
          {loading ? "Saving..." : "Save Customer"}
        </button>
      </form>
    </div>
  );
}