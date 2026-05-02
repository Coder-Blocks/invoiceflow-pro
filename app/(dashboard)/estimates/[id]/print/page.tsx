import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";
import PrintButton from "@/components/PrintButton";

type Props = {
  params: Promise<{ id: string }>;
};

function money(value: unknown) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function date(value: unknown) {
  if (!value) return "-";
  return new Date(value as string | Date).toISOString().slice(0, 10);
}

export default async function EstimatePrintPage({ params }: Props) {
  const active = await requireActiveOrganization();
  const { id } = await params;

  const estimate = await prisma.estimate.findFirst({
    where: {
      id,
      organizationId: active.organizationId,
    },
    include: {
      organization: true,
      customer: true,
      lineItems: true,
    },
  });

  if (!estimate) notFound();

  const org = estimate.organization;
  const watermark = org.watermarkText || org.name || "InvoiceFlow Pro";

  return (
    <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-5xl bg-white p-8 shadow print:shadow-none">
        <div className="mb-5 flex justify-end print:hidden">
          <PrintButton />
        </div>

        <div className="relative overflow-hidden border p-8">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.06]">
            <div className="-rotate-45 text-7xl font-black text-slate-900">
              {watermark}
            </div>
          </div>

          <div className="relative z-10">
            <header className="flex items-start justify-between border-b pb-6">
              <div className="flex gap-4">
                {org.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={org.logoUrl}
                    alt="Company Logo"
                    className="h-20 w-20 rounded-xl border object-contain p-2"
                  />
                ) : null}

                <div>
                  <h1 className="text-3xl font-black text-slate-900">
                    {org.name}
                  </h1>

                  {org.companyAddress ? (
                    <p className="mt-2 max-w-md whitespace-pre-wrap text-sm text-slate-600">
                      {org.companyAddress}
                    </p>
                  ) : null}

                  <div className="mt-2 text-sm text-slate-600">
                    {org.companyEmail ? <p>Email: {org.companyEmail}</p> : null}
                    {org.companyPhone ? <p>Phone: {org.companyPhone}</p> : null}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <h2 className="text-4xl font-black text-blue-700">
                  QUOTATION
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Estimate No:{" "}
                  <span className="font-bold">{estimate.estimateNumber}</span>
                </p>
                <p className="text-sm text-slate-600">
                  Issue Date: {date(estimate.issueDate)}
                </p>
                <p className="text-sm text-slate-600">
                  Valid Until: {date(estimate.expiryDate)}
                </p>
                <p className="mt-2 inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  {String(estimate.status || "DRAFT")}
                </p>
              </div>
            </header>

            <section className="grid gap-6 border-b py-6 md:grid-cols-2">
              <div>
                <h3 className="mb-2 font-bold text-slate-900">Quotation To</h3>
                <p className="font-semibold text-slate-900">
                  {estimate.customer?.name || "Customer"}
                </p>

                {estimate.customer?.companyName ? (
                  <p className="text-sm text-slate-600">
                    {estimate.customer.companyName}
                  </p>
                ) : null}

                {estimate.customer?.email ? (
                  <p className="text-sm text-slate-600">
                    Email: {estimate.customer.email}
                  </p>
                ) : null}

                {estimate.customer?.phone ? (
                  <p className="text-sm text-slate-600">
                    Phone: {estimate.customer.phone}
                  </p>
                ) : null}

                {estimate.customer?.billingAddress ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                    {estimate.customer.billingAddress}
                  </p>
                ) : null}

                {estimate.customer?.taxId ? (
                  <p className="mt-2 text-sm text-slate-600">
                    GSTIN / Tax ID: {estimate.customer.taxId}
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <h3 className="mb-2 font-bold text-slate-900">
                  Payment / Acceptance Details
                </h3>
                {org.bankName ? <Info label="Bank" value={org.bankName} /> : null}
                {org.accountName ? (
                  <Info label="Account Name" value={org.accountName} />
                ) : null}
                {org.accountNumber ? (
                  <Info label="Account No" value={org.accountNumber} />
                ) : null}
                {org.ifscCode ? <Info label="IFSC" value={org.ifscCode} /> : null}
                {org.upiId ? <Info label="UPI ID" value={org.upiId} /> : null}

                {org.qrCodeUrl ? (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold text-slate-500">
                      Scan to Pay / Advance
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={org.qrCodeUrl}
                      alt="UPI QR Code"
                      className="h-28 w-28 rounded-lg border bg-white object-contain p-2"
                    />
                  </div>
                ) : null}
              </div>
            </section>

            <section className="py-6">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-left">
                    <th className="border px-3 py-2">Description</th>
                    <th className="border px-3 py-2">Qty</th>
                    <th className="border px-3 py-2">Rate</th>
                    <th className="border px-3 py-2">Tax %</th>
                    <th className="border px-3 py-2">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {estimate.lineItems.length === 0 ? (
                    <tr>
                      <td className="border px-3 py-4 text-center" colSpan={5}>
                        No line items
                      </td>
                    </tr>
                  ) : (
                    estimate.lineItems.map((item) => (
                      <tr key={item.id}>
                        <td className="border px-3 py-2">
                          {item.description}
                          <td className="border px-3 py-2">
                            {item.description}
                        </td>
                        </td>
                        <td className="border px-3 py-2">
                          {Number(item.quantity || 0).toFixed(2)}
                        </td>
                        <td className="border px-3 py-2">
                          {money(item.unitPrice)}
                        </td>
                        <td className="border px-3 py-2">
                          {Number(item.taxRate || 0).toFixed(2)}%
                        </td>
                        <td className="border px-3 py-2">
                          {money(item.lineTotal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>

            <section className="flex justify-end border-b pb-6">
              <div className="w-full max-w-sm space-y-2">
                <AmountRow label="Subtotal" value={money(estimate.subtotal)} />
                <AmountRow label="Tax" value={money(estimate.taxAmount)} />
                <AmountRow
                  label="Discount"
                  value={money(estimate.discountAmount)}
                />
                <AmountRow
                  label="Total Estimate"
                  value={money(estimate.totalAmount)}
                  bold
                />
              </div>
            </section>

            {(estimate.notes || estimate.terms) && (
              <section className="grid gap-6 py-6 md:grid-cols-2">
                {estimate.notes ? (
                  <div>
                    <h3 className="mb-2 font-bold text-slate-900">Notes</h3>
                    <p className="whitespace-pre-wrap text-sm text-slate-600">
                      {estimate.notes}
                    </p>
                  </div>
                ) : null}

                {estimate.terms ? (
                  <div>
                    <h3 className="mb-2 font-bold text-slate-900">
                      Terms & Conditions
                    </h3>
                    <p className="whitespace-pre-wrap text-sm text-slate-600">
                      {estimate.terms}
                    </p>
                  </div>
                ) : null}
              </section>
            )}

            <footer className="pt-6 text-center text-xs text-slate-500">
              This quotation is valid until {date(estimate.expiryDate)}. Thank you
              for considering {org.name}.
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-1 flex justify-between gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function AmountRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex justify-between border-b py-2 ${
        bold ? "text-lg font-black text-blue-700" : "text-sm text-slate-900"
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}