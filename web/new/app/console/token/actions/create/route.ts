import {
  assertApiSuccess,
  graphqlMutationFromRequest,
} from "@/lib/api/graphql";
import { redirectTo } from "@/lib/console/route-redirect";
import { createTokenFieldsFromForm } from "@/lib/console/token-form";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();
  const payload = await graphqlMutationFromRequest<Record<string, unknown>>(
    request,
    createTokenFieldsFromForm(formData),
  );
  for (const result of Object.values(payload)) assertApiSuccess(result);
  return redirectTo(request, "/console/token");
}
