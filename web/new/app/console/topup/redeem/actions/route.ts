import {
  assertApiSuccess,
  graphqlMutationFromRequest,
} from "@/lib/api/graphql";
import { redirectTo } from "@/lib/console/route-redirect";
import { requireFormString } from "@/lib/console/token-form";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();
  const key = requireFormString(
    formData.get("key"),
    "Redemption code is required",
  );
  const payload = await graphqlMutationFromRequest<{ topup: unknown }>(
    request,
    [{ operation: "topup", input: { key } }],
  );
  assertApiSuccess(payload.topup);
  return redirectTo(request, "/console/topup");
}
