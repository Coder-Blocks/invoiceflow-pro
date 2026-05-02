import { NextResponse } from "next/server";
import { requireActiveOrganization } from "@/lib/active-organization";
import { checkFreeUsageLimit } from "@/lib/free-plan-guard";

export async function POST(req: Request) {
  try {
    const active = await requireActiveOrganization();
    const body = await req.json();

    const action = String(body.action || "");
    const limit = Number(body.limit || 1);

    if (active.organization.plan !== "FREE") {
      return NextResponse.json({
        success: true,
        allowed: true,
        premium: true,
      });
    }

    const result = await checkFreeUsageLimit({
      organizationId: active.organizationId,
      action,
      limit,
    });

    return NextResponse.json({
      success: true,
      allowed: result.allowed,
      used: result.used,
      limit: result.limit,
      premium: false,
    });
  } catch (error) {
    console.error("FREE_PLAN_CHECK_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check free plan limit" },
      { status: 500 }
    );
  }
}