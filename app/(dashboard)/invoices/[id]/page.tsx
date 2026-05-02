import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";
import { DownloadGstInvoiceButton } from "@/components/invoices/download-gst-invoice-button";
import { SendInvoiceButton } from "@/components/invoices/send-invoice-button";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function InvoiceDetailsPage({ params }: Props) {
  const active = await requireActiveOrganization();
  const { id } = await params;

  const [invoice, organization] = await Promise.all([
    prisma.invoice.findFirst({
      where: {
        id,
        organizationId: active.organizationId,
      },
      include: {
        customer: true,
        lineItems: true,
        payments: true,
      },
    }),
    prisma.organization.findUnique({
      where: {
        id: active.organizationId,
      },
      select: {
        name: true,
        email: true,
        phone: true,
        logoUrl: true,
      },
    }),
  ]);

  if (!invoice || !organization) notFound();

  const pdfData = {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate
      ? new Date(invoice.issueDate).toISOString().slice(0, 10)
      : null,
    dueDate: invoice.dueDate
      ? new Date(invoice.dueDate).toISOString().slice(0, 10)
      : null,
    status: invoice.status,
    customerName: invoice.customer?.name || null,
    customerCompany: invoice.customer?.companyName || null,
    customerEmail: invoice.customer?.email || null,
    customerPhone: invoice.customer?.phone || null,
    customerAddress: invoice.customer?.billingAddress || null,
    customerTaxId: invoice.customer?.taxId || null,
    notes: invoice.notes || null,
    terms: invoice.terms || null,
    subtotal: Number(invoice.subtotal),
    taxAmount: Number(invoice.taxAmount),
    discountAmount: Number(invoice.discountAmount),
    totalAmount: Number(invoice.totalAmount),
    balanceDue: Number(invoice.balanceDue),
    logoUrl: organization.logoUrl || null,
    organizationName: organization.name,
    organizationEmail: organization.email || null,
    organizationPhone: organization.phone || null,
    lineItems: invoice.lineItems.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      taxRate: Number(item.taxRate),
      discountAmount: Number(item.discountAmount),
      lineTotal: Number(item.lineTotal),
    })),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {invoice.invoiceNumber}
          </h1>
          <p className="mt-1 text-slate-600">
            Invoice details, GST summary, and payment tracking.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/invoices/${invoice.id}/edit`}
            className="rounded-md border px-4 py-2"
          >
            Edit
          </Link>

          <Link
             href={`/invoices/${invoice.id}/print`}
            target="_blank"
             className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white"
          >
            Download / Print PDF
          </Link>

          <SendInvoiceButton invoiceId={invoice.id} />

          <DownloadGstInvoiceButton invoice={pdfData} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Customer" value={invoice.customer?.name || "-"} />
        <Card
          title="Total"
          value={`₹${Number(invoice.totalAmount).toFixed(2)}`}
        />
        <Card
          title="Balance Due"
          value={`₹${Number(invoice.balanceDue).toFixed(2)}`}
        />
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Line Items</h2>

        <div className="space-y-3">
          {invoice.lineItems.map((item) => (
            <div key={item.id} className="rounded-xl border p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">
                    {item.description}
                  </p>
                  <p className="text-sm text-slate-500">
                    Qty {Number(item.quantity)} • Unit ₹
                    {Number(item.unitPrice).toFixed(2)} • GST{" "}
                    {Number(item.taxRate).toFixed(2)}%
                  </p>
                </div>

                <div className="font-semibold text-blue-700">
                  ₹{Number(item.lineTotal).toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Notes & Terms</h2>

          <p className="mb-4 whitespace-pre-wrap text-sm text-slate-600">
            <strong>Notes:</strong> {invoice.notes || "-"}
          </p>

          <p className="whitespace-pre-wrap text-sm text-slate-600">
            <strong>Terms:</strong> {invoice.terms || "-"}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">GST Summary</h2>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span>₹{Number(invoice.subtotal).toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span>CGST</span>
              <span>₹{(Number(invoice.taxAmount) / 2).toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span>SGST</span>
              <span>₹{(Number(invoice.taxAmount) / 2).toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span>Discount</span>
              <span>₹{Number(invoice.discountAmount).toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between border-t pt-3 font-semibold">
              <span>Total</span>
              <span>₹{Number(invoice.totalAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <h2 className="mt-2 text-lg font-semibold text-slate-900">{value}</h2>
    </div>
  );
}