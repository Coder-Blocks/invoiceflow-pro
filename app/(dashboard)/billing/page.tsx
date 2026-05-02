"use client";

import { useState } from "react";
import { PRICING_PLANS } from "@/lib/plans";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function BillingPage() {
  const [loadingPlan, setLoadingPlan] = useState("");
  const [message, setMessage] = useState("");

  async function loadRazorpayScript() {
    return await new Promise<boolean>((resolve) => {
      const existing = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      );

      if (existing) return resolve(true);

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function buyPlan(plan: { name: string; price: number }) {
    setLoadingPlan(plan.name);
    setMessage("");

    const loaded = await loadRazorpayScript();

    if (!loaded) {
      setLoadingPlan("");
      alert("Failed to load Razorpay");
      return;
    }

    const orderRes = await fetch("/api/billing/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: plan.price,
        plan: plan.name,
      }),
    });

    const orderData = await orderRes.json();

    if (!orderData.success) {
      setLoadingPlan("");
      alert(orderData.error || "Failed to create order");
      return;
    }

    const options = {
      key: orderData.key,
      amount: orderData.order.amount,
      currency: orderData.order.currency,
      name: "InvoiceFlow Pro",
      description: `${plan.name} Plan`,
      order_id: orderData.order.id,
      handler: async function (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) {
        const verifyRes = await fetch("/api/billing/verify-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...response,
            plan: plan.name,
            amount: plan.price,
          }),
        });

        const verifyData = await verifyRes.json();

        if (!verifyData.success) {
          alert(verifyData.error || "Payment verification failed");
          return;
        }

        setMessage(`Payment successful. ${plan.name} plan activated.`);
      },
      theme: {
        color: "#d4af37",
      },
      modal: {
        ondismiss: function () {
          setLoadingPlan("");
        },
      },
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.open();
    setLoadingPlan("");
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-yellow-500/30 bg-black p-8 text-white shadow-xl">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-yellow-400">
          Premium Plans
        </p>
        <h1 className="mt-3 text-4xl font-black">Upgrade InvoiceFlow Pro</h1>
        <p className="mt-3 max-w-2xl text-zinc-300">
          Free users can try uploads temporarily and use only one export or email.
          Upgrade to unlock storage, exports, emails, reports, AI and automation.
        </p>
      </div>

      {message ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-3">
        {PRICING_PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`relative rounded-3xl border bg-white p-6 shadow-sm ${
              plan.popular ? "border-yellow-500 ring-2 ring-yellow-400/40" : ""
            }`}
          >
            {plan.popular ? (
              <span className="absolute right-5 top-5 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-black">
                BEST VALUE
              </span>
            ) : null}

            <h2 className="text-2xl font-black text-black">{plan.title}</h2>
            <p className="mt-2 text-sm text-zinc-600">{plan.description}</p>

            <p className="mt-5 text-5xl font-black text-yellow-600">
              ₹{plan.price}
              <span className="text-base font-medium text-zinc-500">/mo</span>
            </p>

            <ul className="mt-6 space-y-3 text-sm text-zinc-700">
              {plan.features.map((feature) => (
                <li key={feature}>✓ {feature}</li>
              ))}
            </ul>

            <button
              onClick={() => buyPlan(plan)}
              disabled={loadingPlan === plan.name}
              className="mt-7 w-full rounded-xl bg-black px-4 py-3 font-bold text-yellow-400 hover:bg-zinc-900"
            >
              {loadingPlan === plan.name ? "Processing..." : "Buy Plan"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}