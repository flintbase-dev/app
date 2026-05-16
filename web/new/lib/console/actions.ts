"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  assertApiSuccess,
  graphqlMutation,
  unwrapApiData,
} from "@/lib/api/graphql";
import { loadConsoleLayoutData } from "@/lib/console/data";
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

function requirePositiveAmount(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a number greater than 0");
  }
  return amount;
}

export async function teamStripeAmountAction(teamId: string, amount: number) {
  const safeAmount = requirePositiveAmount(amount);
  const payload = await graphqlMutation<{ teamStripeAmount: unknown }>([
    {
      operation: "teamStripeAmount",
      input: { team_id: teamId, amount: safeAmount, payment_method: "stripe" },
      params: { team_id: teamId },
    },
  ]);
  const result = assertApiSuccess(payload.teamStripeAmount);
  return Number(result.data || 0);
}

export async function teamStripePayAction(
  teamId: string,
  amount: number,
  returnUrl: string,
) {
  const safeAmount = requirePositiveAmount(amount);
  const payload = await graphqlMutation<{ teamStripePay: unknown }>([
    {
      operation: "teamStripePay",
      input: {
        team_id: teamId,
        amount: safeAmount,
        payment_method: "stripe",
        return_url: returnUrl,
      },
      params: { team_id: teamId },
    },
  ]);
  return assertApiSuccess(payload.teamStripePay).data as Record<
    string,
    unknown
  >;
}

export async function teamStripeBillingPortalAction(
  teamId: string,
  returnUrl: string,
) {
  const payload = await graphqlMutation<{ teamStripeBillingPortal: unknown }>([
    {
      operation: "teamStripeBillingPortal",
      input: { team_id: teamId, return_url: returnUrl },
      params: { team_id: teamId },
    },
  ]);
  const data = asRecord(assertApiSuccess(payload.teamStripeBillingPortal).data);
  return toText(data.url);
}

export async function createTeamAction(formData: FormData) {
  const name = requireString(formData.get("name"), "Team name is required");
  const payload = await graphqlMutation<{ createTeam: unknown }>([
    { operation: "createTeam", input: { name } },
  ]);
  const data = asRecord(assertApiSuccess(payload.createTeam).data);
  redirect(toText(data.redirect, "/console"));
}

export async function updateTeamAction(formData: FormData) {
  const teamId = requireString(formData.get("team_id"), "Team id is required");
  const name = requireString(formData.get("name"), "Team name is required");
  const payload = await graphqlMutation<{ updateTeam: unknown }>([
    {
      operation: "updateTeam",
      input: { team_id: teamId, name },
      params: { team_id: teamId },
    },
  ]);
  assertApiSuccess(payload.updateTeam);
  revalidatePath(`/teams/${teamId}/console`);
}

export async function inviteTeamMemberAction(formData: FormData) {
  const teamId = requireString(formData.get("team_id"), "Team id is required");
  const email = requireString(formData.get("email"), "Email is required");
  const role = toText(formData.get("role"), "member");
  const payload = await graphqlMutation<{ inviteTeamMember: unknown }>([
    {
      operation: "inviteTeamMember",
      input: { team_id: teamId, email, role },
      params: { team_id: teamId },
    },
  ]);
  assertApiSuccess(payload.inviteTeamMember);
  revalidatePath(`/teams/${teamId}/console/settings/members`);
}

export async function inviteTeamMembersAction(formData: FormData) {
  const teamId = requireString(formData.get("team_id"), "Team id is required");
  const rawEmails = toText(formData.get("emails"));
  const role = toText(formData.get("role"), "member");
  const emails = Array.from(
    new Set(
      rawEmails
        .split(/[\s,;]+/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.includes("@")),
    ),
  );
  if (emails.length === 0) {
    throw new Error("Enter at least one email address.");
  }
  for (const email of emails) {
    const payload = await graphqlMutation<{ inviteTeamMember: unknown }>([
      {
        operation: "inviteTeamMember",
        input: { team_id: teamId, email, role },
        params: { team_id: teamId },
      },
    ]);
    assertApiSuccess(payload.inviteTeamMember);
  }
  revalidatePath(`/teams/${teamId}/console/settings/members`);
}

