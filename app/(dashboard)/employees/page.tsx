"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Employee = {
  id: string;
  employeeCode?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  designation?: string | null;
  department?: string | null;
  status: string;
  basicSalary: string | number;
  hra: string | number;
  allowance: string | number;
  deduction: string | number;
  pfDeduction: string | number;
  esiDeduction: string | number;
  professionalTax: string | number;
};

const initialForm = {
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

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  async function loadEmployees() {
    try {
      setLoadingEmployees(true);

      const res = await fetch("/api/employees", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Failed to load employees");
        return;
      }

      setEmployees(data.data);
    } catch (error) {
      console.error("LOAD_EMPLOYEES_ERROR:", error);
      alert("Failed to load employees");
    } finally {
      setLoadingEmployees(false);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    const q = search.toLowerCase().trim();

    if (!q) return employees;

    return employees.filter((employee) =>
      [
        employee.name,
        employee.employeeCode,
        employee.email,
        employee.phone,
        employee.designation,
        employee.department,
        employee.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [employees, search]);

  const summary = useMemo(() => {
    const active = employees.filter((employee) => employee.status === "ACTIVE");

    const totalGross = active.reduce((sum, employee) => {
      return (
        sum +
        Number(employee.basicSalary || 0) +
        Number(employee.hra || 0) +
        Number(employee.allowance || 0)
      );
    }, 0);

    const totalDeductions = active.reduce((sum, employee) => {
      return (
        sum +
        Number(employee.deduction || 0) +
        Number(employee.pfDeduction || 0) +
        Number(employee.esiDeduction || 0) +
        Number(employee.professionalTax || 0)
      );
    }, 0);

    return {
      total: employees.length,
      active: active.length,
      inactive: employees.filter((employee) => employee.status !== "ACTIVE")
        .length,
      totalGross,
      totalDeductions,
      totalNet: totalGross - totalDeductions,
    };
  }, [employees]);

  async function createEmployee(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Employee name is required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
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
        alert(data.error || "Failed to create employee");
        return;
      }

      alert("Employee created successfully");
      setForm(initialForm);
      await loadEmployees();
    } catch (error) {
      console.error("CREATE_EMPLOYEE_CLIENT_ERROR:", error);
      alert("Failed to create employee");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Employees</h1>
        <p className="mt-1 text-slate-600">
          Manage employee records, salary structure and payroll-ready staff data.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card title="Total" value={String(summary.total)} />
        <Card title="Active" value={String(summary.active)} />
        <Card title="Inactive" value={String(summary.inactive)} />
        <Card title="Gross / Month" value={`₹${summary.totalGross.toFixed(2)}`} />
        <Card title="Deductions" value={`₹${summary.totalDeductions.toFixed(2)}`} />
        <Card title="Net / Month" value={`₹${summary.totalNet.toFixed(2)}`} />
      </div>

      <form
        onSubmit={createEmployee}
        className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm"
      >
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Add Employee</h2>
          <p className="mt-1 text-sm text-slate-500">
            Add basic employee details and salary structure.
          </p>
        </div>

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

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-5 py-2.5 font-medium text-white disabled:opacity-60"
        >
          {loading ? "Saving..." : "Save Employee"}
        </button>
      </form>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Employee List
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Search and manage employees.
            </p>
          </div>

          <input
            className="rounded-md border p-3"
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loadingEmployees ? (
          <p className="text-sm text-slate-500">Loading employees...</p>
        ) : filteredEmployees.length === 0 ? (
          <p className="text-sm text-slate-500">No employees found.</p>
        ) : (
          <div className="space-y-3">
            {filteredEmployees.map((employee) => {
              const gross =
                Number(employee.basicSalary || 0) +
                Number(employee.hra || 0) +
                Number(employee.allowance || 0);

              const deductions =
                Number(employee.deduction || 0) +
                Number(employee.pfDeduction || 0) +
                Number(employee.esiDeduction || 0) +
                Number(employee.professionalTax || 0);

              const net = gross - deductions;

              return (
                <div
                  key={employee.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {employee.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {employee.employeeCode || "-"} •{" "}
                      {employee.designation || "-"} •{" "}
                      {employee.department || "-"} • {employee.status}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-semibold text-blue-700">
                      Net ₹{net.toFixed(2)}
                    </p>

                    <Link
                      href={`/employees/${employee.id}`}
                      className="rounded-md border px-3 py-2 text-sm"
                    >
                      View / Edit
                    </Link>
                  </div>
                </div>
              );
            })}
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
      <h2 className="mt-2 text-lg font-bold text-blue-700">{value}</h2>
    </div>
  );
}