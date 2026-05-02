"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function EstimateApprovePage() {
  const params = useParams();
  const estimateId = String(params.id || "");

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function approve() {
    try {
      setLoading(true);

      const res = await fetch(`/api/public/estimates/${estimateId}/approve`, {
        method: "POST",
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Approval failed");
        return;
      }

      setDone(true);
    } catch (error) {
      console.error(error);
      alert("Approval failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-blue-950 to-blue-600 p-6">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-2xl">
        <h1 className="text-3xl font-black text-blue-900">
          Estimate Approval
        </h1>

        {done ? (
          <>
            <p className="mt-4 font-bold text-green-600">
              Estimate accepted successfully.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              The business owner will convert this estimate into an invoice.
            </p>
          </>
        ) : (
          <>
            <p className="mt-4 text-slate-600">
              Click below to approve this quotation / estimate.
            </p>

            <button
              onClick={approve}
              disabled={loading}
              className="mt-6 rounded-xl bg-green-600 px-6 py-3 font-bold text-white disabled:opacity-60"
            >
              {loading ? "Approving..." : "Approve Estimate"}
            </button>
          </>
        )}

        <div className="mt-6">
          <Link href="/" className="text-sm font-semibold text-blue-700">
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}