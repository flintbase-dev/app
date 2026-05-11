import { ChevronRight, KeyRound, MessageSquare } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { loadChatPickerData } from "@/lib/console/data";
import { cn } from "@/lib/utils";

export default async function ChatPickerPage() {
  const { clients, tokens } = await loadChatPickerData();
  const enabledTokens = tokens.items.filter((t) => t.status === 1);

  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-3xl">
        <div>
          <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
            Workspace · Chat
          </p>
          <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight">
            Chat clients
          </h1>
          <p className="mt-1 max-w-[60ch] text-sm text-muted-foreground">
            Launch a chat client pre-configured with your Flint base URL and an
            active key.
          </p>
        </div>

        <TokenBanner enabledTokens={enabledTokens} />

        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {clients.map((c) => (
            <li key={c.id}>
              <Link
                href={`/console/chat/${c.id}`}
                className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
              >
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                  <MessageSquare aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.description}
                  </p>
                </div>
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TokenBanner({
  enabledTokens,
}: {
  enabledTokens: Awaited<
    ReturnType<typeof loadChatPickerData>
  >["tokens"]["items"];
}) {
  if (enabledTokens.length === 0) {
    return (
      <div className="mt-6 rounded-md border-l-2 border-warning bg-warning-bg p-3 text-warning-dark">
        <p className="text-sm font-medium">No active key</p>
        <p className="mt-1 text-xs">
          You need at least one enabled key to launch a chat client.{" "}
          <Link
            href="/console/token/new"
            className="font-medium underline-offset-4 hover:underline"
          >
            Create one
          </Link>
          .
        </p>
      </div>
    );
  }
  return (
    <div className="mt-6 flex items-center gap-2 rounded-md border border-border bg-card p-3">
      <KeyRound aria-hidden="true" className="size-4 text-brand" />
      <p className="text-sm text-foreground">
        Using key{" "}
        <code className="font-mono text-foreground">
          {enabledTokens[0].name}
        </code>
        <span className="text-muted-foreground">
          {" "}
          · {enabledTokens[0].keyPreview}
        </span>
      </p>
      <Link
        href="/console/token"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "ml-auto",
        )}
      >
        Change key
      </Link>
    </div>
  );
}
