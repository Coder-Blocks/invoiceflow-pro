"use client";

import { useState } from "react";

export default function SendPayslipButton({ slipId }: { slipId: string }) {
  const [loading, setLoading] = useState(false);

  async function sendMail() {
    try {
      setLoading(true);

      const res = await fetch(`/api/payroll/slips/${slipId}/send-mail`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          baseUrl: window.location.origin,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        alert(json.error || "Mail sending failed");
        return;
      }

      alert("Payslip email sent successfully");
    } catch (error) {
      console.error(error);
      alert("Mail sending failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={sendMail}
      disabled={loading}
      className="rounded-md bg-green-600 px-4 py-2 text-white disabled:opacity-60"
    >
      {loading ? "Sending..." : "Send Payslip Mail"}
    </button>
  );
}