import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "",
});

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
    const amount = Number(body.amount);
    const plan = String(body.plan || "STARTER");

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid amount" },
        { status: 400 }
      );
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `org_${membership.organizationId}_${Date.now()}`,
      notes: {
        organizationId: membership.organizationId,
        plan,
      },
    });

    return NextResponse.json({
      success: true,
      order,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("CREATE_RAZORPAY_ORDER_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create Razorpay order" },
      { status: 500 }
    );
  }
}