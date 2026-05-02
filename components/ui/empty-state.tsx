import Link from "next/link";
import type { ReactNode } from "react";

export default function EmptyState({
  icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed bg-slate-50 p-8 text-center">
      {icon ? (
        <div className="mb-4 rounded-2xl bg-white p-4 text-blue-600 shadow-sm">
          {icon}
        </div>
      ) : null}

      <h3 className="text-lg font-bold text-slate-900">{title}</h3>

      <p className="mt-2 max-w-md text-sm text-slate-500">
        {description}
      </p>

      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}