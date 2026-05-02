"use client";

import { useState } from "react";

export default function SendInvoiceButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);

  async function send() {
    try {
      setLoading(true);

      const res = await fetch(`/api/invoices/${id}/send-mail`, {
        method: "POST",
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error);
        return;
      }

      alert("Invoice sent successfully");
    } catch {
      alert("Failed to send invoice");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={send}
      className="bg-purple-600 text-white px-4 py-2 rounded"
    >
      {loading ? "Sending..." : "Send Invoice"}
    </button>
  );
}