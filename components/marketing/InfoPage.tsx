import Link from "next/link";

type Props = {
  title: string;
  subtitle: string;
  points: string[];
};

export default function InfoPage({ title, subtitle, points }: Props) {
  return (
    <main className="min-h-screen bg-linear-to-br from-blue-50 via-white to-sky-100 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        
        {/* BACK BUTTON */}
        <Link href="/" className="text-sm font-bold text-blue-700">
          ← Back to Home
        </Link>

        <div className="mt-8 rounded-3xl border bg-white/80 p-8 shadow-xl backdrop-blur">
          
          {/* BRAND */}
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-600">
            InvoiceFlow Pro
          </p>

          {/* TITLE */}
          <h1 className="mt-4 text-4xl font-black text-slate-950 md:text-5xl">
            {title}
          </h1>

          {/* DESCRIPTION */}
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            {subtitle}
          </p>

          {/* 🇮🇳 TRUST LINE (INDIAN FLAG STYLE) */}
          <p className="mt-6 text-lg font-extrabold bg-linear-to-r from-orange-500 via-gray-200 to-green-600 bg-clip-text text-transparent drop-shadow-sm">
            Trusted by growing businesses across India
            <br/>
            <span className="india-flag flag-wave" aria-label="india flag"/>
          </p>

          {/* FEATURES */}
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {points.map((point) => (
              <div
                key={point}
                className="rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <p className="font-semibold text-slate-800">✅ {point}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-10 rounded-2xl bg-blue-700 p-6 text-white">
            <h2 className="text-2xl font-black">
              Ready to simplify billing?
            </h2>
            <p className="mt-2 text-blue-100">
              Start free and upgrade when your business grows.
            </p>

            <Link
              href="/signup"
              className="mt-5 inline-block rounded-xl bg-white px-5 py-3 font-bold text-blue-700 hover:bg-gray-100 transition"
            >
              Get Started Now
            </Link>
          </div>

        </div>
      </div>
    </main>
  );
}