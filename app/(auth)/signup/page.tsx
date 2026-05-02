"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { APP_NAME } from "@/lib/app-config";

export default function SignupPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    organizationName: "",
  });

  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!data.success) {
      setLoading(false);
      alert(data.error || "Signup failed");
      return;
    }

    await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-[#0f172a] via-[#1e3a8a] to-[#0ea5e9] px-4">

      <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl md:grid-cols-2">

        {/* LEFT */}
        <div className="hidden flex-col justify-center bg-blue-900 p-10 text-white md:flex">
          <h1 className="text-4xl font-black">{APP_NAME}</h1>
          <p className="mt-4 text-blue-200">
            Smart Accounting for Indian Businesses 
            <span className="india-flag flag-wave" aria-label="india flag"/>
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            <li>✔️ 1 Invoice Free</li>
            <li>✔️ No card required</li>
            <li>✔️ Setup in 30 seconds</li>
            <li>✔️ Works on Mobile</li>
          </ul>
        </div>

        {/* RIGHT */}
        <form onSubmit={handleSubmit} className="p-10">

          <h2 className="text-3xl font-black text-blue-900">
            Create Account
          </h2>

          <div className="mt-8 space-y-4">

            <input
              type="text"
              placeholder="Full Name"
              required
              onChange={(e) =>
                setForm((p) => ({ ...p, name: e.target.value }))
              }
              className="w-full rounded-xl border px-4 py-3"
            />

            <input
              type="text"
              placeholder="Organization Name"
              required
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  organizationName: e.target.value,
                }))
              }
              className="w-full rounded-xl border px-4 py-3"
            />

            <input
              type="email"
              placeholder="Email"
              required
              onChange={(e) =>
                setForm((p) => ({ ...p, email: e.target.value }))
              }
              className="w-full rounded-xl border px-4 py-3"
            />

            <input
              type="password"
              placeholder="Password"
              required
              onChange={(e) =>
                setForm((p) => ({ ...p, password: e.target.value }))
              }
              className="w-full rounded-xl border px-4 py-3"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-700 py-3 font-bold text-white shadow-lg"
            >
              {loading ? "Creating..." : "Create Account"}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-blue-700">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}