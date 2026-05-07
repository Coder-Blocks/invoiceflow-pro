import type { NextRequest } from "next/server";

type JsonBody = Record<string, unknown> | null | undefined;

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

  const organizationId = [fromQuery, fromHeaders, fromFormData, fromBody]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .find(Boolean);

  return organizationId || null;
}