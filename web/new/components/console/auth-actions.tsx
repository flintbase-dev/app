"use client";

import { LogOut } from "lucide-react";
import { useEffect, useTransition } from "react";

import { Button } from "@/components/ui/button";

export function LoginRedirect({
  aff = "",
  returnTo = "/console",
  screenHint = "",
}: {
  aff?: string;
  returnTo?: string;
  screenHint?: string;
}) {
  useEffect(() => {
    const params: Record<string, string> = { return_to: returnTo };
    if (aff) params.aff = aff;
    if (screenHint) params.screen_hint = screenHint;
    void runAuthMutation("workosLogin", params).then((url) => {
      window.location.assign(url || "/console");
    });
  }, [aff, returnTo, screenHint]);

  return null;
}

export function LogoutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Sign out"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const url = await runAuthMutation("workosLogout");
          window.location.assign(url || "/login");
        });
      }}
    >
      <LogOut aria-hidden="true" />
    </Button>
  );
}

async function runAuthMutation(
  operation: "workosLogin" | "workosLogout",
  params: Record<string, string> = {},
): Promise<string> {
  const variables = Object.keys(params).length ? { params } : {};
  const query =
    operation === "workosLogin"
      ? "mutation Login($params: JSON) { login: workosLogin(params: $params) }"
      : "mutation Logout { logout: workosLogout }";
  const response = await fetch(clientGraphQLEndpoint(), {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const payload = (await response.json()) as {
    data?: Record<string, { data?: { location?: string }; location?: string }>;
    errors?: { message: string }[];
  };
  if (payload.errors?.length) throw new Error(payload.errors[0].message);
  const data = payload.data?.login ?? payload.data?.logout;
  return data?.data?.location || data?.location || "";
}

function clientGraphQLEndpoint(): string {
  const base = process.env.NEXT_PUBLIC_FLINT_API_BASE_URL?.replace(/\/+$/, "");
  if (!base) return "/api/graphql";
  return base.endsWith("/api/graphql") ? base : `${base}/api/graphql`;
}
