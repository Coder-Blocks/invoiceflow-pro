export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-linear-to-b from-blue-50 via-white to-sky-100 px-6 py-16">
      <div className="mx-auto max-w-4xl rounded-3xl border bg-white p-8 shadow-lg">
        <h1 className="text-4xl font-black text-slate-900">
          Privacy Policy
        </h1>

        <p className="mt-4 text-slate-600">
          At InvoiceFlow Pro, we respect your privacy and are committed to protecting your business data.
        </p>

        <div className="mt-8 space-y-6 text-slate-700">
          <section>
            <h2 className="text-xl font-bold text-slate-900">1. Information We Collect</h2>
            <p className="mt-2">
              We may collect your name, email, business details, invoice data, customer details, and payment-related information required to provide our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">2. How We Use Your Data</h2>
            <p className="mt-2">
              Your data is used to create invoices, manage customers, track payments, generate reports, and improve your experience on InvoiceFlow Pro.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">3. Data Security</h2>
            <p className="mt-2">
              We use secure systems and trusted hosting providers to protect your information from unauthorized access.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">4. Third-Party Services</h2>
            <p className="mt-2">
              We may use third-party services such as payment gateways, email providers, and cloud database providers only for operating the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">5. Contact</h2>
            <p className="mt-2">
              For privacy-related questions, contact us at support@invoiceflowpro.in.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}