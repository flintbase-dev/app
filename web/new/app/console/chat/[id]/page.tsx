import {
  ArrowLeft,
  ExternalLink,
  Maximize2,
  RefreshCw,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CHAT_CLIENTS, TOKENS } from "@/lib/console/mock";
import { cn } from "@/lib/utils";

export default async function ChatRunnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = CHAT_CLIENTS.find((c) => String(c.id) === id);
  if (!client) notFound();

  const activeToken = TOKENS.find((t) => t.status === 1) ?? TOKENS[0];

  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-1 flex-col">
      {/* Sub-toolbar */}
      <div className="flex h-12 items-center gap-2 border-b border-border bg-background px-4">
        <Link
          href="/console/chat"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2 gap-1.5",
          )}
        >
          <ArrowLeft aria-hidden="true" />
          Clients
        </Link>
        <span className="font-medium text-foreground">{client.name}</span>
        <Badge variant="brand" className="px-1.5">
          {activeToken.name}
        </Badge>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          base https://api.flint.dev
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
            )}
            aria-label="Reload"
          >
            <RefreshCw aria-hidden="true" />
          </button>
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
            )}
            aria-label="Open externally"
          >
            <ExternalLink aria-hidden="true" />
          </button>
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
            )}
            aria-label="Fullscreen"
          >
            <Maximize2 aria-hidden="true" />
          </button>
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
            )}
            aria-label="Settings"
          >
            <Settings2 aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Mock iframe surface */}
      <div className="flex flex-1 items-center justify-center bg-muted/40">
        <div className="flex max-w-md flex-col items-center text-center">
          <div className="inline-flex size-12 items-center justify-center rounded-xl bg-brand-subtle text-brand-emphasis">
            <Settings2 aria-hidden="true" className="size-5" />
          </div>
          <h2 className="mt-4 font-heading text-xl font-medium tracking-tight">
            {client.name} loaded in this frame.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            In production, the iframe is rendered with the URL below. Theme and
            language are forwarded via{" "}
            <code className="font-mono text-foreground">postMessage</code>.
          </p>
          <code className="mt-4 max-w-full overflow-hidden rounded-md border border-border bg-card px-3 py-2 font-mono text-xs text-foreground">
            {client.template
              .replace("{address}", "https%3A%2F%2Fapi.flint.dev")
              .replace("{key}", "sk-Flnt••••7c4f")}
          </code>
        </div>
      </div>
    </div>
  );
}
