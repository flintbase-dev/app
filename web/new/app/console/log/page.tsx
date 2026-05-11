import { CheckCircle2, XCircle, Zap } from "lucide-react";
import Link from "next/link";
import { CopyButton } from "@/components/site/copy-button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loadLogs } from "@/lib/console/data";
import { fmtMoney, fmtNum } from "@/lib/console/format";
import type { LogEntry } from "@/lib/console/types";
import { cn } from "@/lib/utils";

const LOG_CATEGORIES = ["usage", "error", "security", "activity"] as const;

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; request_id?: string }>;
}) {
  const { category = "usage", request_id = "" } = await searchParams;
  const selectedCategory = LOG_CATEGORIES.includes(
    category as (typeof LOG_CATEGORIES)[number],
  )
    ? category
    : "usage";
  const logs = await loadLogs({ category: selectedCategory, request_id });
  const selected = logs.items[0] ?? null;
  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-1 flex-col">
      {/* Sticky page header inside the viewport-locked region */}
      <div className="border-b border-border bg-background px-4 py-4 lg:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
              Workspace · Logs
            </p>
            <h1 className="mt-1 font-heading text-2xl font-medium tracking-tight">
              Usage logs
            </h1>
          </div>
          <Tabs value={selectedCategory}>
            <TabsList variant="line">
              <TabsTrigger
                nativeButton={false}
                value="usage"
                render={<Link href="/console/log?category=usage" />}
              >
                Usage
              </TabsTrigger>
              <TabsTrigger
                nativeButton={false}
                value="error"
                render={<Link href="/console/log?category=error" />}
              >
                Errors
              </TabsTrigger>
              <TabsTrigger
                nativeButton={false}
                value="security"
                render={<Link href="/console/log?category=security" />}
              >
                Security
              </TabsTrigger>
              <TabsTrigger
                nativeButton={false}
                value="activity"
                render={<Link href="/console/log?category=activity" />}
              >
                Activity
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Master/detail fills remaining space */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_24rem]">
        {/* Left scroll list */}
        <ul className="min-h-0 divide-y divide-border overflow-y-auto bg-card">
          {logs.items.map((l, i) => (
            <li key={l.id}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40",
                  i === 0 && "bg-muted/40",
                )}
              >
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                  {new Date(l.ts * 1000).toISOString().slice(11, 19)}
                </span>
                <code className="w-32 truncate font-mono text-xs text-foreground">
                  {l.model}
                </code>
                <code className="flex-1 truncate font-mono text-xs text-muted-foreground">
                  {l.endpoint}
                </code>
                {l.cost ? (
                  <span className="font-mono text-xs tabular-nums text-foreground">
                    {fmtMoney(l.cost)}
                  </span>
                ) : null}
                <StatusPill log={l} compact />
              </button>
            </li>
          ))}
        </ul>

        {/* Right scroll detail */}
        {selected ? (
          <aside className="flex min-h-0 flex-col border-border bg-background lg:border-l">
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
                Request
              </p>
              <StatusPill log={selected} />
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
              <div>
                <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
                  Request ID
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 truncate font-mono text-xs text-foreground">
                    {selected.requestId}
                  </code>
                  <CopyButton
                    value={selected.requestId}
                    label="Copy"
                    size="icon-xs"
                  />
                </div>
              </div>

              <Separator />

              <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-xs">
                <DT>Time</DT>
                <DD className="font-mono tabular-nums">
                  {new Date(selected.ts * 1000).toLocaleString()}
                </DD>
                <DT>Token</DT>
                <DD>
                  <code className="font-mono text-foreground">
                    {selected.tokenName}
                  </code>
                </DD>
                <DT>Model</DT>
                <DD>
                  <code className="font-mono text-foreground">
                    {selected.model}
                  </code>
                </DD>
                <DT>Group</DT>
                <DD>
                  <code className="font-mono">{selected.group}</code>
                </DD>
                <DT>Channel</DT>
                <DD>
                  <code className="font-mono text-foreground">
                    {selected.channel}
                  </code>
                </DD>
                <DT>Endpoint</DT>
                <DD>
                  <code className="font-mono text-foreground">
                    {selected.endpoint}
                  </code>
                </DD>
                <DT>Latency</DT>
                <DD className="font-mono tabular-nums">
                  {selected.latencyMs}ms
                </DD>
                <DT>IP</DT>
                <DD>
                  <code className="font-mono text-xs text-muted-foreground">
                    {selected.ip ?? "—"}
                  </code>
                </DD>
              </dl>

              <Separator />

              <div>
                <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
                  Tokens
                </p>
                <dl className="mt-2 grid grid-cols-3 gap-2">
                  <Tile label="Prompt" value={fmtNum(selected.promptTokens)} />
                  <Tile
                    label="Output"
                    value={fmtNum(selected.completionTokens)}
                  />
                  <Tile label="Cached" value={fmtNum(selected.cachedTokens)} />
                </dl>
                <p className="mt-3 text-xs text-muted-foreground">
                  Cost{" "}
                  <span className="font-mono tabular-nums text-foreground">
                    {fmtMoney(selected.cost)}
                  </span>
                </p>
              </div>

              {selected.message ? (
                <>
                  <Separator />
                  <div>
                    <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
                      Message
                    </p>
                    <p className="mt-2 rounded-md border-l-2 border-warning bg-warning-bg p-3 font-mono text-xs leading-relaxed text-warning-dark">
                      {selected.message}
                    </p>
                  </div>
                </>
              ) : null}
            </div>
          </aside>
        ) : (
          <aside className="flex min-h-0 flex-col items-center justify-center border-border bg-background p-8 text-sm text-muted-foreground lg:border-l">
            No logs.
          </aside>
        )}
      </div>
    </div>
  );
}

function StatusPill({
  log,
  compact = false,
}: {
  log: LogEntry;
  compact?: boolean;
}) {
  if (log.status === "ok") {
    return (
      <Badge variant="success" className="px-1.5">
        <CheckCircle2 aria-hidden="true" />
        {compact ? "" : "ok"}
      </Badge>
    );
  }
  if (log.status === "fail") {
    return (
      <Badge variant="destructive" className="px-1.5">
        <XCircle aria-hidden="true" />
        {compact ? "" : "fail"}
      </Badge>
    );
  }
  return (
    <Badge variant="warning" className="px-1.5">
      <Zap aria-hidden="true" />
      {compact ? "" : "warn"}
    </Badge>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted p-2">
      <p className="text-[10px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-sm tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

function DT({ children }: { children: React.ReactNode }) {
  return (
    <dt className="text-[10px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
      {children}
    </dt>
  );
}
function DD({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <dd className={cn("text-foreground", className)}>{children}</dd>;
}
