import Link from "next/link";
import { ReceiptText, TrendingDown, WalletCards } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

export default async function ExpensesPage() {
  const active = await requireActiveOrganization();

  const expenses = await prisma.expense.findMany({
    where: {
      organizationId: active.organizationId,
    },
    orderBy: {
      date: "desc",
    },
  });

  const total = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0
  );

  const upiTotal = expenses
    .filter((expense) => expense.sourceType === "UPI")
    .reduce((sum, expense) => sum + Number(expense.amount), 0);

  const manualTotal = expenses
    .filter((expense) => expense.sourceType !== "UPI")
    .reduce((sum, expense) => sum + Number(expense.amount), 0);

  return (
    <div className="premium-page space-y-8 p-1">
      <div className="relative overflow-hidden rounded-4xl bg-linear-to-r from-blue-800 via-blue-700 to-indigo-700 p-8 text-white shadow-2xl shadow-blue-200">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 left-20 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-100">
              InvoiceFlow Pro
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">
              Expenses
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
              Track purchases, UPI payments, bills, GST expenses, and business
              spending from one premium dashboard.
            </p>
          </div>

          <Link
            href="/expenses/new"
            className="rounded-2xl bg-white px-6 py-3 font-bold text-blue-700 shadow-xl transition hover:scale-105"
          >
            + Add Expense
          </Link>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <StatCard
          title="Total Expenses"
          value={`₹${total.toFixed(2)}`}
          description="All recorded spending"
          icon={<TrendingDown className="h-5 w-5" />}
        />

        <StatCard
          title="UPI Expenses"
          value={`₹${upiTotal.toFixed(2)}`}
          description="Auto-created from screenshots"
          icon={<WalletCards className="h-5 w-5" />}
        />

        <StatCard
          title="Manual Expenses"
          value={`₹${manualTotal.toFixed(2)}`}
          description="Entered by your team"
          icon={<ReceiptText className="h-5 w-5" />}
        />
      </div>

      <div className="premium-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-6">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Expense Records
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Latest purchase and payment records from your workspace.
            </p>
          </div>

          <Link href="/upi" className="premium-button-soft">
            Upload UPI Screenshot
          </Link>
        </div>

        <div className="overflow-x-auto p-6">
          {expenses.length === 0 ? (
            <div className="premium-empty">
              <h3 className="text-lg font-bold text-slate-900">
                No expenses found
              </h3>
              <p className="mt-2">
                Add your first expense or upload a UPI screenshot.
              </p>
            </div>
          ) : (
            <table className="premium-table">
              <thead className="premium-table-head">
                <tr>
                  <th className="px-4 py-4 text-left">Date</th>
                  <th className="px-4 py-4 text-left">Title</th>
                  <th className="px-4 py-4 text-left">Vendor</th>
                  <th className="px-4 py-4 text-left">Category</th>
                  <th className="px-4 py-4 text-left">Amount</th>
                  <th className="px-4 py-4 text-left">Source</th>
                  <th className="px-4 py-4 text-left">UPI Ref</th>
                  <th className="px-4 py-4 text-left">Notes</th>
                </tr>
              </thead>

              <tbody>
                {expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-b border-slate-100 transition hover:bg-blue-50/60"
                  >
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                      {new Date(expense.date).toISOString().slice(0, 10)}
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-900">
                      {expense.title}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {expense.vendor || "-"}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                        {expense.category || "General"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-black text-slate-950">
                      ₹{Number(expense.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {expense.sourceType || "MANUAL"}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {expense.upiRef || "-"}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {expense.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="premium-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            {value}
          </h2>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </div>

        <div className="rounded-2xl bg-linear-to-br from-blue-700 to-blue-500 p-3 text-white shadow-lg shadow-blue-200">
          {icon}
        </div>
      </div>
    </div>
  );
}