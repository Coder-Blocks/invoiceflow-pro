import Link from "next/link";
import {
  BarChart3,
  Brain,
  Building2,
  Check,
  CreditCard,
  Facebook,
  FileText,
  IndianRupee,
  Instagram,
  Linkedin,
  Mail,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
  Youtube,
} from "lucide-react";

const modules = [
  {
    title: "Invoices",
    icon: FileText,
    desc: "Create, send and manage professional GST invoices.",
    features: ["Fast invoice creation", "GST calculation", "PDF download", "Email / WhatsApp sharing"],
  },
  {
    title: "Estimates",
    icon: Receipt,
    desc: "Send quotes and convert them into invoices.",
    features: ["Quick estimates", "Convert to invoice", "Client-ready format", "Easy tracking"],
  },
  {
    title: "Customers",
    icon: Users,
    desc: "Manage all customer records in one place.",
    features: ["Customer database", "Contact history", "Outstanding view", "Smart search"],
  },
  {
    title: "Payments",
    icon: Wallet,
    desc: "Track collections, dues and payment history.",
    features: ["Payment tracking", "Due reminders", "Balance view", "Reports"],
  },
  {
    title: "Expenses",
    icon: CreditCard,
    desc: "Record and categorize business expenses.",
    features: ["Expense tracking", "Categories", "Receipt records", "Tax deduction support"],
  },
  {
    title: "Payroll",
    icon: Users,
    desc: "Run payroll and send payslips instantly.",
    features: ["Employee management", "Salary processing", "Payslip email", "Payroll reports"],
  },
  {
    title: "Reports",
    icon: BarChart3,
    desc: "Get business insights and accounting reports.",
    features: ["Profit & Loss", "Balance Sheet", "GST reports", "Business insights"],
  },
  {
    title: "ITR Prep",
    icon: FileText,
    desc: "Prepare tax summary and export filing data.",
    features: ["Auto calculation", "Tax summary", "JSON export", "Print / PDF report"],
  },
  {
    title: "AI Brain",
    icon: Brain,
    desc: "Ask your business questions like ChatGPT.",
    features: ["Profit analysis", "Stock alerts", "Pending dues", "Smart suggestions"],
  },
  {
    title: "Inventory",
    icon: Package,
    desc: "Manage stock, expiry and reorder alerts.",
    features: ["Low stock alerts", "Expiry tracking", "Stock value", "Sales reduction"],
  },
  {
    title: "Settings",
    icon: Settings,
    desc: "Customize logo, bank, QR, watermark and email.",
    features: ["Company branding", "UPI / QR", "SMTP email", "Watermark"],
  },
  {
    title: "Backup",
    icon: ShieldCheck,
    desc: "Protect your business data with backup tools.",
    features: ["Export backup", "Restore backup", "Backup logs", "Safe recovery"],
  },
];

const plans = [
  {
    name: "Starter",
    price: "₹499",
    desc: "Perfect for freelancers and small shops",
    features: ["50 invoices / month", "1 user", "GST invoices", "Email support", "Basic reports"],
  },
  {
    name: "Professional",
    price: "₹999",
    desc: "Best for growing Indian businesses",
    popular: true,
    features: ["Unlimited invoices", "5 users", "AI Business Brain", "Advanced reports", "Backup system", "Priority support"],
  },
  {
    name: "Business",
    price: "₹2999",
    desc: "For advanced teams and agencies",
    features: ["Unlimited invoices", "Unlimited users", "Payroll management", "ITR preparation", "Custom reports", "Dedicated onboarding"],
  },
];

