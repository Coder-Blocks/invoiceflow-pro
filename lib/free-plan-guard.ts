import { prisma } from "@/lib/prisma";

export async function checkFreeUsageLimit({
  organizationId,
  action,
  limit,
}: {
  organizationId: string;
  action: string;
  limit: number;
}) {
  const count = await prisma.auditLog.count({
    where: {
      organizationId,
      action,
      entityType: "FREE_PLAN_USAGE",
    },
  });

  return {
    allowed: count < limit,
    used: count,
    limit,
  };
}

export async function recordFreeUsage({
  organizationId,
  actorUserId,
  action,
}: {
  organizationId: string;
  actorUserId?: string;
  action: string;
}) {
  await prisma.auditLog.create({
    data: {
      organizationId,
      actorUserId,
      action,
      entityType: "FREE_PLAN_USAGE",
      metadata: {
        usedAt: new Date().toISOString(),
      },
    },
  });
}