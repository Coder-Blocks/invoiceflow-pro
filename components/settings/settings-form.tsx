"use client";

import { useState } from "react";

type Props = {
  defaultValues: {
    name: string;
    email: string;
    phone: string;
    currency: string;
    timezone: string;
    invoicePrefix: string;
    estimatePrefix: string;
    plan?: string;
    logoUrl?: string | null;
  };
};

export default function SettingsForm({ defaultValues }: Props) {
  const [form, setForm] = useState({
    name: defaultValues.name || "",
    email: defaultValues.email || "",
    phone: defaultValues.phone || "",
    currency: defaultValues.currency || "INR",
    timezone: defaultValues.timezone || "Asia/Kolkata",
    invoicePrefix: defaultValues.invoicePrefix || "INV",
    estimatePrefix: defaultValues.estimatePrefix || "EST",
  });

  const [logo, setLogo] = useState<string | null>(defaultValues.logoUrl || null);
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: fd,
    });

    const data = await res.json();
    setUploadingLogo(false);

    if (!data.success) {
      alert(data.error || "Upload failed");
      return;
    }

    setLogo(data.url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...form,
        logoUrl: logo,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!data.success) {
      alert(data.error || "Failed to update settings");
      return;
    }

    setMessage("Settings updated successfully");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Company Logo
        </label>

        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border bg-slate-50">
            {logo ? (
              <img src={logo} alt="Company logo" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-blue-600">₹</span>
            )}
          </div>

          <div className="space-y-2">
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleLogoUpload(e.target.files[0]);
                }
              }}
              className="block text-sm"
            />
            {uploadingLogo ? (
              <p className="text-sm text-blue-600">Uploading logo...</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          className="h-11 rounded-md border px-3"
          placeholder="Workspace Name"
          required
        />

        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          className="h-11 rounded-md border px-3"
          placeholder="Company Email"
        />

        <input
          type="text"
          value={form.phone}
          onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
          className="h-11 rounded-md border px-3"
          placeholder="Phone"
        />

        <input
          type="text"
          value={form.currency}
          onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
          className="h-11 rounded-md border px-3"
          placeholder="Currency"
        />

        <input
          type="text"
          value={form.timezone}
          onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
          className="h-11 rounded-md border px-3"
          placeholder="Timezone"
        />

        <input
          type="text"
          value={defaultValues.plan || "FREE"}
          className="h-11 rounded-md border bg-slate-50 px-3"
          disabled
        />

        <input
          type="text"
          value={form.invoicePrefix}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, invoicePrefix: e.target.value.toUpperCase() }))
          }
          className="h-11 rounded-md border px-3"
          placeholder="Invoice Prefix"
        />

        <input
          type="text"
          value={form.estimatePrefix}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, estimatePrefix: e.target.value.toUpperCase() }))
          }
          className="h-11 rounded-md border px-3"
          placeholder="Estimate Prefix"
        />
      </div>

      {message ? (
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-600">
          {message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-blue-600 px-5 py-2.5 text-white disabled:opacity-60"
      >
        {loading ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
}