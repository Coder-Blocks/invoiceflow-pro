import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

export default async function CustomersPage() {
  const active = await requireActiveOrganization();

  const customers = await prisma.customer.findMany({
    where: {
      organizationId: active.organizationId,
      isArchived: false,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Customers</h1>
          <p className="mt-1 text-slate-600">Manage your customer records.</p>
        </div>
        <Link href="/customers/new" className="rounded-md bg-blue-600 px-4 py-2 text-white">
          New Customer
        </Link>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="space-y-3">
          {customers.length === 0 ? (
            <p className="text-sm text-slate-500">No customers yet.</p>
          ) : (
            customers.map((customer) => (
              <div key={customer.id} className="flex items-center justify-between rounded-xl border p-4">
                <div>
                  <p className="font-semibold text-slate-900">{customer.name}</p>
                  <p className="text-sm text-slate-500">
                    {customer.companyName || "-"} • {customer.email || "-"} • {customer.phone || "-"}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link href={`/customers/${customer.id}`} className="rounded-md border px-3 py-2 text-sm">
                    View
                  </Link>
                  <Link href={`/customers/${customer.id}/edit`} className="rounded-md border px-3 py-2 text-sm">
                    Edit
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