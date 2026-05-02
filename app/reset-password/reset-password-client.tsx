"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordClient() {
  const params = useSearchParams();
  const router = useRouter();

  const token = params.get("token");
  const email = params.get("email");

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, token, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!data.success) {
      alert(data.error || "Failed");
      return;
    }

    alert("Password reset successful ✅");
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white px-4">
      <form
        onSubmit={handleReset}
        className="w-full max-w-md rounded-3xl border border-yellow-500/20 bg-zinc-900/60 p-8 backdrop-blur-xl"
      >
        <h1 className="text-2xl font-bold text-yellow-400 text-center">
          Reset Password
        </h1>

        <p className="text-sm text-zinc-400 text-center mt-2">{email}</p>

        <div className="mt-6 space-y-4">
          <input
            type="password"
            placeholder="New Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl bg-black border border-yellow-500/20 px-4 py-3 text-white"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-yellow-500 to-amber-300 px-4 py-3 font-bold text-black"
          >
            {loading ? "Updating..." : "Reset Password"}
          </button>
        </div>
      </form>
    </div>
  );
}