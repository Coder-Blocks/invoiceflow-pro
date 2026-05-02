import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

export default async function EstimatesPage() {
  const active = await requireActiveOrganization();

  const estimates = await prisma.estimate.findMany({
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
          <h1 className="text-3xl font-bold text-slate-900">Estimates</h1>
          <p className="mt-1 text-slate-600">Create and manage quotes.</p>
        </div>
        <Link href="/estimates/new" className="rounded-md bg-blue-600 px-4 py-2 text-white">
          New Estimate
        </Link>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="space-y-3">
          {estimates.length === 0 ? (
            <p className="text-sm text-slate-500">No estimates yet.</p>
          ) : (
            estimates.map((estimate) => (
              <div key={estimate.id} className="flex items-center justify-between rounded-xl border p-4">
                <div>
                  <p className="font-semibold text-slate-900">{estimate.estimateNumber}</p>
                  <p className="text-sm text-slate-500">
                    {estimate.customer?.name || "-"} • {estimate.status}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-semibold text-blue-700">
                    ₹{Number(estimate.totalAmount).toFixed(2)}
                  </p>
                  <Link href={`/estimates/${estimate.id}`} className="rounded-md border px-3 py-2 text-sm">
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