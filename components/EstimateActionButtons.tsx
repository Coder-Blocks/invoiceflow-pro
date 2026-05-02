"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function EstimateActionButtons({
  estimateId,
}: {
  estimateId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState("");

  async function updateStatus(status: "ACCEPTED" | "DECLINED") {
    try {
      setLoading(status);

      const res = await fetch(`/api/estimates/${estimateId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Status update failed");
        return;
      }

      alert(status === "ACCEPTED" ? "Estimate accepted" : "Estimate rejected");
      router.refresh();
    } finally {
      setLoading("");
    }
  }

  async function convertToInvoice() {
    try {
      setLoading("CONVERT");

      const res = await fetch(`/api/estimates/${estimateId}/convert`, {
        method: "POST",
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || data.message || "Convert failed");
        return;
      }

      alert("Estimate converted to invoice");
      router.push(`/invoices/${data.invoiceId}`);
    } finally {
      setLoading("");
    }
  }

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <Link
        href={`/estimates/${estimateId}/print`}
        target="_blank"
        className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white"
      >
        Download / Print PDF
      </Link>

      <Link
        href={`/estimate-approve/${estimateId}`}
        target="_blank"
        className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white"
      >
        Customer Approve Link
      </Link>

      <button
        onClick={() => updateStatus("ACCEPTED")}
        disabled={loading === "ACCEPTED"}
        className="rounded-xl bg-green-600 px-5 py-2.5 font-semibold text-white disabled:opacity-60"
      >
        {loading === "ACCEPTED" ? "Updating..." : "Mark Accepted"}
      </button>

      <button
        onClick={() => updateStatus("DECLINED")}
        disabled={loading === "DECLINED"}
        className="rounded-xl bg-red-600 px-5 py-2.5 font-semibold text-white disabled:opacity-60"
      >
        {loading === "DECLINED" ? "Updating..." : "Mark Rejected"}
      </button>

      <button
        onClick={convertToInvoice}
        disabled={loading === "CONVERT"}
        className="rounded-xl bg-slate-900 px-5 py-2.5 font-semibold text-white disabled:opacity-60"
      >
        {loading === "CONVERT" ? "Converting..." : "Convert to Invoice"}
      </button>
    </div>
  );
}