"use client";

import { useState } from "react";
import { generateInvoicePDF } from "@/lib/pdf/generate-invoice-pdf";

type Props = {
  invoice: {
    id: string;
    invoiceNumber: string;
    issueDate?: string | null;
    dueDate?: string | null;
    status?: string | null;
    customerName?: string | null;
    customerCompany?: string | null;
    customerEmail?: string | null;
    customerPhone?: string | null;
    customerAddress?: string | null;
    customerTaxId?: string | null;
    notes?: string | null;
    terms?: string | null;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    balanceDue: number;
    logoUrl?: string | null;
    organizationName: string;
    organizationEmail?: string | null;
    organizationPhone?: string | null;
    lineItems: {
      description: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
      discountAmount: number;
      lineTotal: number;
    }[];
  };
};

export function DownloadGstInvoiceButton({ invoice }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    try {
      setLoading(true);
      await generateInvoicePDF(invoice);
    } catch (error) {
      console.error("DOWNLOAD_GST_PDF_ERROR:", error);
      alert("Failed to generate PDF");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-md bg-blue-600 px-4 py-2 text-white"
    >
      {loading ? "Generating PDF..." : "Download GST Invoice"}
    </button>
  );
}