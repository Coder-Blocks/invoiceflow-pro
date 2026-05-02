"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type SalarySlip = {
  id: string;
  month: number;
  year: number;
  status: string;
  netSalary: string | number;
};

type EmployeeData = {
  id: string;
  employeeCode?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
  department?: string | null;
  joiningDate?: string | null;
  status: string;
  basicSalary: string | number;
  hra: string | number;
  allowance: string | number;
  deduction: string | number;
  pfDeduction: string | number;
  esiDeduction: string | number;
  professionalTax: string | number;
  salarySlips: SalarySlip[];
};

const emptyForm = {
  employeeCode: "",
  name: "",
  email: "",
  phone: "",
  designation: "",
  department: "",
  joiningDate: "",
  status: "ACTIVE",
  basicSalary: "",
  hra: "",
  allowance: "",
  deduction: "",
  pfDeduction: "",
  esiDeduction: "",
  professionalTax: "",
};

export default function EmployeeDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadEmployee() {
    try {
      setLoading(true);

      const res = await fetch(`/api/employees/${params.id}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Failed to load employee");
        return;
      }

      const emp: EmployeeData = data.data;

      setEmployee(emp);
      setForm({
        employeeCode: emp.employeeCode || "",
        name: emp.name || "",
        email: emp.email || "",
        phone: emp.phone || "",
        designation: emp.designation || "",
        department: emp.department || "",
        joiningDate: emp.joiningDate
          ? new Date(emp.joiningDate).toISOString().slice(0, 10)
          : "",
        status: emp.status || "ACTIVE",
        basicSalary: String(emp.basicSalary || ""),
        hra: String(emp.hra || ""),
        allowance: String(emp.allowance || ""),
        deduction: String(emp.deduction || ""),
        pfDeduction: String(emp.pfDeduction || ""),
        esiDeduction: String(emp.esiDeduction || ""),
        professionalTax: String(emp.professionalTax || ""),
      });
    } catch (error) {
      console.error("LOAD_EMPLOYEE_ERROR:", error);
      alert("Failed to load employee");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params.id) {
      loadEmployee();
    }
  }, [params.id]);

  const salary = useMemo(() => {
    const gross =
      Number(form.basicSalary || 0) +
      Number(form.hra || 0) +
      Number(form.allowance || 0);

    const deductions =
      Number(form.deduction || 0) +
      Number(form.pfDeduction || 0) +
      Number(form.esiDeduction || 0) +
      Number(form.professionalTax || 0);

    return {
      gross,
      deductions,
      net: gross - deductions,
    };
  }, [form]);

  async function updateEmployee(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Employee name is required");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/employees/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          basicSalary: Number(form.basicSalary || 0),
          hra: Number(form.hra || 0),
          allowance: Number(form.allowance || 0),
          deduction: Number(form.deduction || 0),
          pfDeduction: Number(form.pfDeduction || 0),
          esiDeduction: Number(form.esiDeduction || 0),
          professionalTax: Number(form.professionalTax || 0),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Failed to update employee");
        return;
      }

      alert("Employee updated successfully");
      await loadEmployee();
    } catch (error) {
      console.error("UPDATE_EMPLOYEE_CLIENT_ERROR:", error);
      alert("Failed to update employee");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateEmployee() {
    if (!confirm("Deactivate this employee?")) return;

    try {
      const res = await fetch(`/api/employees/${params.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Failed to deactivate employee");
        return;
      }

      alert("Employee deactivated");
      router.push("/employees");
    } catch (error) {
      console.error("DEACTIVATE_EMPLOYEE_CLIENT_ERROR:", error);
      alert("Failed to deactivate employee");
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-slate-600 shadow-sm">
        Loading employee...
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-slate-600 shadow-sm">
        Employee not found.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{employee.name}</h1>
          <p className="mt-1 text-slate-600">
            Employee profile, salary structure and salary slip history.
          </p>
        </div>

        <Link href="/employees" className="rounded-md border px-4 py-2">
          Back to Employees
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Gross Salary" value={`₹${salary.gross.toFixed(2)}`} />
        <Card title="Deductions" value={`₹${salary.deductions.toFixed(2)}`} />
        <Card title="Net Salary" value={`₹${salary.net.toFixed(2)}`} />
      </div>

      <form
        onSubmit={updateEmployee}
        className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm"
      >
        <h2 className="text-xl font-semibold text-slate-900">Edit Employee</h2>

        <div className="grid gap-4 md:grid-cols-3">
          <input
            className="rounded-md border p-3"
            placeholder="Employee Code"
            value={form.employeeCode}
            onChange={(e) =>
              setForm((p) => ({ ...p, employeeCode: e.target.value }))
            }
          />

          <input
            className="rounded-md border p-3"
            placeholder="Employee Name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />

          <input
            className="rounded-md border p-3"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          />

          <input
            className="rounded-md border p-3"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          />

          <input
            className="rounded-md border p-3"
            placeholder="Designation"
            value={form.designation}
            onChange={(e) =>
              setForm((p) => ({ ...p, designation: e.target.value }))
            }
          />

          <input
            className="rounded-md border p-3"
            placeholder="Department"
            value={form.department}
            onChange={(e) =>
              setForm((p) => ({ ...p, department: e.target.value }))
            }
          />

          <input
            className="rounded-md border p-3"
            type="date"
            value={form.joiningDate}
            onChange={(e) =>
              setForm((p) => ({ ...p, joiningDate: e.target.value }))
            }
          />

          <select
            className="rounded-md border p-3"
            value={form.status}
            onChange={(e) =>
              setForm((p) => ({ ...p, status: e.target.value }))
            }
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>

        <h3 className="font-semibold text-slate-900">Salary Structure</h3>

        <div className="grid gap-4 md:grid-cols-4">
          <input
            className="rounded-md border p-3"
            type="number"
            placeholder="Basic Salary"
            value={form.basicSalary}
            onChange={(e) =>
              setForm((p) => ({ ...p, basicSalary: e.target.value }))
            }
          />

          <input
            className="rounded-md border p-3"
            type="number"
            placeholder="HRA"
            value={form.hra}
            onChange={(e) => setForm((p) => ({ ...p, hra: e.target.value }))}
          />

          <input
            className="rounded-md border p-3"
            type="number"
            placeholder="Allowance"
            value={form.allowance}
            onChange={(e) =>
              setForm((p) => ({ ...p, allowance: e.target.value }))
            }
          />

          <input
            className="rounded-md border p-3"
            type="number"
            placeholder="Other Deduction"
            value={form.deduction}
            onChange={(e) =>
              setForm((p) => ({ ...p, deduction: e.target.value }))
            }
          />

          <input
            className="rounded-md border p-3"
            type="number"
            placeholder="PF Deduction"
            value={form.pfDeduction}
            onChange={(e) =>
              setForm((p) => ({ ...p, pfDeduction: e.target.value }))
            }
          />

          <input
            className="rounded-md border p-3"
            type="number"
            placeholder="ESI Deduction"
            value={form.esiDeduction}
            onChange={(e) =>
              setForm((p) => ({ ...p, esiDeduction: e.target.value }))
            }
          />

          <input
            className="rounded-md border p-3"
            type="number"
            placeholder="Professional Tax"
            value={form.professionalTax}
            onChange={(e) =>
              setForm((p) => ({ ...p, professionalTax: e.target.value }))
            }
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-600 px-5 py-2.5 font-medium text-white disabled:opacity-60"
          >
            {saving ? "Updating..." : "Update Employee"}
          </button>

          <button
            type="button"
            onClick={deactivateEmployee}
            className="rounded-md border px-5 py-2.5 font-medium text-red-600"
          >
            Deactivate
          </button>
        </div>
      </form>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">
          Salary Slips
        </h2>

        {employee.salarySlips.length === 0 ? (
          <p className="text-sm text-slate-500">No salary slips yet.</p>
        ) : (
          <div className="space-y-3">
            {employee.salarySlips.map((slip) => (
              <div
                key={slip.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {slip.month}/{slip.year}
                  </p>
                  <p className="text-sm text-slate-500">{slip.status}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-semibold text-blue-700">
                    ₹{Number(slip.netSalary).toFixed(2)}
                  </p>

                  <Link
                    href={`/payroll/slips/${slip.id}`}
                    className="rounded-md border px-3 py-2 text-sm"
                  >
                    View Slip
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="mt-2 text-xl font-bold text-blue-700">{value}</h2>
    </div>
  );
}