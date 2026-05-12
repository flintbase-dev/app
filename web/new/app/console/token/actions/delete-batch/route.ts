import {
  assertApiSuccess,
  graphqlMutationFromRequest,
} from "@/lib/api/graphql";
import { toText } from "@/lib/console/format";
import { redirectTo } from "@/lib/console/route-redirect";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();
  const ids = formData
    .getAll("ids")
    .map((id) => toText(id))
    .filter(Boolean);
  if (ids.length === 0) throw new Error("No token ids selected");
  const payload = await graphqlMutationFromRequest<{ deleteTokens: unknown }>(
    request,
    [{ operation: "deleteTokens", input: { ids } }],
  );
  assertApiSuccess(payload.deleteTokens);
  return redirectTo(request, "/console/token");
}
