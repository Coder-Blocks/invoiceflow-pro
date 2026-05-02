import InfoPage from "@/components/marketing/InfoPage";

export default function FeaturesPage() {
  return (
    <InfoPage
      title="Features"
      subtitle="InvoiceFlow Pro gives Indian small businesses everything they need to create invoices, manage payments, track GST, and run daily billing operations from one clean dashboard."
      points={[
        "Professional invoice creation with GST-ready totals",
        "Download and print invoice PDF instantly",
        "Send invoices to customers by email",
        "Customer and business profile management",
        "Payment tracking and balance due summary",
        "Estimate / quotation creation and conversion",
        "Expense tracking for better profit calculation",
        "GST reports and accounting reports",
        "UPI and bank payment details on invoices",
        "Company branding with logo, address, and watermark",
        "PWA install support for app-like experience",
        "Built for freelancers, retailers, agencies, and small businesses",
      ]}
    />
  );
}