import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";
import  PrintButton  from "@/components/shared/print-button";
import SendPayslipButton from "@/components/SendPayslipButton";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SalarySlipPage({ params }: Props) {
  const active = await requireActiveOrganization();
  const { id } = await params;

  const slip = await prisma.salarySlip.findFirst({
    where: {
      id,
      organizationId: active.organizationId,
    },
    include: {
      employee: true,
      organization: true,
      payrollRun: true,
    },
  });

  if (!slip) notFound();

  return (
    <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow print:rounded-none print:shadow-none">
        <div className="mb-6 flex items-start justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Salary Slip</h1>
            <p className="text-sm text-slate-500">Print or save as PDF.</p>
          </div>
          <SendPayslipButton slipId={slip.id} />
          <PrintButton />
        </div>

        <div className="border-b pb-6 text-center">
          <h1 className="text-3xl font-bold text-blue-900">
            {slip.organization.name}
          </h1>
          <p className="mt-1 text-slate-600">Salary Slip</p>
          <p className="text-sm text-slate-500">
            Month: {slip.month}/{slip.year}
          </p>
        </div>

        <div className="grid gap-6 border-b py-6 md:grid-cols-2">
          <div>
            <h2 className="mb-3 font-semibold text-slate-900">
              Employee Details
            </h2>
            <Info label="Name" value={slip.employee.name} />
            <Info label="Employee Code" value={slip.employee.employeeCode} />
            <Info label="Designation" value={slip.employee.designation} />
            <Info label="Department" value={slip.employee.department} />
            <Info label="Email" value={slip.employee.email} />
            <Info label="Phone" value={slip.employee.phone} />
          </div>

          <div>
            <h2 className="mb-3 font-semibold text-slate-900">
              Payment Details
            </h2>
            <Info label="Status" value={slip.status} />
            <Info
              label="Paid Date"
              value={
                slip.paidAt
                  ? new Date(slip.paidAt).toISOString().slice(0, 10)
                  : "-"
              }
            />
            <Info
              label="Generated On"
              value={new Date(slip.createdAt).toISOString().slice(0, 10)}
            />
          </div>
        </div>

        <div className="grid gap-6 py-6 md:grid-cols-2">
          <div className="rounded-xl border p-5">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Earnings
            </h2>

            <Row label="Basic Salary" value={Number(slip.basicSalary)} />
            <Row label="HRA" value={Number(slip.hra)} />
            <Row label="Allowance" value={Number(slip.allowance)} />

            <div className="mt-3 border-t pt-3">
              <Row label="Gross Salary" value={Number(slip.grossSalary)} bold />
            </div>
          </div>

          <div className="rounded-xl border p-5">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Deductions
            </h2>

            <Row label="Other Deduction" value={Number(slip.deduction)} />
            <Row label="PF Deduction" value={Number(slip.pfDeduction)} />
            <Row label="ESI Deduction" value={Number(slip.esiDeduction)} />
            <Row
              label="Professional Tax"
              value={Number(slip.professionalTax)}
            />

            <div className="mt-3 border-t pt-3">
              <Row
                label="Total Deductions"
                value={Number(slip.totalDeductions)}
                bold
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-blue-50 p-6 text-center">
          <p className="text-sm font-medium text-blue-700">Net Salary</p>
          <h2 className="mt-2 text-4xl font-black text-blue-900">
            ₹{Number(slip.netSalary).toFixed(2)}
          </h2>
        </div>

        {slip.notes ? (
          <div className="mt-6 rounded-xl border p-5">
            <h2 className="mb-2 font-semibold text-slate-900">Notes</h2>
            <p className="text-sm text-slate-600">{slip.notes}</p>
          </div>
        ) : null}

        <p className="mt-8 text-center text-xs text-slate-500">
          This is a system-generated salary slip.
        </p>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="mb-2 flex justify-between gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value || "-"}</span>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div
      className={`mb-2 flex justify-between gap-4 text-sm ${
        bold ? "font-bold text-slate-900" : "text-slate-600"
      }`}
    >
      <span>{label}</span>
      <span>₹{Number(value || 0).toFixed(2)}</span>
    </div>
  );
}