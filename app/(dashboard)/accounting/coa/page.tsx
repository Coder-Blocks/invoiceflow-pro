"use client";

import { useEffect, useMemo, useState } from "react";

type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";

type AccountLedger = {
  id: string;
  name: string;
  code: string | null;
  type: AccountType;
  parentId: string | null;
  isSystem: boolean;
  isArchived: boolean;
};

const accountTypes: AccountType[] = [
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "INCOME",
  "EXPENSE",
];

const typeLabels: Record<AccountType, string> = {
  ASSET: "Assets",
  LIABILITY: "Liabilities",
  EQUITY: "Equity",
  INCOME: "Income",
  EXPENSE: "Expenses",
};

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<AccountLedger[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<{
    name: string;
    code: string;
    type: AccountType;
    parentId: string;
  }>({
    name: "",
    code: "",
    type: "ASSET",
    parentId: "",
  });

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

  const parentOptions = useMemo(() => {
    return accounts.filter((account) => !account.parentId);
  }, [accounts]);

  const groupedAccounts = useMemo(() => {
    return accountTypes.map((type) => ({
      type,
      accounts: accounts.filter((account) => account.type === type),
    }));
  }, [accounts]);

  function resetForm() {
    setEditingId(null);
    setForm({
      name: "",
      code: "",
      type: "ASSET",
      parentId: "",
    });
  }

  function startEdit(account: AccountLedger) {
    setEditingId(account.id);
    setForm({
      name: account.name,
      code: account.code || "",
      type: account.type,
      parentId: account.parentId || "",
    });
  }

  async function seedDefaultAccounts() {
    try {
      setSeeding(true);

      const res = await fetch("/api/accounting/coa/seed", {
        method: "POST",
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Failed to seed accounts");
        return;
      }

      alert("Default chart of accounts created");
      fetchAccounts();
    } catch (error) {
      console.error("SEED_DEFAULT_ACCOUNTS_CLIENT_ERROR:", error);
      alert("Failed to create default accounts");
    } finally {
      setSeeding(false);
    }
  }

  async function downloadExcel() {
    try {
      setDownloading(true);

      const res = await fetch("/api/accounting/coa/export");

      if (!res.ok) {
        alert("Failed to download Excel");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "chart-of-accounts.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("DOWNLOAD_COA_EXCEL_ERROR:", error);
      alert("Failed to download Excel");
    } finally {
      setDownloading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);

      const url = editingId
        ? `/api/accounting/coa/${editingId}`
        : "/api/accounting/coa";

      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          code: form.code,
          type: form.type,
          parentId: form.parentId || null,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Failed to save account");
        return;
      }

      resetForm();
      fetchAccounts();
    } catch (error) {
      console.error("SAVE_COA_CLIENT_ERROR:", error);
      alert("Failed to save account");
    } finally {
      setLoading(false);
    }
  }

  async function archiveAccount(account: AccountLedger) {
    const confirmDelete = confirm(`Archive account "${account.name}"?`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/accounting/coa/${account.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Failed to archive account");
        return;
      }

      fetchAccounts();
    } catch (error) {
      console.error("ARCHIVE_COA_CLIENT_ERROR:", error);
      alert("Failed to archive account");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Chart of Accounts
          </h1>
          <p className="mt-1 text-slate-600">
            Build your accounting structure for assets, liabilities, income, and
            expenses.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={downloadExcel}
            disabled={downloading}
            className="rounded-md bg-green-600 px-4 py-2 text-white disabled:opacity-60"
          >
            {downloading ? "Downloading..." : "Download Excel"}
          </button>

          <button
            onClick={seedDefaultAccounts}
            disabled={seeding}
            className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
          >
            {seeding ? "Creating..." : "Create Default COA"}
          </button>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-2xl border bg-white p-6 shadow-sm md:grid-cols-5"
      >
        <input
          className="rounded-md border p-3 md:col-span-2"
          placeholder="Account Name"
          value={form.name}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, name: e.target.value }))
          }
          required
        />

        <input
          className="rounded-md border p-3"
          placeholder="Code"
          value={form.code}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, code: e.target.value }))
          }
        />

        <select
          className="rounded-md border p-3"
          value={form.type}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              type: e.target.value as AccountType,
            }))
          }
        >
          {accountTypes.map((type) => (
            <option key={type} value={type}>
              {typeLabels[type]}
            </option>
          ))}
        </select>

        <select
          className="rounded-md border p-3"
          value={form.parentId}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, parentId: e.target.value }))
          }
        >
          <option value="">No Parent</option>
          {parentOptions.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>

        <div className="flex gap-3 md:col-span-5">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-green-600 px-4 py-2 text-white disabled:opacity-60"
          >
            {loading
              ? "Saving..."
              : editingId
              ? "Update Account"
              : "Create Account"}
          </button>

          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border px-4 py-2"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="grid gap-6 xl:grid-cols-2">
        {groupedAccounts.map((group) => (
          <div
            key={group.type}
            className="rounded-2xl border bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-bold text-slate-900">
              {typeLabels[group.type]}
            </h2>

            <div className="mt-4 space-y-3">
              {group.accounts.length === 0 ? (
                <p className="text-sm text-slate-500">No accounts found.</p>
              ) : (
                group.accounts.map((account) => {
                  const isChild = Boolean(account.parentId);
                  const parent = accounts.find(
                    (item) => item.id === account.parentId
                  );

                  return (
                    <div
                      key={account.id}
                      className={`rounded-xl border p-4 ${
                        isChild ? "ml-6 bg-slate-50" : "bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {isChild ? "↳ " : ""}
                            {account.name}
                          </p>

                          <p className="text-sm text-slate-500">
                            Code: {account.code || "-"}
                            {parent ? ` • Parent: ${parent.name}` : ""}
                            {account.isSystem ? " • System" : ""}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(account)}
                            className="rounded-md border px-3 py-2 text-sm"
                          >
                            Edit
                          </button>

                          {!account.isSystem ? (
                            <button
                              onClick={() => archiveAccount(account)}
                              className="rounded-md border px-3 py-2 text-sm text-red-600"
                            >
                              Archive
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}