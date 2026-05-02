"use client";

import { useEffect, useState } from "react";

type Expense = {
  id: string;
  title: string;
  amount: string | number;
  category?: string | null;
  vendor?: string | null;
  notes?: string | null;
  fileUrl?: string | null;
  date: string;
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState("");

  const [form, setForm] = useState({
    title: "",
    amount: "",
    category: "",
    vendor: "",
    notes: "",
    date: new Date().toISOString().slice(0, 10),
    gstRate: "0",
    cgst: "0",
    sgst: "0",
    igst: "0",
  });

  async function fetchExpenses() {
    const res = await fetch("/api/expenses");
    const data = await res.json();
    if (data.success) setExpenses(data.data);
  }

  useEffect(() => {
    fetchExpenses();
  }, []);

  async function uploadFile(file: File) {
    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: fd,
    });

    const data = await res.json();

    if (data.success) {
      setFileUrl(data.url);
    } else {
      alert(data.error || "Upload failed");
    }

    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...form,
        amount: Number(form.amount),
        gstRate: Number(form.gstRate),
        cgst: Number(form.cgst),
        sgst: Number(form.sgst),
        igst: Number(form.igst),
        fileUrl,
        sourceType: fileUrl ? "BILL_UPLOAD" : "MANUAL",
      }),
    });

    const data = await res.json();

    if (!data.success) {
      setLoading(false);
      alert(data.error || "Failed to create expense");
      return;
    }

    setForm({
      title: "",
      amount: "",
      category: "",
      vendor: "",
      notes: "",
      date: new Date().toISOString().slice(0, 10),
      gstRate: "0",
      cgst: "0",
      sgst: "0",
      igst: "0",
    });
    setFileUrl("");
    setLoading(false);
    fetchExpenses();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Bills & Expenses</h1>
        <p className="mt-1 text-slate-600">Upload purchase bills and save them as accounting entries.</p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border bg-white p-6 shadow-sm md:grid-cols-2">
        <input className="rounded-md border p-3" placeholder="Expense Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
        <input className="rounded-md border p-3" placeholder="Amount" type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} required />
        <input className="rounded-md border p-3" placeholder="Vendor" value={form.vendor} onChange={(e) => setForm((p) => ({ ...p, vendor: e.target.value }))} />
        <input className="rounded-md border p-3" placeholder="Category" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
        <input className="rounded-md border p-3" type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
        <input className="rounded-md border p-3" placeholder="GST Rate %" type="number" value={form.gstRate} onChange={(e) => setForm((p) => ({ ...p, gstRate: e.target.value }))} />
        <input className="rounded-md border p-3" placeholder="CGST" type="number" value={form.cgst} onChange={(e) => setForm((p) => ({ ...p, cgst: e.target.value }))} />
        <input className="rounded-md border p-3" placeholder="SGST" type="number" value={form.sgst} onChange={(e) => setForm((p) => ({ ...p, sgst: e.target.value }))} />
        <input className="rounded-md border p-3" placeholder="IGST" type="number" value={form.igst} onChange={(e) => setForm((p) => ({ ...p, igst: e.target.value }))} />
        <textarea className="rounded-md border p-3 md:col-span-2" placeholder="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">Upload Bill Copy</label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
            }}
          />
          {uploading ? <p className="mt-2 text-sm text-blue-600">Uploading...</p> : null}
          {fileUrl ? (
            <a href={fileUrl} target="_blank" className="mt-2 block text-sm text-blue-700 underline">
              View uploaded bill
            </a>
          ) : null}
        </div>

        <button type="submit" disabled={loading} className="rounded-md bg-blue-600 px-5 py-3 text-white md:col-span-2">
          {loading ? "Saving..." : "Save Expense"}
        </button>
      </form>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Saved Expenses</h2>
        <div className="space-y-3">
          {expenses.length === 0 ? (
            <p className="text-sm text-slate-500">No expenses yet.</p>
          ) : (
            expenses.map((item) => (
              <div key={item.id} className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="text-sm text-slate-500">
                      {item.vendor || "-"} • {new Date(item.date).toISOString().slice(0, 10)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-blue-700">₹{Number(item.amount).toFixed(2)}</p>
                    {item.fileUrl ? (
                      <a href={item.fileUrl} target="_blank" className="text-xs text-blue-700 underline">
                        View Bill
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}