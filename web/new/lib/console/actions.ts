"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  assertApiSuccess,
  graphqlMutation,
  graphqlQuery,
  unwrapApiData,
} from "@/lib/api/graphql";
import { loadConsoleLayoutData, requestTokenKey } from "@/lib/console/data";
import { moneyToCredits, toText } from "@/lib/console/format";
import { requireFormString } from "@/lib/console/token-form";

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

export async function updateDisplayNameAction(input: {
  firstName: string;
  lastName: string;
}) {
  const first = input.firstName.trim();
  const last = input.lastName.trim();
  if (!first) throw new Error("First name is required");
  if (!last) throw new Error("Last name is required");
  const displayName = `${first} ${last}`;
  const payload = await graphqlMutation<{ updateSelf: unknown }>([
    {
      operation: "updateSelf",
      input: { display_name: displayName },
    },
  ]);
  assertApiSuccess(payload.updateSelf);
  revalidatePath("/console", "layout");
}

export async function createOnboardingTokenAction(input: { name: string }) {
  const name = input.name.trim() || "My first key";
  const createPayload = await graphqlMutation<{ createToken: unknown }>([
    {
      operation: "createToken",
      input: {
        name,
        group: "default",
        status: 1,
        cross_group_retry: false,
        expired_time: -1,
        remain_quota: 0,
        unlimited_quota: true,
        model_limits_enabled: false,
        model_limits: "{}",
        allow_ips: "",
      },
    },
  ]);
  assertApiSuccess(createPayload.createToken);

  const listPayload = await graphqlQuery<{ tokens: unknown }>([
    {
      operation: "tokens",
      alias: "tokens",
      params: { p: 1, page_size: 50 },
    },
  ]);
  const tokens = asRecord(unwrapApiData(listPayload.tokens, {}));
  const items = Array.isArray(tokens.items)
    ? (tokens.items as unknown[])
    : Array.isArray(tokens.records)
      ? (tokens.records as unknown[])
      : [];
  const created = items
    .map((item) => asRecord(item))
    .filter((item) => toText(item.name) === name)
    .sort(
      (a, b) =>
        Number(b.created_time ?? b.createdTime ?? 0) -
        Number(a.created_time ?? a.createdTime ?? 0),
    )[0];
  if (!created || !created.id) {
    throw new Error("Created key was not found");
  }
  const id = toText(created.id);
  const key = await requestTokenKey(id);
  revalidatePath("/console/token");
  return { id, key };
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

export async function openBillingPortalAction() {
  const returnUrl = await consoleReturnUrl("/console/topup");
  const payload = await graphqlMutation<{ portal: unknown }>([
    {
      operation: "stripeBillingPortal",
      alias: "portal",
      input: { return_url: returnUrl },
    },
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

function extractRedirectLocation(payload: unknown, fallback: string): string {
  const data = asRecord(unwrapApiData(payload, {}));
  const inner = asRecord(data.data);
  return toText(inner.location || data.location, fallback);
}

async function consoleReturnUrl(path: string): Promise<string> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) return "";
  const proto = requestHeaders.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}${path}`;
}

function requireString(
  value: FormDataEntryValue | null,
  message: string,
): string {
  return requireFormString(value, message);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
