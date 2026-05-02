export default function PricingPage() {
  return (
    <main className="min-h-screen bg-linear-to-b from-blue-50 via-white to-sky-100 px-6 py-16">
      <div className="mx-auto max-w-6xl text-center">
        
        {/* Heading */}
        <h1 className="text-4xl md:text-5xl font-black text-slate-900">
          Simple & Transparent Pricing
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Choose a plan that fits your business needs. Start small and grow with InvoiceFlow Pro.
        </p>

        {/* Plans */}
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          
          {/* BASIC */}
          <div className="rounded-3xl border bg-white p-8 shadow-lg hover:shadow-2xl transition">
            <h2 className="text-xl font-bold text-blue-600">Starter</h2>
            <p className="mt-2 text-sm text-slate-500">Best for freelancers</p>

            <p className="mt-6 text-4xl font-black">₹499</p>
            <p className="text-sm text-slate-500">/month</p>

            <ul className="mt-6 space-y-3 text-sm text-slate-700 text-left">
              <li>✅ 50 invoices / month</li>
              <li>✅ Basic PDF download</li>
              <li>✅ Customer management</li>
              <li>❌ Email automation limited</li>
              <li>❌ GST reports</li>
            </ul>

            <button className="mt-8 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white">
              Get Started
            </button>
          </div>

          {/* PRO */}
          <div className="rounded-3xl border-2 border-blue-600 bg-white p-8 shadow-xl scale-105">
            <h2 className="text-xl font-bold text-blue-700">Pro</h2>
            <p className="mt-2 text-sm text-slate-500">Most popular</p>

            <p className="mt-6 text-4xl font-black">₹999</p>
            <p className="text-sm text-slate-500">/month</p>

            <ul className="mt-6 space-y-3 text-sm text-slate-700 text-left">
              <li>✅ Unlimited invoices</li>
              <li>✅ Email invoice sending</li>
              <li>✅ GST reports</li>
              <li>✅ Payment tracking</li>
              <li>✅ Estimate to invoice conversion</li>
            </ul>

            <button className="mt-8 w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white">
              Start Pro
            </button>
          </div>

          {/* PREMIUM */}
          <div className="rounded-3xl border bg-white p-8 shadow-lg hover:shadow-2xl transition">
            <h2 className="text-xl font-bold text-purple-600">Premium</h2>
            <p className="mt-2 text-sm text-slate-500">For growing businesses</p>

            <p className="mt-6 text-4xl font-black">₹2999</p>
            <p className="text-sm text-slate-500">/month</p>

            <ul className="mt-6 space-y-3 text-sm text-slate-700 text-left">
              <li>✅ Everything in Pro</li>
              <li>✅ Advanced analytics</li>
              <li>✅ Multi-user access</li>
              <li>✅ Priority support</li>
              <li>✅ Custom branding</li>
            </ul>

            <button className="mt-8 w-full rounded-xl bg-purple-600 px-5 py-3 font-semibold text-white">
              Go Premium
            </button>
          </div>

        </div>

        {/* Footer note */}
        <p className="mt-12 text-sm text-slate-500">
          No hidden charges. Cancel anytime.
        </p>
      </div>
    </main>
  );
}