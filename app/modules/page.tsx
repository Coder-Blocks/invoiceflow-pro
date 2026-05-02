import InfoPage from "@/components/marketing/InfoPage";

export default function ModulesPage() {
  return (
    <InfoPage
      title="Modules"
      subtitle="InvoiceFlow Pro is built with powerful modules to handle every part of your business billing, finance, and customer management in one place."
      points={[
        "Invoice Management – Create, edit, send, and track invoices",
        "Estimate / Quotation – Send quotations and convert to invoices",
        "Customer Management – Store and manage all customer details",
        "Payment Tracking – Record payments and track pending dues",
        "GST Calculation – Automatic GST calculations and summaries",
        "Reports Module – Sales reports, tax reports, and insights",
        "Email System – Send invoices directly via email",
        "Settings Module – Customize company details and branding",
        "Bank & UPI Integration – Add payment details to invoices",
        "PDF Generator – Professional invoice PDF download",
        "Expense Tracking – Track business expenses easily",
        "Free Plan Guard – Limit usage for free users",
      ]}
    />
  );
}