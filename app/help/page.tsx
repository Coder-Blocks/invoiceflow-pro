export default function HelpPage() {
  return (
    <main className="min-h-screen bg-linear-to-b from-blue-50 via-white to-sky-100 px-6 py-16">
      <div className="mx-auto max-w-4xl rounded-3xl border bg-white p-8 shadow-lg">

        {/* Heading */}
        <h1 className="text-4xl font-black text-slate-900">
          Help & Support
        </h1>

        <p className="mt-4 text-slate-600">
          Need help using InvoiceFlow Pro? You’re in the right place.
        </p>

        {/* FAQ */}
        <div className="mt-8 space-y-6 text-slate-700">

          <section>
            <h2 className="text-xl font-bold text-slate-900">
              1. How to create an invoice?
            </h2>
            <p className="mt-2">
              Go to Dashboard → Invoices → Create Invoice. Fill in customer details,
              add line items, and save or send the invoice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">
              2. How to send invoice via email?
            </h2>
            <p className="mt-2">
              Open any invoice and click “Send Invoice”. Make sure customer email
              is added and your email settings are configured.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">
              3. Why is email not sending?
            </h2>
            <p className="mt-2">
              Check your SMTP settings or ensure Resend API is configured properly.
              Also verify spam folder of the receiver.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">
              4. How to download invoice PDF?
            </h2>
            <p className="mt-2">
              Open invoice → Click “Download / Print PDF”. A printable version will open.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">
              5. How to add company details?
            </h2>
            <p className="mt-2">
              Go to Settings → Fill company name, logo, address, bank details, and save.
            </p>
          </section>

        </div>

        {/* Contact */}
        <div className="mt-10 rounded-2xl bg-blue-600 p-6 text-white">
          <h2 className="text-2xl font-bold">Still need help?</h2>
          <p className="mt-2 text-blue-100">
            Contact our support team and we’ll assist you quickly.
          </p>

          <div className="mt-4 space-y-2">
            <p>📧 support@invoiceflowpro.in</p>
            <p>📞 +91 9667157649</p>
          </div>

          <a
            href="https://wa.me/919667157649"
            target="_blank"
            className="mt-4 inline-block rounded-xl bg-white px-5 py-2 font-semibold text-blue-600"
          >
            Chat on WhatsApp
          </a>
        </div>

      </div>
    </main>
  );
}