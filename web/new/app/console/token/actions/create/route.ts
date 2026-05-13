import {
  assertApiSuccess,
  graphqlMutationFromRequest,
} from "@/lib/api/graphql";
import { toText } from "@/lib/console/format";
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
  const teamId = toText(formData.get("team_id"));
  return redirectTo(
    request,
    teamId ? `/teams/${teamId}/console/token` : "/console/token",
  );
}
