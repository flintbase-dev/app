import { ArrowRight, Flame } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { loadChatPickerData } from "@/lib/console/data";
import { SYSTEM_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

export default async function Chat2LinkPage() {
  const { clients, status, tokens } = await loadChatPickerData();
  const token = tokens.items.find((item) => item.status === 1);
  const client = clients.find((item) => item.template.startsWith("http"));

  return (
    <main className="flex min-h-dvh flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-20">
        <div className="flex items-center gap-2">
          <Flame className="size-5 text-brand" aria-hidden="true" />
          <span className="font-heading text-base font-medium tracking-tight">
            {SYSTEM_NAME}
          </span>
        </div>
        <p className="mt-10 text-sm text-foreground">
          {client && token
            ? `${client.name} needs a manually entered API key`
            : "No web chat client is ready"}
        </p>
        <p className="mt-1 max-w-[44ch] text-center text-xs text-muted-foreground">
          API keys are shown only once when created. Create a new key and paste
          it into the target client with base URL{" "}
          {status.serverAddress || "https://api.flint.dev"}.
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