export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-[#f6f9ff] text-slate-950">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-blue-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-700 text-white shadow-lg">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-blue-950">
                InvoiceFlow Pro
              </h1>
              <p className="flex items-center gap-1 text-xs font-medium text-slate-500">
                Built for Indian Small Businesses <span className="india-flag flag-wave" aria-label="india flag"/>
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
            <a href="#features">Features</a>
            <a href="#modules">Modules</a>
            <a href="#pricing">Pricing</a>
            <a href="#compare">Compare</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-blue-200 bg-white px-5 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-blue-700 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-blue-300 transition hover:-translate-y-0.5 hover:bg-blue-800"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden px-6 py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_35%),radial-gradient(circle_at_bottom_right,#bfdbfe,transparent_30%)]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-700 shadow-sm">
              Smart Billing. Simplified.
            </span>

            <h2 className="mt-8 max-w-3xl text-5xl font-black leading-tight tracking-tight text-blue-950 md:text-6xl">
              Run Your Business.
              <span className="block text-blue-700">We Handle the Rest.</span>
            </h2>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Create invoices, track payments, manage customers, file taxes,
              run payroll, and grow your business with one powerful Indian SaaS.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="rounded-2xl bg-blue-700 px-7 py-4 font-black text-white shadow-xl shadow-blue-300 transition hover:-translate-y-1 hover:bg-blue-800"
              >
                Start Free — 1 Invoice
              </Link>
              <a
                href="#modules"
                className="rounded-2xl border border-blue-200 bg-white px-7 py-4 font-black text-blue-700 shadow-sm transition hover:-translate-y-1 hover:bg-blue-50"
              >
                Explore Modules
              </a>
            </div>

            <div className="mt-8 grid max-w-xl grid-cols-3 gap-5 text-sm">
              <TrustBadge text="Made for India" />
              <TrustBadge text="Secure & Reliable" />
              <TrustBadge text="Affordable Pricing" />
            </div>
          </div>

          <div className="rounded-4xl border border-blue-100 bg-white p-4 shadow-2xl shadow-blue-200">
            <div className="rounded-3xl bg-slate-50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500">
                    Welcome back, Ravi 👋
                  </p>
                  <h3 className="text-2xl font-black text-blue-950">
                    Business Dashboard
                  </h3>
                </div>
                <div className="rounded-full bg-blue-700 p-3 text-white">
                  <Building2 />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <HeroCard title="Total Sales" value="₹1,24,500" good />
                <HeroCard title="Invoices" value="156" good />
                <HeroCard title="Outstanding" value="₹32,400" bad />
                <HeroCard title="Profit" value="₹82,100" good />
              </div>

              <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="font-black text-blue-950">Recent Invoices</h4>
                  <span className="text-xs font-bold text-blue-700">View all</span>
                </div>
                {["INV-1001  Ramesh & Co.", "INV-1002  ABC Traders", "INV-1003  Sunrise Stores"].map(
                  (item) => (
                    <div
                      key={item}
                      className="mb-3 flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3 text-sm"
                    >
                      <span className="font-semibold text-slate-700">{item}</span>
                      <span className="font-black text-green-600">Paid</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section id="modules" className="px-6 py-20">
        <div className="mx-auto max-w-7xl text-center">
          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-black text-blue-700">
            All-in-One Business Suite
          </span>
          <h2 className="mt-5 text-4xl font-black text-blue-950">
            Powerful Modules for Every Need
          </h2>
          <p className="mt-3 text-slate-500">
            Hover / click any card to explore the best features.
          </p>

          <div className="mt-12 grid gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <div key={module.title} className="flip-card h-64">
                  <div className="flip-inner">
                    <div className="flip-front">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                        <Icon className="h-7 w-7" />
                      </div>
                      <h3 className="mt-5 text-xl font-black text-blue-950">
                        {module.title}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-slate-500">
                        {module.desc}
                      </p>
                      <p className="mt-5 text-xs font-bold text-blue-700">
                        Click to explore →
                      </p>
                    </div>

                    <div className="flip-back">
                      <h3 className="text-lg font-black">Best Features</h3>
                      <ul className="mt-4 space-y-3 text-left text-sm">
                        {module.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-blue-200" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-white px-6 py-20">
        <div className="mx-auto max-w-7xl text-center">
          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-black text-blue-700">
            Simple & Transparent Pricing
          </span>
          <h2 className="mt-5 text-4xl font-black text-blue-950">
            Choose the Perfect Plan
          </h2>
          <p className="mt-3 text-slate-500">
            Start free, then upgrade as your business grows.
          </p>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-4xl border bg-white p-8 text-left shadow-xl shadow-blue-100 transition hover:-translate-y-2 ${
                  plan.popular ? "border-blue-600 ring-4 ring-blue-100" : "border-blue-100"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-700 px-5 py-2 text-xs font-black text-white">
                    MOST POPULAR
                  </div>
                )}

                <h3 className="text-2xl font-black text-blue-950">{plan.name}</h3>
                <p className="mt-4 text-5xl font-black text-blue-700">
                  {plan.price}
                  <span className="text-base text-slate-500"> /month</span>
                </p>
                <p className="mt-3 text-sm text-slate-500">{plan.desc}</p>

                <ul className="mt-6 space-y-3 text-sm text-slate-700">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-blue-700" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className={`mt-8 block rounded-xl px-5 py-3 text-center font-black ${
                    plan.popular
                      ? "bg-blue-700 text-white shadow-lg shadow-blue-200"
                      : "border border-blue-200 text-blue-700 hover:bg-blue-50"
                  }`}
                >
                  Choose {plan.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section className="bg-linear-to-r from-blue-950 to-blue-700 px-6 py-14 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">
          <Why title="Save Time" text="Automate billing and focus on growth." />
          <Why title="Save Money" text="Affordable pricing that grows with you." />
          <Why title="Secure" text="Your business data stays protected." />
          <Why title="Made in India" text="Built for Indian small businesses." />
        </div>
      </section>

      {/* COMPARE */}
      <section id="compare" className="px-6 py-20">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="text-4xl font-black text-blue-950">
            Better Than Traditional Tools
          </h2>

          <div className="mt-10 overflow-hidden rounded-3xl border bg-white shadow-xl shadow-blue-100">
            <table className="w-full text-sm">
              <thead className="bg-blue-50">
                <tr>
                  <th className="p-4 text-left">Feature</th>
                  <th>InvoiceFlow Pro</th>
                  <th>Tally</th>
                  <th>Zoho</th>
                  <th>Vyapar</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Easy to use", "✓", "✕", "✓", "✓"],
                  ["No installation", "✓", "✕", "✓", "✕"],
                  ["Invoice + Payroll + ITR", "✓", "✕", "✕", "✕"],
                  ["AI Business Brain", "✓", "✕", "✕", "✕"],
                  ["Affordable pricing", "From ₹499", "High", "Medium", "Medium"],
                ].map((row) => (
                  <tr key={row[0]} className="border-t">
                    {row.map((cell, i) => (
                      <td
                        key={i}
                        className={`p-4 ${i === 1 ? "font-black text-blue-700" : ""}`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-700 px-6 py-20 text-center text-white">
        <h2 className="text-4xl font-black">Ready to simplify your business?</h2>
        <p className="mt-4 text-blue-100">
          Launch faster, look more professional, and manage everything from one dashboard.
        </p>
        <Link
          href="/signup"
          className="mt-8 inline-block rounded-2xl bg-white px-8 py-4 font-black text-blue-700 shadow-xl"
        >
          Get Started Now
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="relative overflow-hidden bg-slate-950 px-6 py-12 text-white">
  {/* LEFT CORNER ROTATING RUPEE */}
  <div className="absolute right-8 bottom-20 hidden md:block">
    <div className="rupee-rotate flex h-28 w-28 items-center justify-center rounded-full border border-blue-400 bg-blue-950 text-blue-200 shadow-[0_0_40px_rgba(37,99,235,0.8)]">
      <IndianRupee className="h-14 w-14" />
    </div>
  </div>

  <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-700">
          <Receipt />
        </div>

        <div>
          <h3 className="text-xl font-black">InvoiceFlow Pro</h3>
          <p className="text-sm text-slate-400">
            Built for Indian Small Businesses{" "}
            <span className="india-flag flag-wave" aria-label="india flag"/>
          </p>
        </div>
      </div>

      <p className="mt-5 max-w-md text-sm leading-6 text-slate-400">
        Smart billing, simple accounting, and powerful business insights —
        all in one place.
      </p>

      {/* SOCIAL ICONS */}
      <div className="mt-6 flex items-center gap-3">
        <a
          href="https://www.facebook.com/profile.php?id=61589365640844"
          target="_blank"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-blue-600"
        >
          <Facebook className="h-5 w-5" />
        </a>

        <a
          href="https://www.instagram.com/invoice_flow_pro/"
          target="_blank"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-pink-600"
        >
          <Instagram className="h-5 w-5" />
        </a>

        <a
          href="https://www.linkedin.com/in/invoiceflow-pro-a06526407/?isSelfProfile=true"
          target="_blank"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-blue-700"
        >
          <Linkedin className="h-5 w-5" />
        </a>

        <a
          href="https://www.youtube.com/@InvoiceFlowPro"
          target="_blank"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-red-600"
        >
          <Youtube className="h-5 w-5" />
        </a>
      </div>
    </div>

    <FooterLinks
      title="Product"
      links={[
        { label: "Features", href: "/features" },
        { label: "Modules", href: "/modules" },
        { label: "Pricing", href: "/pricing" },
        { label: "Updates", href: "/updates" },
      ]}
    />

       <FooterLinks
        title="Company"
        links={[
          { label: "About Us", href: "/about" },      // ✅ FIXED
          { label: "Contact", href: "/contact" },     // optional
          { label: "Privacy Policy", href: "/privacy" },
          { label: "Terms", href: "/terms" },
      ]}
    />

    <FooterLinks
      title="Support"
      links={[
        { label: "Help Center", href: "/help" },
        { label: "Documentation", href: "/docs" },
        { label: "Video Tutorials", href: "/videos" },
        { label: "Support", href: "/contactsupport" },
      ]}
    />
  </div>

  <p className="mt-10 border-t border-slate-800 pt-6 text-center text-sm text-slate-500">
  © 2026 InvoiceFlow Pro{" "}
  <span className="heart-animate mx-1">❤️</span>{" "}
  All rights reserved.
</p>
</footer>
    </main>
  );
}

function TrustBadge({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 font-bold text-slate-700">
      <Check className="h-5 w-5 rounded-full bg-blue-100 p-1 text-blue-700" />
      {text}
    </div>
  );
}

function HeroCard({
  title,
  value,
  good,
  bad,
}: {
  title: string;
  value: string;
  good?: boolean;
  bad?: boolean;
}) {
  return (
  <div className="rounded-2xl bg-white p-4 shadow-sm">
    <p className="text-xs font-bold text-slate-500">{title}</p>

    <h4 className="mt-2 text-2xl font-black text-blue-950">
      {value}
    </h4>

    <p
      className={`mt-1 text-xs font-bold ${
        bad
          ? "text-red-500"
          : good
          ? "text-green-600"
          : "text-slate-500"
      }`}
    >
      {bad ? "Needs attention" : "Growing well"}
    </p>
  </div>
);
}

function Why({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-5">
      <h3 className="font-black">{title}</h3>
      <p className="mt-2 text-sm text-blue-100">{text}</p>
    </div>
  );
}

function FooterLinks({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h4 className="font-black">{title}</h4>

      <ul className="mt-4 space-y-3 text-sm text-slate-400">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              className="transition hover:text-white hover:underline"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}