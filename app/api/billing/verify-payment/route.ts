import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Please login first" },
        { status: 401 }
      );
    }

    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        status: "ACTIVE",
      },
      include: {
        organization: true,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: "No active organization found" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const razorpayOrderId = String(body.razorpay_order_id || "");
    const razorpayPaymentId = String(body.razorpay_payment_id || "");
    const razorpaySignature = String(body.razorpay_signature || "");
    const planName = String(body.plan || "STARTER");
    const amount = Number(body.amount || 0);

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !amount) {
      return NextResponse.json(
        { success: false, error: "Missing payment details" },
        { status: 400 }
      );
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return NextResponse.json(
        { success: false, error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.subscriptionPayment.create({
        data: {
          organizationId: membership.organizationId,
          planName,
          amount,
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          status: "PAID",
        },
      });

      await tx.organization.update({
        where: {
          id: membership.organizationId,
        },
        data: {
          plan: planName,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
      plan: planName,
    });
  } catch (error) {
    console.error("VERIFY_RAZORPAY_PAYMENT_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}