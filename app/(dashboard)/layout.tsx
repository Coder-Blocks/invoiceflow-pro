"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Boxes,
  Brain,
  CreditCard,
  Database,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import InstallAppButton from "@/components/pwa/install-app-button";
import { APP_LOGO, APP_NAME, APP_TAGLINE } from "@/lib/app-config";

type Props = {
  children: ReactNode;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/estimates", label: "Estimates", icon: FileText },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/expenses", label: "Expenses", icon: Wallet },
  { href: "/upi", label: "UPI Auto Entry", icon: CreditCard },
  { href: "/medical-stock", label: "Medical Stock", icon: Receipt },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/payroll", label: "Payroll", icon: FileText },
  { href: "/accounting/bank-reconciliation", label: "Bank Reconciliation", icon: FileText },
  { href: "/accounting/coa", label: "Chart of Accounts", icon: FileText },
  { href: "/accounting/journals", label: "Journal Entries", icon: FileText },
  { href: "/accounting/ledger-report", label: "Ledger Report", icon: FileText },
  { href: "/accounting/trial-balance", label: "Trial Balance", icon: FileText },
  { href: "/accounting/profit-loss", label: "Profit & Loss", icon: FileText },
  { href: "/accounting/balance-sheet", label: "Balance Sheet", icon: FileText },
  { href: "/reports/business", label: "Reports", icon: FileText },
  { href: "/reports/accounting", label: "Accounting Reports", icon: FileText },
  { href: "/reports/gst", label: "GST Reports", icon: FileText },
  { href: "/reports/advanced-gst", label: "Advanced GST", icon: FileText },
  { href: "/reports/inventory", label: "Inventory Intelligence", icon: Boxes },
  { href: "/reports/itr", label: "ITR Prep", icon: FileText },
  { href: "/ai-brain", label: "AI Business Brain", icon: Brain },
  { href: "/billing", label: "Billing", icon: Wallet },
  { href: "/backup", label: "Backup", icon: Database },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center text-slate-600">
        Loading...
      </div>
    );
  }

  if (!session?.user?.id) {
    router.push("/login");
    return null;
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-50">
      <MobileTopbar
        organizationName={session.user.organizationName || APP_NAME}
        onOpen={() => setMobileOpen(true)}
      />

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu overlay"
          />

          <aside className="relative flex h-full w-80 max-w-[85vw] flex-col bg-white shadow-xl">
            <SidebarContent
              pathname={pathname}
              session={session}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className="flex">
        <aside className="fixed left-0 top-0 hidden h-screen w-72 flex-col border-r bg-white lg:flex">
          <SidebarContent pathname={pathname} session={session} />
        </aside>

        <div className="min-w-0 flex-1 lg:pl-72 flex flex-col h-screen">
          <header className="sticky top-0 z-30 hidden items-center justify-between border-b bg-white/90 px-6 py-4 backdrop-blur lg:flex">
            <div>
              <p className="text-sm text-slate-500">Workspace</p>
              <h1 className="text-lg font-semibold text-slate-900">
                {session.user.organizationName || APP_NAME}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <InstallAppButton />

              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">
                  {session.user.name || "User"}
                </p>
                <p className="text-xs text-slate-500">
                  {session.user.email || ""}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                {session.user.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 pb-32 pt-20 sm:p-6 sm:pt-24 lg:pt-6">
            {children}
          </main>

          <MobileBottomNav pathname={pathname} />
        </div>
      </div>
    </div>
  );
}

function MobileTopbar({
  organizationName,
  onOpen,
}: {
  organizationName: string;
  onOpen: () => void;
}) {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between border-b bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
      <button
        onClick={onOpen}
        className="rounded-xl border p-2"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      <div className="text-center">
        <p className="text-sm font-bold text-blue-900">{organizationName}</p>
        <p className="text-[11px] text-slate-500">InvoiceFlow Pro</p>
      </div>

      <InstallAppButton />
    </header>
  );
}

function SidebarContent({
  pathname,
  session,
  onNavigate,
}: {
  pathname: string;
  session: any;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="border-b px-5 py-5">
        <div className="flex items-center justify-between gap-3 lg:justify-start">
          <div className="flex items-center gap-3">
            <Image
              src={APP_LOGO}
              alt={`${APP_NAME} Logo`}
              width={48}
              height={48}
              className="h-12 w-auto rounded-xl object-contain"
              priority
            />

            <div>
              <h1 className="text-lg font-bold text-blue-900">
                {session.user.organizationName || APP_NAME}
              </h1>
              <p className="text-xs text-slate-500">{APP_TAGLINE}</p>
            </div>
          </div>

          <button
            onClick={onNavigate}
            className="rounded-lg border p-2 lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-700 hover:bg-blue-50"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <button
          onClick={() =>
            signOut({
              redirect: true,
              callbackUrl: "/",
            })
          }
          className="flex w-full items-center gap-2 rounded-md px-4 py-2 text-sm text-red-600 transition hover:bg-red-50"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </>
  );
}

function MobileBottomNav({ pathname }: { pathname: string }) {
  const items = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/invoices", label: "Invoices", icon: Receipt },
    { href: "/medical-stock", label: "Stock", icon: Wallet },
    { href: "/ai-brain", label: "AI", icon: Brain },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 border-t bg-white/95 px-2 py-2 backdrop-blur lg:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center rounded-xl px-2 py-2 text-xs ${
              active ? "bg-blue-600 text-white" : "text-slate-600"
            }`}
          >
            <Icon size={18} />
            <span className="mt-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}