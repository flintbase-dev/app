import {
  assertApiSuccess,
  graphqlMutationFromRequest,
} from "@/lib/api/graphql";
import { toNumber, toText } from "@/lib/console/format";
import { redirectBack } from "@/lib/console/route-redirect";
import { requireFormString } from "@/lib/console/token-form";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();
  const id = requireFormString(formData.get("id"), "Token id is required");
  const currentStatus = toNumber(formData.get("status"), 1);
  const teamId = toText(formData.get("team_id"));
  const nextStatus = currentStatus === 1 ? 2 : 1;
  const operation = teamId ? "updateTeamToken" : "updateToken";
  const payload = await graphqlMutationFromRequest<Record<string, unknown>>(
    request,
    [
      {
        operation,
        input: {
          id,
          status: nextStatus,
          ...(teamId ? { team_id: teamId } : {}),
        },
        params: {
          status_only: true,
          ...(teamId ? { team_id: teamId } : {}),
        },
      },
    ],
  );
  assertApiSuccess(payload[operation]);
  return redirectBack(
    request,
    teamId ? `/teams/${teamId}/console/token` : "/console/token",
  );
}
