import { Flame } from "lucide-react";
import Link from "next/link";

import { LoginRedirect } from "@/components/console/auth-actions";
import { buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SYSTEM_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    return_to?: string;
    aff?: string;
    screen_hint?: string;
  }>;
}) {
  const {
    return_to = "/console",
    aff = "",
    screen_hint = "",
  } = await searchParams;
  return (
    <main className="flex min-h-dvh flex-1 flex-col">
      <LoginRedirect aff={aff} returnTo={return_to} screenHint={screen_hint} />
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-20">
        <div className="flex items-center gap-2">
          <Flame className="size-5 text-brand" aria-hidden="true" />
          <span className="font-heading text-base font-medium tracking-tight">
            {SYSTEM_NAME}
          </span>
        </div>
        <Spinner className="mt-10 size-6 text-brand" />
        <p className="mt-5 text-sm text-foreground">Redirecting to WorkOS</p>
        <p className="mt-1 max-w-[42ch] text-center text-xs text-muted-foreground">
          Authentication is handled by your organization&apos;s SSO provider via
          WorkOS Hosted UI.
        </p>
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mt-10 text-muted-foreground",
          )}
        >
          Cancel and go home
        </Link>
      </div>
    </main>
  );
}
