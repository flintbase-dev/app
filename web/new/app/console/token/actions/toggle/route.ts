import {
  assertApiSuccess,
  graphqlMutationFromRequest,
} from "@/lib/api/graphql";
import { toNumber } from "@/lib/console/format";
import { redirectBack } from "@/lib/console/route-redirect";
import { requireFormString } from "@/lib/console/token-form";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();
  const id = requireFormString(formData.get("id"), "Token id is required");
  const currentStatus = toNumber(formData.get("status"), 1);
  const nextStatus = currentStatus === 1 ? 2 : 1;
  const payload = await graphqlMutationFromRequest<{ updateToken: unknown }>(
    request,
    [
      {
        operation: "updateToken",
        input: { id, status: nextStatus },
        params: { status_only: true },
      },
    ],
  );
  assertApiSuccess(payload.updateToken);
  return redirectBack(request, "/console/token");
}
