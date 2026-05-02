"use client";

import { useEffect, useMemo, useState } from "react";

type ITRForm = {
  financialYear: string;
  assessmentYear: string;

  pan: string;
  aadhaar: string;
  fullName: string;
  email: string;
  mobile: string;
  address: string;

  businessName: string;
  businessType: string;
  gstin: string;

  grossReceipts: number;
  otherIncome: number;
  totalExpenses: number;

  deductions: number;
  advanceTaxPaid: number;
  tdsPaid: number;
};

const defaultForm: ITRForm = {
  financialYear: "2025-26",
  assessmentYear: "2026-27",

  pan: "",
  aadhaar: "",
  fullName: "",
  email: "",
  mobile: "",
  address: "",

  businessName: "",
  businessType: "Proprietorship / Small Business",
  gstin: "",

  grossReceipts: 0,
  otherIncome: 0,
  totalExpenses: 0,

  deductions: 0,
  advanceTaxPaid: 0,
  tdsPaid: 0,
};

function money(value: number) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function calculateTax(taxableIncome: number) {
  const income = Math.max(0, taxableIncome);

  if (income <= 300000) return 0;

  if (income <= 600000) {
    return (income - 300000) * 0.05;
  }

  if (income <= 900000) {
    return 15000 + (income - 600000) * 0.1;
  }

  if (income <= 1200000) {
    return 45000 + (income - 900000) * 0.15;
  }

  if (income <= 1500000) {
    return 90000 + (income - 1200000) * 0.2;
  }

  return 150000 + (income - 1500000) * 0.3;
}

export default function ITRPrepPage() {
  const [form, setForm] = useState<ITRForm>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadAutoData() {
    try {
      setLoading(true);

      const res = await fetch("/api/itr", {
        cache: "no-store",
      });

      const json = await res.json();

      if (!json.success) {
        alert(json.message || json.error || "Failed to load ITR data");
        return;
      }

      const data = json.data;

      setForm((prev) => ({
        ...prev,
        grossReceipts: Number(data.grossReceipts || 0),
        totalExpenses: Number(data.totalExpenses || 0),
      }));
    } catch (error) {
      console.error("LOAD_ITR_DATA_ERROR:", error);
      alert("Failed to load ITR data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAutoData();
  }, []);

  const computed = useMemo(() => {
    const totalIncome =
      Number(form.grossReceipts || 0) + Number(form.otherIncome || 0);

    const netProfit =
      totalIncome - Number(form.totalExpenses || 0);

    const taxableIncome = Math.max(
      0,
      netProfit - Number(form.deductions || 0)
    );

    const taxBeforeCess = calculateTax(taxableIncome);
    const cess = taxBeforeCess * 0.04;
    const totalTax = taxBeforeCess + cess;

    const taxesPaid =
      Number(form.advanceTaxPaid || 0) + Number(form.tdsPaid || 0);

    const balanceTax = totalTax - taxesPaid;

    return {
      totalIncome,
      netProfit,
      taxableIncome,
      taxBeforeCess,
      cess,
      totalTax,
      taxesPaid,
      balanceTax,
      refund: balanceTax < 0 ? Math.abs(balanceTax) : 0,
      payable: balanceTax > 0 ? balanceTax : 0,
    };
  }, [form]);

  function updateField<K extends keyof ITRForm>(
    key: K,
    value: ITRForm[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function saveDraft() {
    try {
      setSaving(true);

      const payload = {
        ...form,
        netProfit: computed.netProfit,
        taxableIncome: computed.taxableIncome,
        taxPayable: computed.totalTax,
      };

      const res = await fetch("/api/itr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        alert(json?.error || "Draft save API not ready. You can still use preview/download later.");
        return;
      }

      alert("ITR draft saved successfully");
    } catch (error) {
      console.error("SAVE_ITR_DRAFT_ERROR:", error);
      alert("Draft save API not ready. Continue with preview.");
    } finally {
      setSaving(false);
    }
  }

  function downloadJson() {
  const payload = {
  ITR: {
    metadata: {
      generatedBy: "InvoiceFlow Pro",
      version: "1.0",
      generatedAt: new Date().toISOString(),
    },

    filingDetails: {
      financialYear: form.financialYear,
      assessmentYear: form.assessmentYear,
      itrForm: "ITR-4",
    },

    assessee: {
      pan: form.pan,
      aadhaar: form.aadhaar,
      name: form.fullName,
      email: form.email,
      mobile: form.mobile,
      address: form.address,
    },

    business: {
      businessName: form.businessName,
      gstin: form.gstin,
    },

    income: {
      grossReceipts: form.grossReceipts,
      otherIncome: form.otherIncome,
      totalIncome: computed.totalIncome,
    },

    expenses: {
      totalExpenses: form.totalExpenses,
    },

    computation: {
      netProfit: computed.netProfit,
      taxableIncome: computed.taxableIncome,
      totalTax: computed.totalTax,
      payable: computed.payable,
      refund: computed.refund,
    },
  },
};

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `itr-${form.financialYear}.json`;

  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function printPDF() {
  window.print();

}
return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">ITR Prep</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-slate-500">Gross Receipts</p>
          <h2 className="text-xl font-bold">₹{form.grossReceipts}</h2>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-slate-500">Total Expenses</p>
          <h2 className="text-xl font-bold">₹{form.totalExpenses}</h2>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-slate-500">Net Profit</p>
          <h2 className="text-xl font-bold">₹{computed.netProfit}</h2>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-slate-500">Tax Payable</p>
          <h2 className="text-xl font-bold">₹{computed.payable}</h2>
        </div>
      </div>

      <button
        onClick={downloadJson}
        className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white"
      >
        Download JSON
      </button>

      <button
        onClick={printPDF}
        className="rounded-xl bg-green-600 px-5 py-2.5 font-semibold text-white"
      >
        Print / Save PDF
      </button>
      
      <div className="rounded-xl border bg-white p-4">
  <h2 className="text-lg font-bold">ITR Filing Steps</h2>

  <ol className="mt-3 space-y-2 text-sm text-gray-600">
    <li>1. Download JSON</li>
    <li>2. Open Income Tax Portal</li>
    <li>3. Login with PAN</li>
    <li>4. Go to e-File → Income Tax Return</li>
    <li>5. Upload JSON</li>
    <li>6. Verify & Submit</li>
  </ol>

  <a
    href="https://www.incometax.gov.in"
    target="_blank"
    className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-white"
  >
    Open Portal
  </a>
</div>
        <div className="hidden print:block mt-10">
  <h1 className="text-2xl font-bold">ITR Summary</h1>

  <p>Financial Year: {form.financialYear}</p>
  <p>Assessment Year: {form.assessmentYear}</p>

  <hr className="my-4" />

  <p>Gross Receipts: ₹{form.grossReceipts}</p>
  <p>Expenses: ₹{form.totalExpenses}</p>
  <p>Net Profit: ₹{computed.netProfit}</p>
  <p>Taxable Income: ₹{computed.taxableIncome}</p>
  <p>Total Tax: ₹{computed.totalTax}</p>
  <p>Payable: ₹{computed.payable}</p>
  <p>Refund: ₹{computed.refund}</p>

  <p className="mt-6 text-sm">Generated by InvoiceFlow Pro</p>
</div>
    </div>
  );
}