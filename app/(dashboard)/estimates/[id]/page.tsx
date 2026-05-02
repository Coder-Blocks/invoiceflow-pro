import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";
import EstimateActionButtons from "@/components/EstimateActionButtons";

type Props = {
  params: Promise<{ id: string }>;
};

function money(value: unknown) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

export default async function EstimateDetailsPage({ params }: Props) {
  const active = await requireActiveOrganization();
  const { id } = await params;

  const estimate = await prisma.estimate.findFirst({
    where: {
      id,
      organizationId: active.organizationId,
    },
    include: {
      customer: true,
      lineItems: true,
      convertedTo: true,
    },
  });

  if (!estimate) notFound();

  const statusText =
    estimate.status === "ACCEPTED"
      ? "Accepted"
      : estimate.status === "DECLINED"
      ? "Rejected"
      : estimate.status === "CONVERTED"
      ? "Converted"
      : "Not accepted yet";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">
        {estimate.estimateNumber}
      </h1>

      <EstimateActionButtons estimateId={estimate.id} />

      <div className="grid gap-4 md:grid-cols-4">
        <Card title="Customer" value={estimate.customer?.name || "-"} />

        <Card title="Total" value={money(estimate.totalAmount)} />

        <StatusCard title="Status" value={statusText} status={estimate.status} />

        <Card
          title="Converted Invoice"
          value={estimate.convertedTo?.invoiceNumber || "Not converted"}
        />
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

function StatusCard({
  title,
  value,
  status,
}: {
  title: string;
  value: string;
  status: string;
}) {
  let color = "text-slate-900";

  if (status === "ACCEPTED") color = "text-green-600";
  else if (status === "DECLINED") color = "text-red-600";
  else if (status === "CONVERTED") color = "text-blue-600";

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>

      <h2 className={"mt-2 text-lg font-bold " + color}>
        {value}
      </h2>
    </div>
  );
}