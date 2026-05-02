"use client";

import { useEffect, useMemo, useState } from "react";

type AccountLedger = {
  id: string;
  name: string;
  code: string | null;
  type: string;
};

type JournalLineInput = {
  accountId: string;
  debit: string;
  credit: string;
  description: string;
};

export default function JournalEntriesPage() {
  const [accounts, setAccounts] = useState<AccountLedger[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    voucherDate: new Date().toISOString().slice(0, 10),
    narration: "",
    reference: "",
  });

  const [lines, setLines] = useState<JournalLineInput[]>([
    { accountId: "", debit: "", credit: "", description: "" },
    { accountId: "", debit: "", credit: "", description: "" },
  ]);

  async function fetchAccounts() {
    const res = await fetch("/api/accounting/coa");
    const data = await res.json();

    if (data.success) {
      setAccounts(data.data);
    }
  }

  useEffect(() => {
    fetchAccounts();
  }, []);

  const totals = useMemo(() => {
    const debit = lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
    const credit = lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);

    return {
      debit,
      credit,
      balanced: debit > 0 && Math.round(debit * 100) === Math.round(credit * 100),
    };
  }, [lines]);

  function updateLine(index: number, field: keyof JournalLineInput, value: string) {
    setLines((items) =>
      items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  }

  function addLine() {
    setLines((items) => [
      ...items,
      { accountId: "", debit: "", credit: "", description: "" },
    ]);
  }

  function removeLine(index: number) {
    if (lines.length <= 2) return;
    setLines((items) => items.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (accounts.length === 0) {
      alert("First create Chart of Accounts from /accounting/coa");
      return;
    }

    if (!totals.balanced) {
      alert("Debit and Credit must be equal");
      return;
    }

    const validLines = lines.filter(
      (line) => line.accountId && (Number(line.debit || 0) > 0 || Number(line.credit || 0) > 0)
    );

    if (validLines.length < 2) {
      alert("Minimum 2 lines required");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/accounting/journals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        voucherDate: form.voucherDate,
        narration: form.narration,
        reference: form.reference,
        lines: validLines.map((line) => ({
          accountId: line.accountId,
          debit: Number(line.debit || 0),
          credit: Number(line.credit || 0),
          description: line.description,
        })),
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!data.success) {
      alert(data.error || "Failed to post journal");
      return;
    }

    alert("Journal posted successfully");

    setForm({
      voucherDate: new Date().toISOString().slice(0, 10),
      narration: "",
      reference: "",
    });

    setLines([
      { accountId: "", debit: "", credit: "", description: "" },
      { accountId: "", debit: "", credit: "", description: "" },
    ]);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Journal Entries</h1>
        <p className="mt-1 text-slate-600">
          Post double-entry vouchers. Debit and Credit must be equal.
        </p>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
          No Chart of Accounts found. Go to <b>/accounting/coa</b> and click <b>Create Default COA</b>.
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <input
            type="date"
            className="rounded-md border p-3"
            value={form.voucherDate}
            onChange={(e) =>
              setForm((p) => ({ ...p, voucherDate: e.target.value }))
            }
            required
          />

          <input
            className="rounded-md border p-3"
            placeholder="Reference"
            value={form.reference}
            onChange={(e) =>
              setForm((p) => ({ ...p, reference: e.target.value }))
            }
          />

          <input
            className="rounded-md border p-3"
            placeholder="Narration"
            value={form.narration}
            onChange={(e) =>
              setForm((p) => ({ ...p, narration: e.target.value }))
            }
          />
        </div>

        <div className="space-y-3">
          {lines.map((line, index) => (
            <div key={index} className="grid gap-3 rounded-xl border p-4 md:grid-cols-6">
              <select
                className="rounded-md border p-3 md:col-span-2"
                value={line.accountId}
                onChange={(e) => updateLine(index, "accountId", e.target.value)}
                required
              >
                <option value="">Select Account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.code ? `${account.code} - ` : ""}
                    {account.name} ({account.type})
                  </option>
                ))}
              </select>

              <input
                type="number"
                className="rounded-md border p-3"
                placeholder="Debit"
                value={line.debit}
                onChange={(e) => {
                  updateLine(index, "debit", e.target.value);
                  if (Number(e.target.value) > 0) updateLine(index, "credit", "");
                }}
              />

              <input
                type="number"
                className="rounded-md border p-3"
                placeholder="Credit"
                value={line.credit}
                onChange={(e) => {
                  updateLine(index, "credit", e.target.value);
                  if (Number(e.target.value) > 0) updateLine(index, "debit", "");
                }}
              />

              <input
                className="rounded-md border p-3"
                placeholder="Description"
                value={line.description}
                onChange={(e) =>
                  updateLine(index, "description", e.target.value)
                }
              />

              <button
                type="button"
                onClick={() => removeLine(index)}
                className="rounded-md border px-3 py-2 text-red-600"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
          <button
            type="button"
            onClick={addLine}
            className="rounded-md border bg-white px-4 py-2"
          >
            Add Line
          </button>

          <div className="flex gap-6 text-sm">
            <p>Debit: <b>₹{totals.debit.toFixed(2)}</b></p>
            <p>Credit: <b>₹{totals.credit.toFixed(2)}</b></p>
            <p className={totals.balanced ? "text-green-700" : "text-red-600"}>
              {totals.balanced ? "Balanced" : "Not Balanced"}
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-5 py-3 text-white disabled:opacity-50"
        >
          {loading ? "Posting..." : "Post Journal Entry"}
        </button>
      </form>
    </div>
  );
}