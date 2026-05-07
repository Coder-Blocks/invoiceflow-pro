import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

type JsonBody = Record<string, unknown> | null | undefined;

async function resolveOrganizationIdFromSession(request: NextRequest): Promise<string | null> {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    const tokenSub =
      typeof token?.sub === "string" && token.sub.trim().length > 0
        ? token.sub.trim()
        : null;

    const tokenEmail =
      typeof token?.email === "string" && token.email.trim().length > 0
        ? token.email.trim()
        : null;

    if (tokenSub) {
      const membership = await prisma.organizationMember.findFirst({
        where: {
          userId: tokenSub,
        },
        select: {
          organizationId: true,
        },
      });

      if (membership?.organizationId) {
        return membership.organizationId;
      }
    }

    if (tokenEmail) {
      const membership = await prisma.organizationMember.findFirst({
        where: {
          user: {
            email: tokenEmail,
          },
        },
        select: {
          organizationId: true,
        },
      });

      if (membership?.organizationId) {
        return membership.organizationId;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function resolveOrganizationIdFromRequest(
  request: NextRequest,
  options?: {
    formData?: FormData | null;
    jsonBody?: JsonBody;
  },
): Promise<string | null> {
  const { formData, jsonBody } = options ?? {};

  const fromQuery =
    request.nextUrl.searchParams.get("organizationId") ||
    request.nextUrl.searchParams.get("orgId");

  const fromHeaders =
    request.headers.get("x-organization-id") ||
    request.headers.get("x-org-id");

  const fromFormData =
    formData?.get("organizationId")?.toString() ||
    formData?.get("orgId")?.toString();

  const fromBody =
    (typeof jsonBody?.organizationId === "string" ? jsonBody.organizationId : null) ||
    (typeof jsonBody?.orgId === "string" ? jsonBody.orgId : null);

  const manualOrganizationId = [fromQuery, fromHeaders, fromFormData, fromBody]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .find(Boolean);

  if (manualOrganizationId) {
    return manualOrganizationId;
  }

  return await resolveOrganizationIdFromSession(request);
}