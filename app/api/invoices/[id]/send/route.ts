import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";
import { sendEmail } from "@/lib/email";
import {
  checkFreeUsageLimit,
  recordFreeUsage,
} from "@/lib/free-plan-guard";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: Props) {
  try {
    const active = await requireActiveOrganization();
    const { id } = await params;

    if (active.organization.plan === "FREE") {
      const usage = await checkFreeUsageLimit({
        organizationId: active.organizationId,
        action: "SEND_INVOICE_EMAIL",
        limit: 1,
      });

      if (!usage.allowed) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Free plan allows only 1 invoice email. Please upgrade to premium.",
          },
          { status: 403 }
        );
      }
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        organizationId: active.organizationId,
      },
      include: {
        customer: true,
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
        { success: false, error: "Customer email not found" },
        { status: 400 }
      );
    }

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const invoiceUrl = `${appUrl}/invoices/${invoice.id}/print`;

    await sendEmail({
      to: invoice.customer.email,
      subject: `Invoice ${invoice.invoiceNumber} from ${active.organization.name}`,
      text: `Invoice ${invoice.invoiceNumber}. Amount: ₹${Number(
        invoice.totalAmount
      ).toFixed(2)}. View: ${invoiceUrl}`,
      html: `
        <div style="font-family:Arial,sans-serif;background:#050505;padding:28px;">
          <div style="max-width:640px;margin:auto;background:#111827;padding:26px;border-radius:18px;border:1px solid #d4af37;">
            <h2 style="color:#d4af37;">Invoice ${invoice.invoiceNumber}</h2>
            <p style="color:#f8fafc;">Hello ${invoice.customer.name || "Customer"},</p>
            <p style="color:#cbd5e1;">Please find your invoice details below.</p>
            <table style="width:100%;margin-top:18px;border-collapse:collapse;color:#f8fafc;">
              <tr><td style="padding:10px;border-bottom:1px solid #334155;">Invoice No</td><td style="padding:10px;border-bottom:1px solid #334155;"><b>${invoice.invoiceNumber}</b></td></tr>
              <tr><td style="padding:10px;border-bottom:1px solid #334155;">Total Amount</td><td style="padding:10px;border-bottom:1px solid #334155;"><b>₹${Number(invoice.totalAmount).toFixed(2)}</b></td></tr>
              <tr><td style="padding:10px;border-bottom:1px solid #334155;">Balance Due</td><td style="padding:10px;border-bottom:1px solid #334155;"><b>₹${Number(invoice.balanceDue).toFixed(2)}</b></td></tr>
            </table>
            <div style="margin-top:26px;">
              <a href="${invoiceUrl}" style="background:#d4af37;color:#050505;padding:12px 18px;text-decoration:none;border-radius:10px;font-weight:bold;">View / Download Invoice</a>
            </div>
            <p style="color:#f8fafc;margin-top:28px;">Regards,<br/>${active.organization.name}</p>
          </div>
        </div>
      `,
    });

    await prisma.invoice.update({
      where: {
        id: invoice.id,
      },
      data: {
        status: invoice.status === "DRAFT" ? "SENT" : invoice.status,
      },
    });

    if (active.organization.plan === "FREE") {
      await recordFreeUsage({
        organizationId: active.organizationId,
        actorUserId: active.userId,
        action: "SEND_INVOICE_EMAIL",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Invoice email sent successfully",
    });
  } catch (error) {
    console.error("SEND_INVOICE_EMAIL_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send invoice email" },
      { status: 500 }
    );
  }
}