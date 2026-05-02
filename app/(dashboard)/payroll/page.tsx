"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PayrollRun = {
  id: string;
  month: number;
  year: number;
  status: string;
  grossAmount: string | number;
  totalDeductions: string | number;
  netAmount: string | number;
  salarySlips: Array<{
    id: string;
    status: string;
    grossSalary: string | number;
    totalDeductions: string | number;
    netSalary: string | number;
    employee: {
      id: string;
      name: string;
      employeeCode?: string | null;
      designation?: string | null;
    };
  }>;
};

export default function PayrollPage() {
  const today = new Date();

  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [payingSlipId, setPayingSlipId] = useState("");

  const [form, setForm] = useState({
    month: String(today.getMonth() + 1),
    year: String(today.getFullYear()),
  });

  async function loadRuns() {
    try {
      setLoadingRuns(true);

      const res = await fetch("/api/payroll/runs", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Failed to load payroll");
        return;
      }

      setRuns(data.data);
    } catch (error) {
      console.error("LOAD_PAYROLL_RUNS_ERROR:", error);
      alert("Failed to load payroll");
    } finally {
      setLoadingRuns(false);
    }
  }

  useEffect(() => {
    loadRuns();
  }, []);

  const summary = useMemo(() => {
    const latest = runs[0];

    const allSlips = runs.flatMap((run) => run.salarySlips);
    const paidSlips = allSlips.filter((slip) => slip.status === "PAID");
    const pendingSlips = allSlips.filter((slip) => slip.status !== "PAID");

    return {
      totalRuns: runs.length,
      totalSlips: allSlips.length,
      paidSlips: paidSlips.length,
      pendingSlips: pendingSlips.length,
      latestGross: latest ? Number(latest.grossAmount) : 0,
      latestDeductions: latest ? Number(latest.totalDeductions) : 0,
      latestNet: latest ? Number(latest.netAmount) : 0,
    };
  }, [runs]);

  async function generatePayroll(e: React.FormEvent) {
    e.preventDefault();

    setGenerating(true);

    try {
      const res = await fetch("/api/payroll/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month: Number(form.month),
          year: Number(form.year),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Failed to generate payroll");
        return;
      }

      alert("Payroll generated successfully");
      await loadRuns();
    } catch (error) {
      console.error("GENERATE_PAYROLL_CLIENT_ERROR:", error);
      alert("Failed to generate payroll");
    } finally {
      setGenerating(false);
    }
  }

  async function markPaid(slipId: string) {
    setPayingSlipId(slipId);

    try {
      const res = await fetch(`/api/payroll/slips/${slipId}/pay`, {
        method: "POST",
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Failed to mark paid");
        return;
      }

      alert("Salary marked as paid");
      await loadRuns();
    } catch (error) {
      console.error("MARK_PAID_CLIENT_ERROR:", error);
      alert("Failed to mark paid");
    } finally {
      setPayingSlipId("");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Payroll</h1>
        <p className="mt-1 text-slate-600">
          Generate salary slips, calculate salary deductions, and mark payments.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-7">
        <Card title="Payroll Runs" value={String(summary.totalRuns)} />
        <Card title="Salary Slips" value={String(summary.totalSlips)} />
        <Card title="Paid Slips" value={String(summary.paidSlips)} />
        <Card title="Pending Slips" value={String(summary.pendingSlips)} />
        <Card title="Latest Gross" value={`₹${summary.latestGross.toFixed(2)}`} />
        <Card
          title="Latest Deductions"
          value={`₹${summary.latestDeductions.toFixed(2)}`}
        />
        <Card title="Latest Net" value={`₹${summary.latestNet.toFixed(2)}`} />
      </div>

      <form
        onSubmit={generatePayroll}
        className="grid gap-4 rounded-2xl border bg-white p-6 shadow-sm md:grid-cols-4"
      >
        <div className="md:col-span-4">
          <h2 className="text-xl font-semibold text-slate-900">
            Generate Monthly Payroll
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Payroll will be generated for all ACTIVE employees.
          </p>
        </div>

        <select
          className="rounded-md border p-3"
          value={form.month}
          onChange={(e) => setForm((p) => ({ ...p, month: e.target.value }))}
        >
          {Array.from({ length: 12 }).map((_, index) => (
            <option key={index + 1} value={index + 1}>
              Month {index + 1}
            </option>
          ))}
        </select>

        <input
          className="rounded-md border p-3"
          type="number"
          value={form.year}
          onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}
        />

        <button
          type="submit"
          disabled={generating}
          className="rounded-md bg-blue-600 px-4 py-2 text-white md:col-span-2"
        >
          {generating ? "Generating..." : "Generate Payroll"}
        </button>
      </form>

      <section className="space-y-6">
        {loadingRuns ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500">
            Loading payroll...
          </div>
        ) : runs.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500">
            No payroll runs found.
          </div>
        ) : (
          runs.map((run) => (
            <div key={run.id} className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Payroll {run.month}/{run.year}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Status: {run.status} • Slips: {run.salarySlips.length}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm text-slate-500">Net Amount</p>
                  <p className="text-xl font-bold text-blue-700">
                    ₹{Number(run.netAmount).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left">Employee</th>
                      <th className="px-4 py-3 text-left">Gross</th>
                      <th className="px-4 py-3 text-left">Deductions</th>
                      <th className="px-4 py-3 text-left">Net</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {run.salarySlips.map((slip) => (
                      <tr key={slip.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">
                            {slip.employee.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {slip.employee.employeeCode || "-"} •{" "}
                            {slip.employee.designation || "-"}
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          ₹{Number(slip.grossSalary).toFixed(2)}
                        </td>

                        <td className="px-4 py-3">
                          ₹{Number(slip.totalDeductions).toFixed(2)}
                        </td>

                        <td className="px-4 py-3 font-semibold text-blue-700">
                          ₹{Number(slip.netSalary).toFixed(2)}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              slip.status === "PAID"
                                ? "bg-green-50 text-green-700"
                                : "bg-yellow-50 text-yellow-700"
                            }`}
                          >
                            {slip.status}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/payroll/slips/${slip.id}`}
                              className="rounded-md border px-3 py-2 text-xs"
                            >
                              View Slip
                            </Link>

                            {slip.status !== "PAID" ? (
                              <button
                                onClick={() => markPaid(slip.id)}
                                disabled={payingSlipId === slip.id}
                                className="rounded-md bg-green-600 px-3 py-2 text-xs text-white"
                              >
                                {payingSlipId === slip.id
                                  ? "Updating..."
                                  : "Mark Paid"}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="mt-2 text-lg font-bold text-blue-700">{value}</h2>
    </div>
  );
}