"use client";

import { useEffect, useState } from "react";

type TeamMember = {
  id: string;
  role: string;
  status: string;
  user: {
    id: string;
    name?: string | null;
    email: string;
    image?: string | null;
  };
};

const roles = ["ADMIN", "ACCOUNTANT", "STAFF", "MEMBER"];

const roleDescriptions: Record<string, string> = {
  OWNER: "Full control. Cannot be removed.",
  ADMIN: "Manage team, settings, invoices, inventory and reports.",
  ACCOUNTANT: "Manage accounting, GST, invoices, payments and reports.",
  STAFF: "Manage customers, invoices, stock and daily operations.",
  MEMBER: "Basic view and limited access.",
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const [form, setForm] = useState({
    email: "",
    role: "MEMBER",
  });

  async function loadMembers() {
    try {
      setLoadingMembers(true);

      const res = await fetch("/api/team", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Failed to load team");
        return;
      }

      setMembers(data.data);
    } catch (error) {
      console.error("LOAD_TEAM_ERROR:", error);
      alert("Failed to load team");
    } finally {
      setLoadingMembers(false);
    }
  }

  useEffect(() => {
    loadMembers();
  }, []);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();

    if (!form.email.trim()) {
      alert("Email is required");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/team", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!data.success) {
      alert(data.error || "Failed to add member");
      return;
    }

    alert("Team member added successfully");

    setForm({
      email: "",
      role: "MEMBER",
    });

    loadMembers();
  }

  async function updateRole(memberId: string, role: string) {
    const res = await fetch(`/api/team/${memberId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role }),
    });

    const data = await res.json();

    if (!data.success) {
      alert(data.error || "Failed to update role");
      return;
    }

    loadMembers();
  }

  async function removeMember(memberId: string) {
    if (!confirm("Remove this member from workspace?")) return;

    const res = await fetch(`/api/team/${memberId}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!data.success) {
      alert(data.error || "Failed to remove member");
      return;
    }

    alert("Member removed");
    loadMembers();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Team & Roles</h1>
        <p className="mt-1 text-slate-600">
          Add team members and control what each person can access.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-5">
        <RoleCard role="OWNER" />
        <RoleCard role="ADMIN" />
        <RoleCard role="ACCOUNTANT" />
        <RoleCard role="STAFF" />
        <RoleCard role="MEMBER" />
      </section>

      <form
        onSubmit={addMember}
        className="grid gap-4 rounded-2xl border bg-white p-6 shadow-sm md:grid-cols-3"
      >
        <div className="md:col-span-3">
          <h2 className="text-xl font-semibold text-slate-900">
            Add Existing User
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            User must sign up once before you can add them to your workspace.
          </p>
        </div>

        <input
          type="email"
          className="rounded-md border p-3 md:col-span-2"
          placeholder="User email"
          value={form.email}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, email: e.target.value }))
          }
          required
        />

        <select
          className="rounded-md border p-3"
          value={form.role}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, role: e.target.value }))
          }
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-3 text-white md:col-span-3"
        >
          {loading ? "Adding..." : "Add Team Member"}
        </button>
      </form>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">
          Team Members
        </h2>

        {loadingMembers ? (
          <p className="text-sm text-slate-500">Loading members...</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-slate-500">No members found.</p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 ${
                  member.status !== "ACTIVE" ? "bg-slate-50 opacity-60" : ""
                }`}
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {member.user.name || "Unnamed User"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {member.user.email} • {member.status}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {member.role === "OWNER" ? (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      OWNER
                    </span>
                  ) : (
                    <select
                      className="rounded-md border p-2 text-sm"
                      value={member.role}
                      disabled={member.status !== "ACTIVE"}
                      onChange={(e) => updateRole(member.id, e.target.value)}
                    >
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  )}

                  {member.role !== "OWNER" && member.status === "ACTIVE" ? (
                    <button
                      onClick={() => removeMember(member.id)}
                      className="rounded-md border px-3 py-2 text-sm text-red-600"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function RoleCard({ role }: { role: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <p className="font-bold text-blue-700">{role}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        {roleDescriptions[role]}
      </p>
    </div>
  );
}