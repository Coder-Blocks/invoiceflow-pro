"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  params: Promise<{ id: string }>;
};

export default function EditCustomerPage({ params }: Props) {
  const router = useRouter();
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    taxId: "",
    billingAddress: "",
    notes: "",
  });

  useEffect(() => {
    async function load() {
      const resolved = await params;
      setId(resolved.id);

      const res = await fetch(`/api/customers/${resolved.id}`);
      const data = await res.json();

      if (data.success) {
        setForm({
          name: data.data.name || "",
          email: data.data.email || "",
          phone: data.data.phone || "",
          companyName: data.data.companyName || "",
          taxId: data.data.taxId || "",
          billingAddress: data.data.billingAddress || "",
          notes: data.data.notes || "",
        });
      }

      setInitialLoading(false);
    }

    load();
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch(`/api/customers/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!data.success) {
      alert(data.error || "Failed to update customer");
      return;
    }

    router.push(`/customers/${id}`);
    router.refresh();
  }

  if (initialLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-3xl font-bold text-slate-900">Edit Customer</h1>

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border bg-white p-6 shadow-sm">
        <input className="rounded-md border p-3" placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
        <input className="rounded-md border p-3" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
        <input className="rounded-md border p-3" placeholder="Phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
        <input className="rounded-md border p-3" placeholder="Company Name" value={form.companyName} onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))} />
        <input className="rounded-md border p-3" placeholder="GST / Tax ID" value={form.taxId} onChange={(e) => setForm((p) => ({ ...p, taxId: e.target.value }))} />
        <textarea className="rounded-md border p-3" placeholder="Billing Address" value={form.billingAddress} onChange={(e) => setForm((p) => ({ ...p, billingAddress: e.target.value }))} />
        <textarea className="rounded-md border p-3" placeholder="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
        <button type="submit" disabled={loading} className="rounded-md bg-blue-600 px-4 py-3 text-white">
          {loading ? "Updating..." : "Update Customer"}
        </button>
      </form>
    </div>
  );
}