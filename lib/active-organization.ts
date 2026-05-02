import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireActiveOrganization() {
  const session = await getServerSession(authOptions);

  if (!session?.user || !(session.user as any).id) {
    redirect("/login");
  }

  const userId = (session.user as any).id as string;

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      status: "ACTIVE",
    },
    include: {
      organization: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!membership) {
    redirect("/login");
  }

  return {
    session,
    userId,
    organizationId: membership.organizationId,
    organization: membership.organization,
    membership,
  };
}