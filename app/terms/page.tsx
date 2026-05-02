export default function TermsPage() {
  return (
    <main className="min-h-screen bg-linear-to-b from-blue-50 via-white to-sky-100 px-6 py-16">
      <div className="mx-auto max-w-4xl rounded-3xl border bg-white p-8 shadow-lg">
        
        <h1 className="text-4xl font-black text-slate-900">
          Terms & Conditions
        </h1>

        <p className="mt-4 text-slate-600">
          By using InvoiceFlow Pro, you agree to the following terms and conditions.
        </p>

        <div className="mt-8 space-y-6 text-slate-700">

          {/* 1 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900">
              1. Use of Service
            </h2>
            <p className="mt-2">
              InvoiceFlow Pro is designed to help businesses create invoices, manage customers,
              and track payments. You agree to use the platform only for lawful business purposes.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900">
              2. User Responsibility
            </h2>
            <p className="mt-2">
              You are responsible for maintaining the confidentiality of your account and
              ensuring that all information provided is accurate and up to date.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900">
              3. Payments & Subscriptions
            </h2>
            <p className="mt-2">
              Paid plans are billed monthly or yearly. All payments are processed securely
              through trusted payment providers. Failure to pay may result in suspension
              of services.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900">
              4. Data Usage
            </h2>
            <p className="mt-2">
              Your business data is used only to provide services such as invoicing,
              reporting, and analytics. We do not sell your data to third parties.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900">
              5. Service Availability
            </h2>
            <p className="mt-2">
              We strive to keep the service running at all times but do not guarantee
              uninterrupted access due to maintenance or technical issues.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900">
              6. Limitation of Liability
            </h2>
            <p className="mt-2">
              InvoiceFlow Pro is not liable for any financial loss, data loss,
              or business interruption caused by misuse or technical issues.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900">
              7. Changes to Terms
            </h2>
            <p className="mt-2">
              We may update these terms from time to time. Continued use of the
              platform means you accept the updated terms.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-bold text-slate-900">
              8. Contact Information
            </h2>
            <p className="mt-2">
              For any questions regarding these terms, contact us at:
              <br />
              <b>support@invoiceflowpro.in</b>
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}