import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";
import PrintButton from "@/components/shared/print-button";

type Props = {
  params: Promise<{ id: string }>;
};

function money(value: any) {
  return `₹${Number(value || 0).toFixed(2)}`; // ✅ closing backtick fixed
}

function formatDate(date: any) {
  if (!date) return "-";
  try {
    return new Date(date).toISOString().slice(0, 10);
  } catch {
    return "-";
  }
}

export default async function InvoicePrintPage({ params }: Props) {
  const { id } = await params;
  const active = await requireActiveOrganization();

  const invoice = await prisma.invoice.findFirst({
    where: {
      id,
      organizationId: active.organizationId,
    },
    include: {
      organization: true,
      customer: true,
      lineItems: true,
      payments: true,
    },
  });

  if (!invoice) return notFound();

  const org = invoice.organization;
  const paidAmount = (invoice.payments || []).reduce(
    (sum, p) => sum + Number(p?.amount || 0),
    0
  );
  const watermark = org?.watermarkText || org?.name || "InvoiceFlow Pro";

  return (
    <div className="min-h-screen bg-gray-100 p-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-5xl bg-white p-8 shadow print:shadow-none">
        <div className="mb-4 flex justify-end print:hidden">
          <PrintButton />
        </div>

        <div className="relative border p-8 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none">
            <h1 className="text-7xl font-black -rotate-45">{watermark}</h1>
          </div>

          <div className="relative z-10">
            <div className="flex justify-between border-b pb-6">
              <div className="flex gap-4">
                {org?.logoUrl && (
                  <img
                    src={org.logoUrl}
                    alt="logo"
                    className="h-20 w-20 object-contain border p-2 rounded"
                  />
                )}
                <div>
                  <h1 className="text-2xl font-bold">{org?.name}</h1>
                  <p className="text-sm text-gray-600 whitespace-pre-line">
                    {org?.companyAddress}
                  </p>
                  <p className="text-sm text-gray-600">{org?.companyEmail}</p>
                  <p className="text-sm text-gray-600">{org?.companyPhone}</p>
                </div>
              </div>

              <div className="text-right">
                <h2 className="text-3xl font-bold text-blue-600">INVOICE</h2>
                <p>#{invoice.invoiceNumber}</p>
                <p>Date: {formatDate(invoice.issueDate)}</p>
                <p>Due: {formatDate(invoice.dueDate)}</p>
              </div>
            </div>

            <div className="py-6 border-b">
              <h3 className="font-bold mb-2">Bill To</h3>
              <p>{invoice.customer?.name}</p>
              <p>{invoice.customer?.email}</p>
              <p>{invoice.customer?.phone}</p>
              <p className="whitespace-pre-line">{invoice.customer?.billingAddress}</p>
            </div>

            <div className="py-6">
              <table className="w-full border text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2">Item</th>
                    <th className="border p-2">Qty</th>
                    <th className="border p-2">Rate</th>
                    <th className="border p-2">Tax</th>
                    <th className="border p-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems?.map((item) => (
                    <tr key={item.id}>
                      <td className="border p-2">{item.description}</td>
                      <td className="border p-2">{Number(item.quantity || 0)}</td>
                      <td className="border p-2">{money(item.unitPrice)}</td>
                      <td className="border p-2">{Number(item.taxRate || 0).toFixed(2)}%</td>
                      <td className="border p-2">{money(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end border-t pt-4">
              <div className="w-80 space-y-2 text-sm">
                <Row label="Subtotal" value={money(invoice.subtotal)} />
                <Row label="Tax" value={money(invoice.taxAmount)} />
                <Row label="Discount" value={money(invoice.discountAmount)} />
                <Row label="Total" value={money(invoice.totalAmount)} bold />
                <Row label="Paid" value={money(paidAmount)} />
                <Row label="Balance" value={money(invoice.balanceDue)} bold />
              </div>
            </div>

            <div className="mt-6 border-t pt-4">
              <h3 className="font-bold mb-2">Payment Details</h3>
              <p>Bank: {org?.bankName}</p>
              <p>Account: {org?.accountNumber}</p>
              <p>IFSC: {org?.ifscCode}</p>
              <p>UPI: {org?.upiId}</p>
              {org?.qrCodeUrl && (
                <img src={org.qrCodeUrl} className="h-28 mt-2" alt="QR" />
              )}
            </div>

            <div className="text-center text-xs text-gray-500 mt-8">
              Thank you for your business
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  const className = bold
    ? "flex justify-between font-bold text-lg"
    : "flex justify-between";
  return (
    <div className={className}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}