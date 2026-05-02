import "./globals.css";
import Navbar from "@/components/layout/navbar";
import Providers from "@/components/providers/session-provider";
import { Toaster } from "sonner";


export const metadata = {
  title: "InvoiceFlow Pro",
  description: "Smart Billing SaaS",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <Providers>
          
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}