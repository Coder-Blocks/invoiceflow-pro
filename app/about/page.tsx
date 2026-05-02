import InfoPage from "@/components/marketing/InfoPage";

export default function AboutPage() {
  return (
    <InfoPage
      title="About Us"
      subtitle="InvoiceFlow Pro is a modern billing and invoicing platform designed to simplify financial management for small and growing businesses.

We understand that traditional accounting tools are often complex, expensive, and time-consuming. That’s why InvoiceFlow Pro focuses on delivering a clean, fast, and intuitive experience — so you can create invoices, track payments, and manage your business finances effortlessly.

With built-in GST support, professional PDF invoice generation, real-time payment tracking, and a powerful dashboard, InvoiceFlow Pro helps businesses stay organized and make smarter decisions.

Our mission is simple:
To empower entrepreneurs, freelancers, and small business owners with tools that save time, reduce errors, and improve cash flow.

Whether you are a startup, freelancer, retailer, or service provider — InvoiceFlow Pro is built to grow with your business.

Fast. Simple. Reliable.
That’s InvoiceFlow Pro."
      points={[
        "Create invoices in seconds",
        "GST-ready system",
        "Track payments easily",
        "Professional PDF export",
      ]}
    />
  );
}