export async function updateTeamPolicyAction(formData: FormData) {
  const teamId = requireString(formData.get("team_id"), "Team id is required");
  const toList = (value: FormDataEntryValue | null) =>
    toText(value)
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  const values = (name: string) =>
    formData
      .getAll(name)
      .map((item) => toText(item))
      .filter(Boolean);
  const disabledFromSwitches = (
    allName: string,
    enabledName: string,
    fallbackName: string,
  ) => {
    const allItems = values(allName);
    if (allItems.length === 0) {
      return toList(formData.get(fallbackName));
    }
    const enabled = new Set(values(enabledName));
    return allItems.filter((item) => !enabled.has(item));
  };
  const payload = await graphqlMutation<{ updateTeamPolicy: unknown }>([
    {
      operation: "updateTeamPolicy",
      input: {
        team_id: teamId,
        model_policy: {
          default_enabled: true,
          disabled: disabledFromSwitches(
            "all_models",
            "enabled_models",
            "disabled_models",
          ),
        },
        group_policy: {
          default_enabled: true,
          disabled: disabledFromSwitches(
            "all_groups",
            "enabled_groups",
            "disabled_groups",
          ),
        },
      },
      params: { team_id: teamId },
    },
  ]);
  assertApiSuccess(payload.updateTeamPolicy);
  revalidatePath(`/teams/${teamId}/console/settings`);
}

export async function updateTeamMemberRoleAction(formData: FormData) {
  const teamId = requireString(formData.get("team_id"), "Team id is required");
  const userId = requireString(formData.get("user_id"), "User id is required");
  const role = toText(formData.get("role"), "member");
  const payload = await graphqlMutation<{ updateTeamMemberRole: unknown }>([
    {
      operation: "updateTeamMemberRole",
      input: { team_id: teamId, user_id: userId, role },
      params: { team_id: teamId },
    },
  ]);
  assertApiSuccess(payload.updateTeamMemberRole);
  revalidatePath(`/teams/${teamId}/console/settings`);
}

export async function removeTeamMemberAction(formData: FormData) {
  const teamId = requireString(formData.get("team_id"), "Team id is required");
  const userId = requireString(formData.get("user_id"), "User id is required");
  const payload = await graphqlMutation<{ removeTeamMember: unknown }>([
    {
      operation: "removeTeamMember",
      input: { team_id: teamId, user_id: userId },
      params: { team_id: teamId },
    },
  ]);
  assertApiSuccess(payload.removeTeamMember);
  revalidatePath(`/teams/${teamId}/console/settings`);
}

export async function revokeTeamInvitationAction(formData: FormData) {
  const teamId = requireString(formData.get("team_id"), "Team id is required");
  const invitationId = requireString(
    formData.get("invitation_id"),
    "Invitation id is required",
  );
  const payload = await graphqlMutation<{ revokeTeamInvitation: unknown }>([
    {
      operation: "revokeTeamInvitation",
      input: { team_id: teamId, invitation_id: invitationId },
      params: { team_id: teamId },
    },
  ]);
  assertApiSuccess(payload.revokeTeamInvitation);
  revalidatePath(`/teams/${teamId}/console/settings`);
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
  const createPayload = await graphqlMutation<{ createApiKey: unknown }>([
    {
      operation: "createApiKey",
      input: {
        name,
        group: "default",
        status: 1,
        cross_group_retry: false,
        expired_time: -1,
        remain_quota: 0,
        unlimited_quota: true,
      },
    },
  ]);
  const create = asRecord(unwrapApiData(createPayload.createApiKey, {}));
  const item = asRecord(create.item);
  const id = toText(item.id);
  const key = toText(create.api_key);
  if (!id || !key) throw new Error("Created API key was not returned");
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
