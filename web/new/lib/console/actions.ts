"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  assertApiSuccess,
  type GraphQLOperationField,
  graphqlMutation,
  unwrapApiData,
} from "@/lib/api/graphql";
import { loadConsoleLayoutData, requestTokenKey } from "@/lib/console/data";
import { moneyToCredits, toNumber, toText } from "@/lib/console/format";

export async function workosLoginAction(formData?: FormData) {
  const returnTo = toText(formData?.get("return_to"), "/console");
  const payload = await graphqlMutation<{ login: unknown }>([
    {
      operation: "workosLogin",
      alias: "login",
      params: { return_to: returnTo },
    },
  ]);
  redirect(extractRedirectLocation(payload.login, "/console"));
}

export async function workosLogoutAction() {
  const payload = await graphqlMutation<{ logout: unknown }>([
    { operation: "workosLogout", alias: "logout" },
  ]);
  redirect(extractRedirectLocation(payload.logout, "/login"));
}

export async function markInboxItemReadAction(formData: FormData) {
  const id = requireString(formData.get("id"), "Missing inbox item id");
  const itemType = toText(formData.get("item_type"), "message");
  const payload = await graphqlMutation<{ markInboxItemRead: unknown }>([
    {
      operation: "markInboxItemRead",
      input: { id, item_type: itemType },
    },
  ]);
  assertApiSuccess(payload.markInboxItemRead);
  revalidatePath("/console/messages");
}

export async function markAllInboxReadAction() {
  const payload = await graphqlMutation<{ markAllInboxRead: unknown }>([
    { operation: "markAllInboxRead" },
  ]);
  assertApiSuccess(payload.markAllInboxRead);
  revalidatePath("/console/messages");
}

export async function createTokenAction(formData: FormData) {
  const name = requireString(formData.get("name"), "Token name is required");
  const count = Math.min(
    Math.max(toNumber(formData.get("tokenCount"), 1), 1),
    50,
  );
  const baseInput = tokenInputFromForm(formData);
  const fields: GraphQLOperationField[] = [];
  for (let index = 0; index < count; index++) {
    fields.push({
      operation: "createToken",
      alias: `createToken${index}`,
      input: {
        ...baseInput,
        name: count === 1 ? name : `${name}-${randomSuffix(index)}`,
      },
    });
  }
  const payload = await graphqlMutation<Record<string, unknown>>(fields);
  for (const result of Object.values(payload)) assertApiSuccess(result);
  revalidatePath("/console/token");
  redirect("/console/token");
}

export async function updateTokenAction(formData: FormData) {
  const id = requireString(formData.get("id"), "Token id is required");
  const payload = await graphqlMutation<{ updateToken: unknown }>([
    {
      operation: "updateToken",
      input: { ...tokenInputFromForm(formData), id },
    },
  ]);
  assertApiSuccess(payload.updateToken);
  revalidatePath("/console/token");
  revalidatePath(`/console/token/${id}`);
}

export async function toggleTokenStatusAction(formData: FormData) {
  const id = requireString(formData.get("id"), "Token id is required");
  const currentStatus = toNumber(formData.get("status"), 1);
  const nextStatus = currentStatus === 1 ? 2 : 1;
  const payload = await graphqlMutation<{ updateToken: unknown }>([
    {
      operation: "updateToken",
      input: { id, status: nextStatus },
      params: { status_only: true },
    },
  ]);
  assertApiSuccess(payload.updateToken);
  revalidatePath("/console/token");
  revalidatePath(`/console/token/${id}`);
}

export async function deleteTokenAction(formData: FormData) {
  const id = requireString(formData.get("id"), "Token id is required");
  const payload = await graphqlMutation<{ deleteToken: unknown }>([
    { operation: "deleteToken", input: { id } },
  ]);
  assertApiSuccess(payload.deleteToken);
  revalidatePath("/console/token");
  redirect("/console/token");
}

export async function deleteTokensAction(formData: FormData) {
  const ids = formData
    .getAll("ids")
    .map((id) => toText(id))
    .filter(Boolean);
  if (ids.length === 0) throw new Error("No token ids selected");
  const payload = await graphqlMutation<{ deleteTokens: unknown }>([
    { operation: "deleteTokens", input: { ids } },
  ]);
  assertApiSuccess(payload.deleteTokens);
  revalidatePath("/console/token");
}

export async function revealTokenKeyAction(id: string) {
  return requestTokenKey(id);
}

export async function revealTokenKeysBatchAction(ids: string[]) {
  const payload = await graphqlMutation<{ tokenKeysBatch: unknown }>([
    { operation: "tokenKeysBatch", input: { ids } },
  ]);
  const data = asRecord(unwrapApiData(payload.tokenKeysBatch, {}));
  return Object.entries(asRecord(data.keys)).map(([id, key]) => ({
    id,
    key: toText(key),
  }));
}

