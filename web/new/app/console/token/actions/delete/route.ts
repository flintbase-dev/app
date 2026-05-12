import {
  assertApiSuccess,
  graphqlMutationFromRequest,
} from "@/lib/api/graphql";
import { redirectTo } from "@/lib/console/route-redirect";
import { requireFormString } from "@/lib/console/token-form";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();
  const id = requireFormString(formData.get("id"), "Token id is required");
  const payload = await graphqlMutationFromRequest<{ deleteToken: unknown }>(
    request,
    [{ operation: "deleteToken", input: { id } }],
  );
  assertApiSuccess(payload.deleteToken);
  return redirectTo(request, "/console/token");
}
