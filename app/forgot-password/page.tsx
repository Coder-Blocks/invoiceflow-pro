"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLink, setResetLink] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResetLink("");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setLoading(false);

    if (!data.success) {
      alert(data.error || "Something went wrong");
      return;
    }

    // 🔥 MAIN UPDATE
    setResetLink(data.resetLink);

    alert(`Reset link generated!\n\n${data.resetLink}`);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-black px-4 text-white">
      
      {/* Glow Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#c6922e33,transparent_40%)]" />

      {/* Card */}
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-3xl border border-yellow-500/20 bg-zinc-900/60 p-8 backdrop-blur-xl shadow-[0_0_40px_#c6922e33]"
      >
        <h1 className="text-3xl font-black text-yellow-400 text-center">
          Forgot Password
        </h1>

        <p className="mt-2 text-center text-sm text-zinc-400">
          Enter your email to get reset link
        </p>

        <div className="mt-6 space-y-4">
          <input
            type="email"
            placeholder="Enter your email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl bg-black border border-yellow-500/20 px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-yellow-400"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-yellow-500 to-amber-300 px-4 py-3 font-bold text-black shadow-[0_0_25px_#c6922e88] transition hover:scale-[1.02] disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </div>

        {/* 🔥 Show Reset Link (IMPORTANT) */}
        {resetLink && (
          <div className="mt-6 rounded-xl border border-yellow-500/20 bg-black p-4 text-sm">
            <p className="text-yellow-400 font-semibold mb-2">
              Reset Link:
            </p>

            <a
              href={resetLink}
              className="text-blue-400 break-all underline"
            >
              {resetLink}
            </a>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-zinc-400">
          Back to{" "}
          <Link href="/login" className="text-yellow-400 hover:underline">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}