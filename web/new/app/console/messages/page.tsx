import {
  Check,
  CheckCheck,
  Inbox,
  Megaphone,
  Search,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtRelative, MESSAGES } from "@/lib/console/mock";
import { cn } from "@/lib/utils";

export default function MessagesPage() {
  const selected = MESSAGES[0];
  const unread = MESSAGES.filter((m) => !m.read_at).length;
  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-1 flex-col">
      {/* Top page header */}
      <div className="border-b border-border bg-background px-4 py-4 lg:px-6">
        <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
          Account · Inbox
        </p>
        <h1 className="mt-1 flex items-center gap-2 font-heading text-2xl font-medium tracking-tight">
          Messages
          {unread > 0 ? (
            <Badge variant="brand" className="px-1.5">
              {unread} unread
            </Badge>
          ) : null}
        </h1>
      </div>

      {/* List + reading pane fills remaining height */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[22rem_1fr]">
        {/* List column */}
        <div className="flex min-h-0 flex-col border-border bg-card lg:border-r">
          <div className="flex shrink-0 items-center gap-2 border-b border-border bg-background p-3">
            <div className="relative flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
              />
              <Input placeholder="Search…" className="pl-8" />
            </div>
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-sm" }),
              )}
              aria-label="Mark all read"
            >
              <CheckCheck aria-hidden="true" />
            </button>
          </div>
          <Tabs defaultValue="all">
            <div className="shrink-0 border-b border-border bg-background px-3 py-2">
              <TabsList variant="line">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="message">Personal</TabsTrigger>
                <TabsTrigger value="broadcast">Broadcasts</TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
          <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
            {MESSAGES.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/40",
                    m.id === selected.id && "bg-muted/40",
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 size-1.5 shrink-0 rounded-full",
                      m.read_at ? "bg-transparent" : "bg-brand",
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          m.item_type === "broadcast" ? "info" : "secondary"
                        }
                        className="px-1.5"
                      >
                        {m.item_type === "broadcast" ? (
                          <Megaphone aria-hidden="true" />
                        ) : (
                          <Inbox aria-hidden="true" />
                        )}
                        {m.item_type}
                      </Badge>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {fmtRelative(m.created_at)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "mt-1 truncate text-sm",
                        m.read_at
                          ? "text-foreground"
                          : "font-medium text-foreground",
                      )}
                    >
                      {m.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {m.preview}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Reading pane */}
        <article className="flex min-h-0 flex-col bg-background">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border p-4">
            <Badge
              variant={
                selected.item_type === "broadcast" ? "info" : "secondary"
              }
              className="px-1.5"
            >
              {selected.item_type === "broadcast" ? (
                <Megaphone aria-hidden="true" />
              ) : (
                <Inbox aria-hidden="true" />
              )}
              {selected.item_type}
            </Badge>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                <Check aria-hidden="true" />
                Mark read
              </button>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {new Date(selected.created_at).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
            <h2 className="font-heading text-2xl font-medium tracking-tight text-foreground">
              {selected.title}
            </h2>
            <Separator className="my-5" />
            <Markdown content={selected.content} />
          </div>
        </article>
      </div>
    </div>
  );
}

function Markdown({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed text-foreground">
      {lines.map((line, i) => (
        <p key={i} className="text-pretty">
          {renderInline(line)}
        </p>
      ))}
    </div>
  );
}

function renderInline(line: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  // biome-ignore lint/suspicious/noAssignInExpressions: legible regex loop
  while ((match = re.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }
    const tok = match[0];
    if (tok.startsWith("**")) {
      parts.push(
        <strong key={i} className="font-medium text-foreground">
          {tok.slice(2, -2)}
        </strong>,
      );
    } else if (tok.startsWith("`")) {
      parts.push(
        <code
          key={i}
          className="rounded-xs bg-muted px-1 font-mono text-[0.85em] text-foreground"
        >
          {tok.slice(1, -1)}
        </code>,
      );
    } else {
      const textMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok);
      if (textMatch) {
        parts.push(
          <Link
            key={i}
            href={textMatch[2]}
            className="text-brand underline-offset-4 hover:underline"
          >
            {textMatch[1]}
          </Link>,
        );
      }
    }
    lastIndex = match.index + tok.length;
    i++;
  }
  if (lastIndex < line.length) parts.push(line.slice(lastIndex));
  return parts;
}
