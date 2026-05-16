import {
  assertApiSuccess,
  graphqlMutationFromRequest,
} from "@/lib/api/graphql";
import { toText } from "@/lib/console/format";
import { redirectTo } from "@/lib/console/route-redirect";
import { requireFormString } from "@/lib/console/token-form";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();
  const id = requireFormString(formData.get("id"), "API key id is required");
  const teamId = toText(formData.get("team_id"));
  const operation = teamId ? "deleteTeamApiKey" : "deleteApiKey";
  const payload = await graphqlMutationFromRequest<Record<string, unknown>>(
    request,
    [
      {
        operation,
        input: { id, ...(teamId ? { team_id: teamId } : {}) },
        ...(teamId ? { params: { team_id: teamId, id } } : {}),
      },
    ],
  );
  assertApiSuccess(payload[operation]);
  return redirectTo(
    request,
    teamId ? `/teams/${teamId}/console/token` : "/console/token",
  );
}
