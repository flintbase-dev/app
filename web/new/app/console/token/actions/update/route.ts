import {
  assertApiSuccess,
  graphqlMutationFromRequest,
} from "@/lib/api/graphql";
import { toText } from "@/lib/console/format";
import { redirectBack } from "@/lib/console/route-redirect";
import {
  requireFormString,
  tokenInputFromForm,
} from "@/lib/console/token-form";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();
  const id = requireFormString(formData.get("id"), "Token id is required");
  const teamId = toText(formData.get("team_id"));
  const operation = teamId ? "updateTeamToken" : "updateToken";
  const payload = await graphqlMutationFromRequest<Record<string, unknown>>(
    request,
    [
      {
        operation,
        input: {
          ...tokenInputFromForm(formData),
          id,
          ...(teamId ? { team_id: teamId } : {}),
        },
        ...(teamId ? { params: { team_id: teamId } } : {}),
      },
    ],
  );
  assertApiSuccess(payload[operation]);
  return redirectBack(
    request,
    teamId ? `/teams/${teamId}/console/token/${id}` : `/console/token/${id}`,
  );
}
