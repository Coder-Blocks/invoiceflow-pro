"use client";

import { useState } from "react";

export function SendInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [sending, setSending] = useState(false);

  async function sendInvoice() {
    try {
      setSending(true);

      const res = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: "POST",
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Failed to send invoice");
        return;
      }

      alert("Invoice email sent successfully");
    } catch (error) {
      console.error("SEND_INVOICE_CLIENT_ERROR:", error);
      alert("Failed to send invoice");
    } finally {
      setSending(false);
    }
  }

  return (
    <button
      onClick={sendInvoice}
      disabled={sending}
      className="rounded-md border px-4 py-2"
    >
      {sending ? "Sending..." : "Send Mail"}
    </button>
  );
}