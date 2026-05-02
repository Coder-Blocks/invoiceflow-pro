import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        {
          success: false,
          error: "Razorpay keys missing. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel ENV and redeploy.",
        },
        { status: 500 }
      );
    }

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

    const amount = Number(body.amount);
    const plan = String(body.plan || "STARTER").toUpperCase();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid amount received from billing page" },
        { status: 400 }
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `ifp_${Date.now()}`,
      notes: {
        organizationId: membership.organizationId,
        organizationName: membership.organization.name,
        plan,
      },
    });

    return NextResponse.json({
      success: true,
      order,
      key: keyId,
    });
  } catch (error: any) {
    console.error("CREATE_RAZORPAY_ORDER_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error?.error?.description ||
          error?.message ||
          "Failed to create Razorpay order",
      },
      { status: 500 }
    );
  }
}