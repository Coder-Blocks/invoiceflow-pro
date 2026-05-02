export default function VideosPage() {
  return (
    <main className="min-h-screen bg-linear-to-b from-blue-50 via-white to-sky-100 px-6 py-16">
      <div className="mx-auto max-w-6xl">

        {/* Heading */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900">
            Video Tutorials
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Learn how to use InvoiceFlow Pro step-by-step with easy video guides.
          </p>
        </div>

        {/* Video Grid */}
        <div className="mt-14 grid gap-8 md:grid-cols-3">

          {/* Video 1 */}
          <div className="rounded-2xl border bg-white p-4 shadow-lg">
            <div className="aspect-video overflow-hidden rounded-xl">
              <iframe
                className="h-full w-full"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                title="Create Invoice"
                allowFullScreen
              />
            </div>
            <h3 className="mt-4 font-bold text-slate-900">
              How to Create Invoice
            </h3>
          </div>

          {/* Video 2 */}
          <div className="rounded-2xl border bg-white p-4 shadow-lg">
            <div className="aspect-video overflow-hidden rounded-xl">
              <iframe
                className="h-full w-full"
                src="https://www.youtube.com/embed/ysz5S6PUM-U"
                title="Send Invoice"
                allowFullScreen
              />
            </div>
            <h3 className="mt-4 font-bold text-slate-900">
              How to Send Invoice via Email
            </h3>
          </div>

          {/* Video 3 */}
          <div className="rounded-2xl border bg-white p-4 shadow-lg">
            <div className="aspect-video overflow-hidden rounded-xl">
              <iframe
                className="h-full w-full"
                src="https://www.youtube.com/embed/tgbNymZ7vqY"
                title="Settings Setup"
                allowFullScreen
              />
            </div>
            <h3 className="mt-4 font-bold text-slate-900">
              Complete Settings Setup
            </h3>
          </div>

        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-slate-900">
            Need more help?
          </h2>
          <p className="mt-2 text-slate-600">
            Visit our Help Center or contact support for assistance.
          </p>

          <a
            href="/help"
            className="mt-5 inline-block rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white"
          >
            Go to Help Center
          </a>
        </div>

      </div>
    </main>
  );
}