export async function updatePersonalPreferencesAction(formData: FormData) {
  const { status, user } = await loadConsoleLayoutData();
  const quotaWarningThreshold = moneyToCredits(
    formData.get("quota_warning_threshold"),
    status,
  );
  const payload = await graphqlMutation<{
    updateSelf: unknown;
    updateUserSetting: unknown;
  }>([
    {
      operation: "updateSelf",
      input: { language: toText(formData.get("language"), user.language) },
    },
    {
      operation: "updateUserSetting",
      input: {
        quota_warning_threshold: quotaWarningThreshold,
        upstream_model_update_notify_enabled: formData.has(
          "upstream_model_update_notify_enabled",
        ),
        accept_unset_model_price_model: formData.has(
          "accept_unset_model_price_model",
        ),
        record_ip_log: formData.has("record_ip_log"),
      },
    },
  ]);
  assertApiSuccess(payload.updateSelf);
  assertApiSuccess(payload.updateUserSetting);
  revalidatePath("/console/personal");
}

export async function generateAccessTokenAction() {
  const payload = await graphqlMutation<{ generateAccessToken: unknown }>([
    { operation: "generateAccessToken" },
  ]);
  const data = unwrapApiData(payload.generateAccessToken, "");
  revalidatePath("/console/personal");
  return toText(data);
}

export async function deleteSelfAction(formData: FormData) {
  const confirm = requireString(
    formData.get("confirm"),
    "Confirmation is required",
  );
  const username = requireString(
    formData.get("username"),
    "Username is required",
  );
  if (confirm !== username)
    throw new Error("Confirmation did not match username");
  const payload = await graphqlMutation<{ deleteSelf: unknown }>([
    { operation: "deleteSelf" },
  ]);
  assertApiSuccess(payload.deleteSelf);
  redirect("/login");
}

export async function redeemCodeAction(formData: FormData) {
  const key = requireString(formData.get("key"), "Redemption code is required");
  const payload = await graphqlMutation<{ topup: unknown }>([
    { operation: "topup", input: { key } },
  ]);
  assertApiSuccess(payload.topup);
  revalidatePath("/console/topup");
  redirect("/console/topup");
}

export async function openBillingPortalAction() {
  const payload = await graphqlMutation<{ portal: unknown }>([
    { operation: "stripeBillingPortal", alias: "portal" },
  ]);
  const url = toText(asRecord(unwrapApiData(payload.portal, {})).url);
  redirect(url || "/console/topup");
}

export async function updateBillingPreferenceAction(formData: FormData) {
  const payload = await graphqlMutation<{
    updateSubscriptionPreference: unknown;
  }>([
    {
      operation: "updateSubscriptionPreference",
      input: {
        billing_preference: toText(
          formData.get("billing_preference"),
          "wallet_first",
        ),
      },
    },
  ]);
  assertApiSuccess(payload.updateSubscriptionPreference);
  revalidatePath("/console/topup");
}

export async function transferAffQuotaAction(formData: FormData) {
  const { status } = await loadConsoleLayoutData();
  const quota = moneyToCredits(formData.get("quota"), status);
  const payload = await graphqlMutation<{ affTransfer: unknown }>([
    { operation: "affTransfer", input: { quota } },
  ]);
  assertApiSuccess(payload.affTransfer);
  revalidatePath("/console/topup");
  revalidatePath("/console/topup/invite");
}

export async function createStripeTopupSessionAction(input: {
  amount: number;
  returnUrl: string;
}) {
  const payload = await graphqlMutation<{ stripePay: unknown }>([
    {
      operation: "stripePay",
      input: {
        amount: input.amount,
        payment_method: "stripe",
        return_url: input.returnUrl,
      },
    },
  ]);
  const envelope = assertApiSuccess(payload.stripePay);
  return asRecord(envelope.data);
}

export async function createSubscriptionStripeSessionAction(input: {
  planId: string;
  mode?: "purchase" | "switch";
  fromSubscriptionId?: string;
  returnUrl: string;
}) {
  const payload = await graphqlMutation<{ subscriptionStripePay: unknown }>([
    {
      operation: "subscriptionStripePay",
      input: {
        plan_id: input.planId,
        mode: input.mode || "purchase",
        from_subscription_id: input.fromSubscriptionId || "",
        return_url: input.returnUrl,
      },
    },
  ]);
  const envelope = assertApiSuccess(payload.subscriptionStripePay);
  return asRecord(envelope.data);
}

function tokenInputFromForm(formData: FormData) {
  const { status } = { status: { siteCreditsPerPriceUnit: 1_000_000 } };
  const modelLimits = toText(formData.get("model_limits"))
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
    model_limits_enabled: modelLimits.length > 0,
    model_limits: JSON.stringify(
      Object.fromEntries(modelLimits.map((m) => [m, true])),
    ),
    allow_ips: toText(formData.get("allow_ips"))
      .split(",")
      .map((ip) => ip.trim())
      .filter(Boolean)
      .join("\n"),
  };
}

function parseExpiration(value: FormDataEntryValue | null): number {
  const raw = toText(value);
  if (!raw) return -1;
  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : -1;
}

function extractRedirectLocation(payload: unknown, fallback: string): string {
  const data = asRecord(unwrapApiData(payload, {}));
  const inner = asRecord(data.data);
  return toText(inner.location || data.location, fallback);
}

function requireString(
  value: FormDataEntryValue | null,
  message: string,
): string {
  const result = toText(value).trim();
  if (!result) throw new Error(message);
  return result;
}

function randomSuffix(index: number): string {
  return `${Date.now().toString(36)}${index.toString(36)}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
