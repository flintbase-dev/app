import type { GraphQLOperationField } from "@/lib/api/graphql";
import { moneyToCredits, toNumber, toText } from "@/lib/console/format";

export function createApiKeyFieldsFromForm(
  formData: FormData,
): GraphQLOperationField[] {
  const name = requireFormString(
    formData.get("name"),
    "API key name is required",
  );
  const count = Math.min(
    Math.max(toNumber(formData.get("tokenCount"), 1), 1),
    10,
  );
  const baseInput = tokenInputFromForm(formData);
  const teamId = toText(formData.get("team_id"));
  const fields: GraphQLOperationField[] = [];
  for (let index = 0; index < count; index++) {
    fields.push({
      operation: teamId ? "createTeamApiKey" : "createApiKey",
      alias: `createApiKey${index}`,
      input: {
        ...baseInput,
        ...(teamId ? { team_id: teamId } : {}),
        name: count === 1 ? name : `${name}-${randomSuffix(index)}`,
      },
      ...(teamId ? { params: { team_id: teamId } } : {}),
    });
  }
  return fields;
}

export function tokenInputFromForm(formData: FormData) {
  const { status } = { status: { siteCreditsPerPriceUnit: 1_000_000 } };
  return {
    name: toText(formData.get("name")),
    group: toText(formData.get("group"), "default"),
    status: toNumber(formData.get("status"), 1),
    cross_group_retry: formData.has("cross_group_retry"),
    expired_time: parseExpiration(formData.get("expired_at")),
    remain_quota: formData.has("unlimited_quota")
      ? 0
      : moneyToCredits(formData.get("remain_amount"), status),
    unlimited_quota: formData.has("unlimited_quota"),
  };
}

export function requireFormString(
  value: FormDataEntryValue | null,
  message: string,
): string {
  const result = toText(value).trim();
  if (!result) throw new Error(message);
  return result;
}

function parseExpiration(value: FormDataEntryValue | null): number {
  const raw = toText(value);
  if (!raw) return -1;
  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : -1;
}

function randomSuffix(index: number): string {
  return `${Date.now().toString(36)}${index.toString(36)}`;
}
