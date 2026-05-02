export const PLANS = {
  FREE: {
    name: "FREE",
    price: 0,
    label: "Free Trial",
    invoiceLimit: 20,
    exportLimit: 1,
    emailLimit: 1,
  },
  STARTER: {
    name: "STARTER",
    price: 499,
    label: "Starter",
  },
  BUSINESS: {
    name: "BUSINESS",
    price: 999,
    label: "Business",
  },
  PRO: {
    name: "PRO",
    price: 2999,
    label: "Pro AI",
  },
};

export const PRICING_PLANS = [
  {
    name: "STARTER",
    price: 499,
    title: "Starter",
    description: "For small shops and freelancers.",
    features: [
      "Unlimited invoices",
      "Customers",
      "Basic GST reports",
      "PDF export",
      "Email invoice",
    ],
  },
  {
    name: "BUSINESS",
    price: 999,
    title: "Business",
    description: "Best for medical shops and small businesses.",
    features: [
      "Everything in Starter",
      "Medical inventory",
      "FIFO stock",
      "Expiry alerts",
      "Payroll",
      "Bank reconciliation",
    ],
    popular: true,
  },
  {
    name: "PRO",
    price: 2999,
    title: "Pro AI",
    description: "For advanced business automation.",
    features: [
      "Everything in Business",
      "AI Business Brain",
      "Advanced reports",
      "Backup & restore",
      "Priority support",
      "Premium features",
    ],
  },
];