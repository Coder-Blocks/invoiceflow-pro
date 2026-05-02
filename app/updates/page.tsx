import InfoPage from "@/components/marketing/InfoPage";

export default function UpdatesPage() {
  return (
    <InfoPage
      title="Updates"
      subtitle="Stay updated with the latest improvements, features, and enhancements added to InvoiceFlow Pro."
      points={[
        "Invoice PDF download and print support added",
        "Estimate approval and convert-to-invoice flow improved",
        "GST summary and payment tracking added",
        "Company branding with logo, address, and watermark added",
        "Email invoice sending with Resend and Gmail SMTP support",
        "Bank, UPI, and QR code details added to invoices",
        "Dashboard and business reports upgraded",
        "Supabase database integration completed",
        "PWA install app support added",
        "Pricing plans prepared for Razorpay approval",
      ]}
    />
  );
}