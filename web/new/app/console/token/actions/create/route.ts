import {
  assertApiSuccess,
  graphqlMutationFromRequest,
  unwrapApiData,
} from "@/lib/api/graphql";
import { toText } from "@/lib/console/format";
import { redirectTo } from "@/lib/console/route-redirect";
import { createApiKeyFieldsFromForm } from "@/lib/console/token-form";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();
  const payload = await graphqlMutationFromRequest<Record<string, unknown>>(
    request,
    createApiKeyFieldsFromForm(formData),
  );
  const created = Object.values(payload).map((result) => {
    assertApiSuccess(result);
    const data = unwrapApiData(result, {});
    const item = asRecord(asRecord(data).item);
    return {
      id: toText(item.id),
      name: toText(item.name),
      api_key: toText(asRecord(data).api_key),
    };
  });
  const teamId = toText(formData.get("team_id")).trim();
  const response = redirectTo(
    request,
    teamId
      ? `/teams/${encodeURIComponent(teamId)}/console/token/created`
      : "/console/token/created",
  );
  response.cookies.set("flint_created_api_keys", encodeFlash(created), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  });
  return response;
}

function encodeFlash(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
