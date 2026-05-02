"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { APP_NAME } from "@/lib/app-config";

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      alert("Invalid email or password");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-[#0f172a] via-[#1e3a8a] to-[#0ea5e9] px-4">
      {/* Background Finance Effect */}
      <div className="pointer-events-none absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]" />

      <div className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl md:grid-cols-2">
        {/* LEFT SIDE */}
        <div className="hidden flex-col justify-center bg-blue-900 p-10 text-white md:flex">
          <h1 className="text-4xl font-black">{APP_NAME}</h1>

          <p className="mt-4 text-blue-200">
            Smart Accounting for Indian Businesses
            <span className="india-flag flag-wave" aria-label="india flag"/>
          </p>

          <ul className="mt-6 space-y-3 text-sm">
            <li>✔️ Instant Invoice Creation</li>
            <li>✔️ GST + ITR Ready</li>
            <li>✔️ AI Business Insights</li>
            <li>✔️ Secure & Cloud Based</li>
          </ul>
        </div>

        {/* RIGHT SIDE */}
        <form onSubmit={handleSubmit} className="bg-white p-10">
          <h2 className="text-3xl font-black text-blue-900">
            Welcome Back 👋
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Login to manage your business
          </p>

          <div className="mt-8 space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) =>
                setForm((p) => ({ ...p, email: e.target.value }))
              }
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />

            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) =>
                setForm((p) => ({ ...p, password: e.target.value }))
              }
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-700 py-3 font-bold text-white shadow-lg transition hover:bg-blue-800 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Login"}
            </button>
          </div>

          <div className="mt-4 text-right">
            <Link
              href="/forgot-password"
              className="text-sm text-blue-700 hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-bold text-blue-700">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}