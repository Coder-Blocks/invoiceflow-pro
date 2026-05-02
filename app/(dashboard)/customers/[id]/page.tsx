import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CustomerDetailsPage({ params }: Props) {
  const active = await requireActiveOrganization();
  const { id } = await params;

  const customer = await prisma.customer.findFirst({
    where: {
      id,
      organizationId: active.organizationId,
      isArchived: false,
    },
  });

  if (!customer) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">{customer.name}</h1>
        <Link href={`/customers/${customer.id}/edit`} className="rounded-md border px-4 py-2">
          Edit
        </Link>
      </div>

      <div className="grid gap-4 rounded-2xl border bg-white p-6 shadow-sm md:grid-cols-2">
        <Info label="Email" value={customer.email} />
        <Info label="Phone" value={customer.phone} />
        <Info label="Company" value={customer.companyName} />
        <Info label="GST / Tax ID" value={customer.taxId} />
        <Info label="Billing Address" value={customer.billingAddress} />
        <Info label="Notes" value={customer.notes} />
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-900">{value || "-"}</p>
    </div>
  );
}