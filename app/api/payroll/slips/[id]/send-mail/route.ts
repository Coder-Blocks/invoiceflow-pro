import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, { params }: Props) {
  try {
    const active = await requireActiveOrganization();
    const { id } = await params;

    const slip = await prisma.salarySlip.findFirst({
      where: {
        id,
        organizationId: active.organizationId,
      },
      include: {
        employee: true,
        organization: true,
      },
    });

    if (!slip) {
      return NextResponse.json(
        { success: false, error: "Salary slip not found" },
        { status: 404 }
      );
    }

    if (!slip.employee.email) {
      return NextResponse.json(
        { success: false, error: "Employee email not found" },
        { status: 400 }
      );
    }

    const org = slip.organization;

    const smtpEmail = org.smtpEmail || org.companyEmail || org.email;
    const smtpPassword = org.smtpAppPassword;

    if (!smtpEmail || !smtpPassword) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Company SMTP email/app password missing. Please update Settings.",
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const baseUrl =
      body.baseUrl ||
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const payslipUrl = `${baseUrl}/payroll/slips/${slip.id}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpEmail,
        pass: smtpPassword,
      },
    });

    await transporter.sendMail({
      from: `"${org.smtpFromName || org.name}" <${smtpEmail}>`,
      to: slip.employee.email,
      subject: `Salary Slip - ${slip.month}/${slip.year}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <h2>${org.name}</h2>
          <p>Hello ${slip.employee.name},</p>
          <p>Your salary slip for <b>${slip.month}/${slip.year}</b> is ready.</p>

          <p><b>Net Salary:</b> ₹${Number(slip.netSalary || 0).toFixed(2)}</p>

          <p>
            <a href="${payslipUrl}" 
              style="background:#2563eb;color:#fff;padding:10px 16px;text-decoration:none;border-radius:8px;display:inline-block">
              View / Download Payslip PDF
            </a>
          </p>

          <p>Regards,<br/>${org.name}</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: "Payslip email sent successfully",
    });
  } catch (error) {
    console.error("SEND_PAYSLIP_MAIL_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to send payslip email" },
      { status: 500 }
    );
  }
}