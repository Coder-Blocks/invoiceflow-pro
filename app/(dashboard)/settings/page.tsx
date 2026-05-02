"use client";

import { useEffect, useState } from "react";

type SettingsForm = {
  name: string;
  email: string;
  phone: string;
  logoUrl: string;

  companyAddress: string;
  companyEmail: string;
  companyPhone: string;

  smtpEmail: string;
  smtpAppPassword:string;
  smtpFromName: string;

  bankName: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  qrCodeUrl: string;

  watermarkText: string;
};

const emptyForm: SettingsForm = {
  name: "",
  email: "",
  phone: "",
  logoUrl: "",

  companyAddress: "",
  companyEmail: "",
  companyPhone: "",

  smtpEmail: "",
  smtpAppPassword: "",
  smtpFromName: "",

  bankName: "",
  accountName: "",
  accountNumber: "",
  ifscCode: "",
  upiId: "",
  qrCodeUrl: "",

  watermarkText: "",
};

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadSettings() {
    try {
      setLoading(true);

      const res = await fetch("/api/settings", {
        cache: "no-store",
      });

      const json = await res.json();

      if (!json.success) {
        alert(json.error || "Failed to load settings");
        return;
      }

      const data = json.data;

      setForm({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        logoUrl: data.logoUrl || "",

        companyAddress: data.companyAddress || "",
        companyEmail: data.companyEmail || "",
        companyPhone: data.companyPhone || "",

        smtpEmail: data.smtpEmail || "",
        smtpAppPassword: data.smtpAppPassword || "",
        smtpFromName: data.smtpFromName || "",

        bankName: data.bankName || "",
        accountName: data.accountName || "",
        accountNumber: data.accountNumber || "",
        ifscCode: data.ifscCode || "",
        upiId: data.upiId || "",
        qrCodeUrl: data.qrCodeUrl || "",

        watermarkText: data.watermarkText || "",
      });
    } catch (error) {
      console.error("LOAD_SETTINGS_ERROR:", error);
      alert("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  function updateField<K extends keyof SettingsForm>(
    key: K,
    value: SettingsForm[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await res.json();

      if (!json.success) {
        alert(json.error || "Failed to save settings");
        return;
      }

      alert("Settings saved successfully");
      await loadSettings();
    } catch (error) {
      console.error("SAVE_SETTINGS_ERROR:", error);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-slate-600 shadow-sm">
        Loading settings...
      </div>
    );
  }

  return (
    <form onSubmit={saveSettings} className="space-y-8">
      <div className="rounded-3xl bg-linear-to-r from-blue-700 to-indigo-700 p-8 text-white shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">
          Company Branding
        </p>
        <h1 className="mt-3 text-4xl font-black">Settings</h1>
        <p className="mt-2 text-blue-100">
          These details will appear on invoices, PDFs, payslips and emails.
        </p>
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Company Details</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Input
            label="Company Name"
            value={form.name}
            onChange={(value) => updateField("name", value)}
            required
          />

          <Input
            label="Main Email"
            value={form.email}
            onChange={(value) => updateField("email", value)}
          />

          <Input
            label="Phone"
            value={form.phone}
            onChange={(value) => updateField("phone", value)}
          />

          <Input
            label="Company Email for PDF / Mail"
            value={form.companyEmail}
            onChange={(value) => updateField("companyEmail", value)}
          />

          <Input
            label="Company Phone for PDF"
            value={form.companyPhone}
            onChange={(value) => updateField("companyPhone", value)}
          />

          <Input
            label="Logo URL"
            value={form.logoUrl}
            onChange={(value) => updateField("logoUrl", value)}
            placeholder="/logo.png or uploaded image URL"
          />

          <div className="md:col-span-2">
            <Textarea
              label="Company Address"
              value={form.companyAddress}
              onChange={(value) => updateField("companyAddress", value)}
            />
          </div>
        </div>

        {form.logoUrl ? (
          <div className="mt-5">
            <p className="mb-2 text-sm font-medium text-slate-700">
              Logo Preview
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={form.logoUrl}
              alt="Company Logo"
              className="h-20 w-20 rounded-xl border object-contain p-2"
            />
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
  <h2 className="text-xl font-bold text-slate-900">
    Bank / UPI Details
  </h2>

  <div className="mt-5 grid gap-4 md:grid-cols-2">
    {/* ఇతర ఫీల్డ్‌లు యథాతథంగా ఉంచండి */}
    <Input
      label="Bank Name"
      value={form.bankName}
      onChange={(value) => updateField("bankName", value)}
    />
    <Input
      label="Account Holder Name"
      value={form.accountName}
      onChange={(value) => updateField("accountName", value)}
    />
    <Input
      label="Account Number"
      value={form.accountNumber}
      onChange={(value) => updateField("accountNumber", value)}
    />
    <Input
      label="IFSC Code"
      value={form.ifscCode}
      onChange={(value) => updateField("ifscCode", value)}
    />
    <Input
      label="UPI ID"
      value={form.upiId}
      onChange={(value) => updateField("upiId", value)}
      placeholder="example@upi"
    />

    {/* ----- మార్పు ఇక్కడ మొదలవుతుంది ----- */}
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        QR Code Upload
      </label>
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            // ఒకవేళ ఇప్పటికే upload అవుతుంటే ignore
            if ((window as any).__qrUploading) return;
            (window as any).__qrUploading = true;

            try {
              const formData = new FormData();
              formData.append("file", file);

              const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
              });

              const json = await res.json();
              if (!json.success) {
                alert(json.error || "QR upload failed");
                return;
              }

              // URL (లేదా data URL) set చేయండి
              updateField("qrCodeUrl", json.url);
            } catch (err) {
              console.error("QR_UPLOAD_ERROR:", err);
              alert("QR upload failed");
            } finally {
              (window as any).__qrUploading = false;
              // input value రీసెట్ చేయండి (ఒకే ఫైల్ మళ్ళీ ఎంచుకోవడానికి)
              e.target.value = "";
            }
          }}
          className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {form.qrCodeUrl && (
          <button
            type="button"
            onClick={() => updateField("qrCodeUrl", "")}
            className="text-xs text-red-500 hover:underline whitespace-nowrap"
          >
            Remove
          </button>
        )}
      </div>
      {form.qrCodeUrl && (
        <p className="mt-1 text-xs text-slate-400 truncate max-w-50">
          {form.qrCodeUrl.length > 40
            ? form.qrCodeUrl.substring(0, 40) + '...'
            : form.qrCodeUrl}
        </p>
      )}
    </div>
    {/* ----- మార్పు ముగింపు ----- */}
  </div>

  {form.qrCodeUrl ? (
    <div className="mt-5">
      <p className="mb-2 text-sm font-medium text-slate-700">
        QR Preview
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={form.qrCodeUrl}
        alt="QR Code"
        className="h-28 w-28 rounded-xl border object-contain p-2"
      />
    </div>
  ) : null}
</section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
         <h2 className="text-xl font-bold text-slate-900">Email Sending Settings</h2>
         <p className="mt-1 text-sm text-slate-500">
             Payslip and invoice emails will be sent using this Gmail App Password.
         </p>

       <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Input
            label="SMTP Email / Gmail"
           value={form.smtpEmail}
            onChange={(value) => updateField("smtpEmail", value)}
           placeholder="yourcompany@gmail.com"
         />

    <Input
      label="Gmail App Password"
      value={form.smtpAppPassword}
      onChange={(value) => updateField("smtpAppPassword", value)}
      placeholder="16 character app password"
    />

    <Input
      label="From Name"
      value={form.smtpFromName}
      onChange={(value) => updateField("smtpFromName", value)}
      placeholder="Company Name"
    />
  </div>
</section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          PDF Watermark
        </h2>

        <div className="mt-5">
          <Input
            label="Watermark Text"
            value={form.watermarkText}
            onChange={(value) => updateField("watermarkText", value)}
            placeholder="Company Name / Paid / Confidential"
          />
        </div>
      </section>

      <div className="sticky bottom-4 z-20 rounded-2xl border bg-white p-4 shadow-lg">
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-60 md:w-auto"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </form>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-600"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-600"
      />
    </label>
  );
}