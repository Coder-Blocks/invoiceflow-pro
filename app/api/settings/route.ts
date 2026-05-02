import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveOrganization } from "@/lib/active-organization";

export async function GET() {
  try {
    const active = await requireActiveOrganization();

    const organization = await prisma.organization.findUnique({
      where: {
        id: active.organizationId,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: organization,
    });
  } catch (error) {
    console.error("GET_SETTINGS_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const active = await requireActiveOrganization();
    const body = await req.json();

    const organization = await prisma.organization.update({
      where: {
        id: active.organizationId,
      },
      data: {
        name: body.name || "My Company",
        email: body.email || null,
        phone: body.phone || null,
        logoUrl: body.logoUrl || null,

        smtpEmail: body.smtpEmail || null,
        smtpAppPassword: body.smtpAppPassword || null,
        smtpFromName: body.smtpFromName || null,

        companyAddress: body.companyAddress || null,
        companyEmail: body.companyEmail || null,
        companyPhone: body.companyPhone || null,

        bankName: body.bankName || null,
        accountName: body.accountName || null,
        accountNumber: body.accountNumber || null,
        ifscCode: body.ifscCode || null,
        upiId: body.upiId || null,
        qrCodeUrl: body.qrCodeUrl || null,

        watermarkText: body.watermarkText || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: organization,
    });
  } catch (error) {
    console.error("UPDATE_SETTINGS_ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to update settings" },
      { status: 500 }
    );
  }
}