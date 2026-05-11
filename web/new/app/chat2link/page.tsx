import { ArrowRight, Flame } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CHAT_CLIENTS } from "@/lib/console/mock";
import { SYSTEM_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

export default function Chat2LinkPage() {
  const client = CHAT_CLIENTS[1];

  return (
    <main className="flex min-h-dvh flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-20">
        <div className="flex items-center gap-2">
          <Flame className="size-5 text-brand" aria-hidden="true" />
          <span className="font-heading text-base font-medium tracking-tight">
            {SYSTEM_NAME}
          </span>
        </div>
        <Spinner className="mt-10 size-6 text-brand" />
        <p className="mt-5 text-sm text-foreground">Opening {client.name}</p>
        <p className="mt-1 max-w-[44ch] text-center text-xs text-muted-foreground">
          We&apos;re packaging your service base URL and an enabled key into the
          target client&apos;s config link.
        </p>
        <Link
          href="/console/token"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mt-10 text-muted-foreground",
          )}
        >
          No keys yet? Create one
          <ArrowRight aria-hidden="true" data-icon="inline-end" />
        </Link>
      </div>
    </main>
  );
}
