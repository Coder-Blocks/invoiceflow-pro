"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

export default function NewExpensePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    vendor: "",
    category: "General",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
    upiRef: "",
    gstRate: "",
    cgst: "",
    sgst: "",
    igst: "",
  });

  async function submitExpense(e: React.FormEvent) {
    e.preventDefault();

    if (!form.title.trim()) {
      alert("Please enter expense title");
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      alert("Please enter valid amount");
      return;
    }

    setSaving(true);

    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: form.title,
        vendor: form.vendor,
        category: form.category,
        amount: Number(form.amount),
        date: form.date,
        notes: form.notes,
        upiRef: form.upiRef,
        gstRate: Number(form.gstRate || 0),
        cgst: Number(form.cgst || 0),
        sgst: Number(form.sgst || 0),
        igst: Number(form.igst || 0),
        sourceType: "MANUAL",
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!data.success) {
      alert(data.error || "Failed to save expense");
      return;
    }

    router.push("/expenses");
    router.refresh();
  }

  return (
    <div className="premium-page space-y-8 p-1">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href="/expenses"
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Expenses
          </Link>

          <h1 className="premium-title">Add Expense</h1>
          <p className="premium-subtitle">
            Save purchases, UPI payments, bills, GST expenses, and office
            spending.
          </p>
        </div>
      </div>

      <form onSubmit={submitExpense} className="premium-card max-w-5xl p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Expense Title
            </label>
            <input
              className="premium-input"
              placeholder="Example: Office rent, medicine purchase, UPI payment"
              value={form.title}
              onChange={(e) =>
                setForm((p) => ({ ...p, title: e.target.value }))
              }
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Vendor
            </label>
            <input
              className="premium-input"
              placeholder="Vendor / Shop / Person name"
              value={form.vendor}
              onChange={(e) =>
                setForm((p) => ({ ...p, vendor: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Category
            </label>
            <input
              className="premium-input"
              placeholder="General"
              value={form.category}
              onChange={(e) =>
                setForm((p) => ({ ...p, category: e.target.value }))
              }
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Amount
            </label>
            <input
              className="premium-input"
              type="number"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) =>
                setForm((p) => ({ ...p, amount: e.target.value }))
              }
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Date
            </label>
            <input
              className="premium-input"
              type="date"
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              UPI Reference / Bill No
            </label>
            <input
              className="premium-input"
              placeholder="UTR / Reference / Bill No"
              value={form.upiRef}
              onChange={(e) =>
                setForm((p) => ({ ...p, upiRef: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              GST %
            </label>
            <input
              className="premium-input"
              type="number"
              placeholder="0"
              value={form.gstRate}
              onChange={(e) =>
                setForm((p) => ({ ...p, gstRate: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              CGST
            </label>
            <input
              className="premium-input"
              type="number"
              placeholder="0"
              value={form.cgst}
              onChange={(e) =>
                setForm((p) => ({ ...p, cgst: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              SGST
            </label>
            <input
              className="premium-input"
              type="number"
              placeholder="0"
              value={form.sgst}
              onChange={(e) =>
                setForm((p) => ({ ...p, sgst: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              IGST
            </label>
            <input
              className="premium-input"
              type="number"
              placeholder="0"
              value={form.igst}
              onChange={(e) =>
                setForm((p) => ({ ...p, igst: e.target.value }))
              }
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Notes
            </label>
            <textarea
              className="premium-input min-h-28"
              placeholder="Add notes..."
              value={form.notes}
              onChange={(e) =>
                setForm((p) => ({ ...p, notes: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button disabled={saving} className="premium-button">
            <span className="inline-flex items-center gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Expense"}
            </span>
          </button>

          <Link href="/expenses" className="premium-button-soft">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}