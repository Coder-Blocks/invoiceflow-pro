import { OrganizationRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const ROLE_LEVEL: Record<OrganizationRole, number> = {
  OWNER: 5,
  ADMIN: 4,
  ACCOUNTANT: 3,
  STAFF: 2,
  MEMBER: 1,
};

export function hasRole(
  userRole: OrganizationRole | string | null | undefined,
  allowedRoles: OrganizationRole[]
) {
  if (!userRole) return false;

  return allowedRoles.includes(userRole as OrganizationRole);
}

export async function getMembershipRole({
  userId,
  organizationId,
}: {
  userId: string;
  organizationId: string;
}) {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      organizationId,
      status: "ACTIVE",
    },
  });

  return membership?.role || null;
}

export async function requireRole({
  userId,
  organizationId,
  allowedRoles,
}: {
  userId: string;
  organizationId: string;
  allowedRoles: OrganizationRole[];
}) {
  const role = await getMembershipRole({
    userId,
    organizationId,
  });

  if (!role || !allowedRoles.includes(role)) {
    throw new Error("Permission denied");
  }

  return role;
}