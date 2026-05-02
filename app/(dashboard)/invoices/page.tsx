import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

export default async function InvoicesPage() {
  const active = await requireActiveOrganization();

  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId: active.organizationId,
    },
    include: {
      customer: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Invoices</h1>
          <p className="mt-1 text-slate-600">Create and manage invoices.</p>
        </div>
        <Link href="/invoices/new" className="rounded-md bg-blue-600 px-4 py-2 text-white">
          New Invoice
        </Link>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="space-y-3">
          {invoices.length === 0 ? (
            <p className="text-sm text-slate-500">No invoices yet.</p>
          ) : (
            invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between rounded-xl border p-4">
                <div>
                  <p className="font-semibold text-slate-900">{invoice.invoiceNumber}</p>
                  <p className="text-sm text-slate-500">
                    {invoice.customer?.name || "-"} • {invoice.status}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-semibold text-blue-700">
                    ₹{Number(invoice.totalAmount).toFixed(2)}
                  </p>
                  <Link href={`/invoices/${invoice.id}`} className="rounded-md border px-3 py-2 text-sm">
                    View
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}