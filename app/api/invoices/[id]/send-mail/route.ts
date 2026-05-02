import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";
import { sendEmail } from "@/lib/email"; // Resend fallback

type Props = {
  params: Promise<{ id: string }>;
};

function money(value: unknown) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function safe(value: unknown) {
  return String(value || "");
}

export async function POST(req: Request, { params }: Props) {
  try {
    const active = await requireActiveOrganization();
    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        organizationId: active.organizationId,
      },
      include: {
        customer: true,
        organization: true,
        lineItems: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice not found" },
        { status: 404 }
      );
    }

    if (!invoice.customer?.email) {
      return NextResponse.json(
        { success: false, error: "Customer email missing" },
        { status: 400 }
      );
    }

    const org = invoice.organization;
    const body = await req.json().catch(() => ({}));

    const baseUrl =
      body.baseUrl ||
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const invoiceUrl = `${baseUrl}/invoices/${invoice.id}/print`;
    const subject = `Invoice ${invoice.invoiceNumber} - ${org.name}`;
    const text = `Invoice ${invoice.invoiceNumber}. Amount: ₹${Number(
      invoice.totalAmount
    ).toFixed(2)}. View: ${invoiceUrl}`;

    // Line items HTML
    const itemsHtml =
      invoice.lineItems.length > 0
        ? invoice.lineItems
            .map(
              (item) => `
                <tr>
                  <td style="border:1px solid #e5e7eb;padding:8px;">${safe(
                    item.description
                  )}</td>
                  <td style="border:1px solid #e5e7eb;padding:8px;text-align:center;">${Number(
                    item.quantity || 0
                  ).toFixed(2)}</td>
                  <td style="border:1px solid #e5e7eb;padding:8px;text-align:right;">${money(
                    item.unitPrice
                  )}</td>
                  <td style="border:1px solid #e5e7eb;padding:8px;text-align:right;">${Number(
                    item.taxRate || 0
                  ).toFixed(2)}%</td>
                  <td style="border:1px solid #e5e7eb;padding:8px;text-align:right;">${money(
                    item.lineTotal
                  )}</td>
                </tr>`
            )
            .join("")
        : `<tr><td colspan="5" style="border:1px solid #e5e7eb;padding:8px;text-align:center;">No items</td></tr>`;

    // Common HTML body
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:760px;margin:auto;color:#111827;line-height:1.6;">
        <div style="padding:20px;border:1px solid #e5e7eb;border-radius:14px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e5e7eb;padding-bottom:16px;">
            <div>
              <h2 style="margin:0;color:#1d4ed8;">${safe(org.name)}</h2>
              <p style="margin:6px 0 0;color:#6b7280;">${safe(org.companyAddress)}</p>
              <p style="margin:4px 0;color:#6b7280;">${safe(org.companyEmail || "")}</p>
            </div>
            <div style="text-align:right;">
              <h1 style="margin:0;color:#111827;">INVOICE</h1>
              <p style="margin:6px 0;">#${safe(invoice.invoiceNumber)}</p>
            </div>
          </div>
          <div style="margin-top:18px;">
            <p><b>Bill To:</b> ${safe(invoice.customer.name)}</p>
            <p><b>Email:</b> ${safe(invoice.customer.email)}</p>
          </div>
          <table style="border-collapse:collapse;width:100%;margin-top:18px;font-size:14px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="border:1px solid #e5e7eb;padding:8px;text-align:left;">Item</th>
                <th style="border:1px solid #e5e7eb;padding:8px;">Qty</th>
                <th style="border:1px solid #e5e7eb;padding:8px;text-align:right;">Rate</th>
                <th style="border:1px solid #e5e7eb;padding:8px;text-align:right;">Tax</th>
                <th style="border:1px solid #e5e7eb;padding:8px;text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div style="margin-top:18px;text-align:right;">
            <p><b>Subtotal:</b> ${money(invoice.subtotal)}</p>
            <p><b>Tax:</b> ${money(invoice.taxAmount)}</p>
            <p><b>Total:</b> ${money(invoice.totalAmount)}</p>
            <p><b>Balance Due:</b> ${money(invoice.balanceDue)}</p>
          </div>
          <div style="margin-top:20px;padding:14px;background:#f9fafb;border-radius:10px;">
            <h3 style="margin:0 0 8px;">Payment Details</h3>
            <p style="margin:4px 0;"><b>Bank:</b> ${safe(org.bankName)}</p>
            <p style="margin:4px 0;"><b>Account:</b> ${safe(org.accountNumber)}</p>
            <p style="margin:4px 0;"><b>IFSC:</b> ${safe(org.ifscCode)}</p>
            <p style="margin:4px 0;"><b>UPI:</b> ${safe(org.upiId)}</p>
          </div>
          <p style="margin-top:20px;">
            <a href="${invoiceUrl}" style="background:#2563eb;color:white;padding:10px 16px;text-decoration:none;border-radius:8px;display:inline-block;">
              View / Download Invoice PDF
            </a>
          </p>
          <p style="color:#6b7280;font-size:13px;margin-top:22px;">
            Thank you for your business.<br/>
            ${safe(org.name)}
          </p>
        </div>
      </div>
    `;

    // ---- 🔁 Decide: Own SMTP or Resend ----
    const smtpEmail = org.smtpEmail;
    const smtpPassword = org.smtpAppPassword;

    if (smtpEmail && smtpPassword) {
      // SMTP credentials available → use Gmail
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: smtpEmail,
          pass: smtpPassword,
        },
      });

      await transporter.sendMail({
        from: `"${org.smtpFromName || org.name}" <${smtpEmail}>`,
        to: invoice.customer.email,
        subject,
        html,
        text,
      });
    } else {
      // No SMTP → fallback to Resend
      await sendEmail({
        to: invoice.customer.email,
        subject,
        html,
        text,
      });
    }

    await prisma.invoice.update({
       where: { id: invoice.id },
       data: {
        status: invoice.status === "DRAFT" ? "SENT" : invoice.status,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Invoice email sent successfully",
    });
  } catch (error: any) {
  console.error("SEND_INVOICE_MAIL_ERROR:", error);

  return NextResponse.json(
    {
      success: false,
      error: error?.message || "Failed to send invoice email",
    },
    { status: 500 }
  );
  }
}