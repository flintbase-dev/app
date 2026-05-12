import {
  assertApiSuccess,
  graphqlMutationFromRequest,
} from "@/lib/api/graphql";
import { redirectBack } from "@/lib/console/route-redirect";
import {
  requireFormString,
  tokenInputFromForm,
} from "@/lib/console/token-form";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();
  const id = requireFormString(formData.get("id"), "Token id is required");
  const payload = await graphqlMutationFromRequest<{ updateToken: unknown }>(
    request,
    [
      {
        operation: "updateToken",
        input: { ...tokenInputFromForm(formData), id },
      },
    ],
  );
  assertApiSuccess(payload.updateToken);
  return redirectBack(request, `/console/token/${id}`);
}
