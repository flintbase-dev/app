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
  const teamId = toText(formData.get("team_id"));
  if (ids.length === 0) throw new Error("No API key ids selected");
  const operation = teamId ? "deleteTeamApiKeys" : "deleteApiKeys";
  const payload = await graphqlMutationFromRequest<Record<string, unknown>>(
    request,
    [
      {
        operation,
        input: { ids, ...(teamId ? { team_id: teamId } : {}) },
        ...(teamId ? { params: { team_id: teamId } } : {}),
      },
    ],
  );
  assertApiSuccess(payload[operation]);
  return redirectTo(
    request,
    teamId ? `/teams/${teamId}/console/token` : "/console/token",
  );
}
