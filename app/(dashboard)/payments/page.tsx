import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

export default async function PaymentsPage() {
  const active = await requireActiveOrganization();

  const payments = await prisma.payment.findMany({
    where: {
      organizationId: active.organizationId,
    },
    include: {
      invoice: {
        include: {
          customer: true,
        },
      },
    },
    orderBy: {
      paymentDate: "desc",
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Payments</h1>
          <p className="mt-1 text-slate-600">Track received payments.</p>
        </div>
        <Link href="/payments/new" className="rounded-md bg-blue-600 px-4 py-2 text-white">
          New Payment
        </Link>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="space-y-3">
          {payments.length === 0 ? (
            <p className="text-sm text-slate-500">No payments yet.</p>
          ) : (
            payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between rounded-xl border p-4">
                <div>
                  <p className="font-semibold text-slate-900">{payment.invoice.invoiceNumber}</p>
                  <p className="text-sm text-slate-500">
                    {payment.invoice.customer?.name || "-"} • {payment.method}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-blue-700">
                    ₹{Number(payment.amount).toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-500">
                    {new Date(payment.paymentDate).toISOString().slice(0, 10)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}