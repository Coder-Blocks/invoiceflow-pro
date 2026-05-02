"use client";

import { useState } from "react";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });

  function updateField(key: string, value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const whatsappNumber = "919667157649"; // 👉 replace if needed

    const text = `Name: ${form.name}%0AEmail: ${form.email}%0AMessage: ${form.message}`;

    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, "_blank");
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-blue-50 via-white to-sky-100 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        
        {/* Heading */}
        <div className="text-center">
          <h1 className="text-4xl font-black text-slate-900">
            Contact Us
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Have questions or need support? We are here to help you.
          </p>
        </div>

        {/* Contact Card */}
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          
          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border bg-white p-8 shadow-lg"
          >
            <h2 className="text-xl font-bold text-slate-900">
              Send Message
            </h2>

            <div className="mt-6 space-y-4">
              <input
                placeholder="Your Name"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                required
                className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-600"
              />

              <input
                type="email"
                placeholder="Your Email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
                className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-600"
              />

              <textarea
                placeholder="Your Message"
                value={form.message}
                onChange={(e) => updateField("message", e.target.value)}
                required
                rows={4}
                className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-600"
              />

              <button
                type="submit"
                className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
              >
                Send via WhatsApp
              </button>
            </div>
          </form>

          {/* Info */}
          <div className="rounded-3xl border bg-white p-8 shadow-lg">
            <h2 className="text-xl font-bold text-slate-900">
              Contact Information
            </h2>

            <div className="mt-6 space-y-4 text-slate-600">
              <p>📍 Vizianagaram, Andhra Pradesh, India</p>
              <p>📞 +91 9667157649</p>
              <p>📧 support@invoiceflowpro.in</p>
            </div>

            <div className="mt-8 rounded-2xl bg-blue-600 p-6 text-white">
              <h3 className="text-lg font-bold">
                Need instant help?
              </h3>
              <p className="mt-2 text-blue-100">
                Chat with us directly on WhatsApp for quick support.
              </p>
              <a
                href="https://wa.me/919667157649"
                target="_blank"
                className="mt-4 inline-block rounded-xl bg-white px-5 py-2 font-semibold text-blue-600"
              >
                Chat Now
              </a>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}