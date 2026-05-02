"use client";

import jsPDF from "jspdf";

type InvoicePdfLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountAmount: number;
  lineTotal: number;
};

type InvoicePdfData = {
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
  lineItems: InvoicePdfLineItem[];
};

async function imageUrlToBase64(url: string) {
  const res = await fetch(url);
  const blob = await res.blob();

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function generateInvoicePDF(invoice: InvoicePdfData) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  let y = 18;

  if (invoice.logoUrl) {
    try {
      const base64 = await imageUrlToBase64(invoice.logoUrl);
      doc.addImage(base64, "PNG", 14, y - 4, 22, 22);
    } catch (error) {
      console.error("PDF_LOGO_LOAD_ERROR:", error);
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(invoice.organizationName, 40, y + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (invoice.organizationEmail) doc.text(invoice.organizationEmail, 40, y + 10);
  if (invoice.organizationPhone) doc.text(invoice.organizationPhone, 40, y + 15);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("GST INVOICE", pageWidth - 14, y + 4, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, pageWidth - 14, y + 12, {
    align: "right",
  });
  doc.text(`Issue Date: ${invoice.issueDate || "-"}`, pageWidth - 14, y + 17, {
    align: "right",
  });
  doc.text(`Due Date: ${invoice.dueDate || "-"}`, pageWidth - 14, y + 22, {
    align: "right",
  });

  y += 30;
  doc.setDrawColor(220, 220, 220);
  doc.line(14, y, pageWidth - 14, y);

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Bill To", 14, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (invoice.customerName) doc.text(invoice.customerName, 14, y);
  if (invoice.customerCompany) {
    y += 5;
    doc.text(invoice.customerCompany, 14, y);
  }
  if (invoice.customerEmail) {
    y += 5;
    doc.text(invoice.customerEmail, 14, y);
  }
  if (invoice.customerPhone) {
    y += 5;
    doc.text(invoice.customerPhone, 14, y);
  }
  if (invoice.customerAddress) {
    y += 5;
    doc.text(invoice.customerAddress, 14, y, { maxWidth: 80 });
  }
  if (invoice.customerTaxId) {
    y += 8;
    doc.text(`GST / Tax ID: ${invoice.customerTaxId}`, 14, y);
  }

  y += 12;
  doc.setFillColor(245, 247, 250);
  doc.rect(14, y, pageWidth - 28, 10, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Description", 16, y + 6.5);
  doc.text("Qty", 95, y + 6.5);
  doc.text("Unit", 112, y + 6.5);
  doc.text("GST%", 132, y + 6.5);
  doc.text("Disc.", 149, y + 6.5);
  doc.text("Total", pageWidth - 16, y + 6.5, { align: "right" });

  y += 14;
  doc.setFont("helvetica", "normal");

  invoice.lineItems.forEach((item) => {
    doc.text(item.description, 16, y, { maxWidth: 72 });
    doc.text(String(item.quantity), 95, y);
    doc.text(`₹${Number(item.unitPrice).toFixed(2)}`, 112, y);
    doc.text(`${Number(item.taxRate).toFixed(2)}%`, 132, y);
    doc.text(`₹${Number(item.discountAmount).toFixed(2)}`, 149, y);
    doc.text(`₹${Number(item.lineTotal).toFixed(2)}`, pageWidth - 16, y, {
      align: "right",
    });
    y += 8;
  });

  y += 4;
  const cgst = invoice.taxAmount / 2;
  const sgst = invoice.taxAmount / 2;

  const summaryX = 125;
  doc.setDrawColor(230, 230, 230);
  doc.line(summaryX, y, pageWidth - 14, y);

  y += 8;
  const summaryRows = [
    ["Subtotal", `₹${invoice.subtotal.toFixed(2)}`],
    ["CGST", `₹${cgst.toFixed(2)}`],
    ["SGST", `₹${sgst.toFixed(2)}`],
    ["Discount", `₹${invoice.discountAmount.toFixed(2)}`],
    ["Grand Total", `₹${invoice.totalAmount.toFixed(2)}`],
    ["Balance Due", `₹${invoice.balanceDue.toFixed(2)}`],
  ];

  summaryRows.forEach(([label, value], index) => {
    doc.setFont("helvetica", index >= 4 ? "bold" : "normal");
    doc.text(label, summaryX, y);
    doc.text(value, pageWidth - 16, y, { align: "right" });
    y += 7;
  });

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Notes", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(invoice.notes || "-", 14, y, { maxWidth: 90 });

  y += 14;
  doc.setFont("helvetica", "bold");
  doc.text("Terms", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(invoice.terms || "-", 14, y, { maxWidth: 90 });

  y += 18;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.text("This is a system-generated GST invoice.", 14, y);

  doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
}