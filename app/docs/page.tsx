export default function DocsPage() {
  return (
    <main className="min-h-screen bg-linear-to-b from-blue-50 via-white to-sky-100 px-6 py-16">
      <div className="mx-auto max-w-5xl rounded-3xl border bg-white p-8 shadow-lg">

        {/* Heading */}
        <h1 className="text-4xl font-black text-slate-900">
          Documentation
        </h1>

        <p className="mt-4 text-slate-600">
          Complete guide to use InvoiceFlow Pro effectively for your business.
        </p>

        <div className="mt-10 space-y-8 text-slate-700">

          {/* Getting Started */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900">
              Getting Started
            </h2>
            <p className="mt-2">
              Sign up, login, and set up your company details from the Settings page.
              Add logo, address, and payment details before creating invoices.
            </p>
          </section>

          {/* Invoices */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900">
              Invoices
            </h2>
            <p className="mt-2">
              Create invoices by adding customers and line items. You can download,
              print, or send invoices directly via email.
            </p>
          </section>

          {/* Estimates */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900">
              Estimates / Quotations
            </h2>
            <p className="mt-2">
              Send estimates to customers and convert them into invoices once approved.
            </p>
          </section>

          {/* Payments */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900">
              Payments
            </h2>
            <p className="mt-2">
              Track received payments and monitor pending balances in real time.
            </p>
          </section>

          {/* Email */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900">
              Email System
            </h2>
            <p className="mt-2">
              Send invoices using either your own Gmail SMTP or the default system email service.
            </p>
          </section>

          {/* Reports */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900">
              Reports & GST
            </h2>
            <p className="mt-2">
              View sales reports, tax summaries, and GST breakdown for better financial insights.
            </p>
          </section>

          {/* Security */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900">
              Data & Security
            </h2>
            <p className="mt-2">
              Your data is securely stored and used only for providing services like invoicing,
              reporting, and analytics.
            </p>
          </section>

        </div>

        {/* CTA */}
        <div className="mt-12 rounded-2xl bg-blue-600 p-6 text-white text-center">
          <h2 className="text-2xl font-bold">
            Need more help?
          </h2>
          <p className="mt-2 text-blue-100">
            Visit Help page or contact support anytime.
          </p>

          <a
            href="/help"
            className="mt-4 inline-block rounded-xl bg-white px-5 py-3 font-semibold text-blue-600"
          >
            Go to Help Center
          </a>
        </div>

      </div>
    </main>
  );
}