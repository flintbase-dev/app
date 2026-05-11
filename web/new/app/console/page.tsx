import {
  ArrowDownRight,
  CheckCircle2,
  ChevronRight,
  Copy,
  Gauge,
  KeyRound,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loadDashboardData } from "@/lib/console/data";
import { fmtMoney, fmtNum } from "@/lib/console/format";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const { user, status, usageSeries, modelUsage, uptime } =
    await loadDashboardData();
  return (
    <div className="flex-1">
      <div className="mx-auto grid w-full max-w-[1400px] gap-0 lg:grid-cols-[1fr_28rem]">
        {/* Left: scrollable main */}
        <div className="px-4 py-6 lg:px-8 lg:py-8">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="font-heading text-3xl font-medium tracking-tight">
                Hi, {user.displayName.split(" ")[0]}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Here's your inference activity.
              </p>
            </div>
            <RangeTabs />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <MiniStat
              icon={Gauge}
              label="Balance"
              value={fmtMoney(user.balance, status)}
            />
            <MiniStat
              icon={TrendingUp}
              label="Spend (7d)"
              value={fmtMoney(
                usageSeries.reduce((a, x) => a + x.cost, 0),
                status,
              )}
            />
            <MiniStat
              icon={Zap}
              label="Requests (7d)"
              value={fmtNum(usageSeries.reduce((a, x) => a + x.requests, 0))}
            />
          </div>

          <Card className="mt-6">
            <CardContent>
              <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
                Daily spend
              </p>
              <BarChart data={usageSeries} status={status} />
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
                  Top models
                </p>
                <Link
                  href="/console/log"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  view all
                </Link>
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {modelUsage.slice(0, 5).map((m) => (
                  <li key={m.model} className="flex items-center gap-3">
                    <code className="w-44 truncate font-mono text-sm text-foreground">
                      {m.model}
                    </code>
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-brand"
                        style={{ width: `${m.share * 100}%` }}
                      />
                    </div>
                    <span className="w-16 text-right font-mono text-xs tabular-nums text-foreground">
                      {fmtMoney(m.cost, status)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Right rail */}
        <aside className="border-border bg-background lg:border-l">
          <div className="px-4 py-6 lg:px-6 lg:py-8">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
                Quick start
              </p>
              <Badge variant="brand" className="gap-1">
                <Sparkles aria-hidden="true" />
                v1
              </Badge>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {status.apiInfo.map((a) => (
                <div
                  key={a.label}
                  className="flex items-center gap-2 rounded-lg border border-border p-2 pl-3"
                >
                  <span className="text-xs text-muted-foreground">
                    {a.label}
                  </span>
                  <code className="flex-1 truncate font-mono text-xs text-foreground">
                    {a.url}
                  </code>
                  <Button variant="ghost" size="icon-xs" aria-label="Copy">
                    <Copy aria-hidden="true" />
                  </Button>
                </div>
              ))}
              <Link
                href="/console/token/new"
                className={cn(
                  buttonVariants({ variant: "brand", size: "sm" }),
                  "mt-1",
                )}
              >
                <KeyRound aria-hidden="true" />
                Create API key
              </Link>
            </div>

            <Separator className="my-6" />

            <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
              Status
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {uptime.map((u) => (
                <li key={u.name} className="flex items-center gap-2 text-sm">
                  {u.status === "operational" ? (
                    <CheckCircle2
                      aria-hidden="true"
                      className="size-3.5 text-success"
                    />
                  ) : (
                    <ArrowDownRight
                      aria-hidden="true"
                      className="size-3.5 text-warning"
                    />
                  )}
                  <span className="flex-1 text-foreground">{u.name}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {u.uptime}%
                  </span>
                </li>
              ))}
            </ul>

            <Separator className="my-6" />

            <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
              FAQ
            </p>
            <ul className="mt-3 flex flex-col gap-3">
              {status.faq.map((f) => (
                <li key={f.q}>
                  <p className="text-sm font-medium text-foreground">{f.q}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {f.a}
                  </p>
                </li>
              ))}
            </ul>

            <Separator className="my-6" />

            <Link
              href="/console/playground"
              className="group flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-border-emphasis"
            >
              <Sparkles aria-hidden="true" className="size-4 text-brand" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Try the playground
                </p>
                <p className="text-xs text-muted-foreground">
                  Test models and parameters interactively.
                </p>
              </div>
              <ChevronRight
                aria-hidden="true"
                className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
      <span className="inline-flex size-8 items-center justify-center rounded-md bg-brand-subtle text-brand-emphasis">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
          {label}
        </p>
        <p className="font-mono text-sm font-medium tabular-nums text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

function BarChart({
  data,
  status,
}: {
  data: { day: string; cost: number }[];
  status: Awaited<ReturnType<typeof loadDashboardData>>["status"];
}) {
  const max = Math.max(1, ...data.map((d) => d.cost));
  return (
    <div className="mt-4">
      <div className="flex h-32 items-end gap-2">
        {data.map((d) => (
          <div
            key={d.day}
            className="group flex flex-1 flex-col items-stretch gap-1"
          >
            <div className="relative flex flex-1 items-end">
              <div
                className="w-full rounded-t bg-brand/80 transition-colors group-hover:bg-brand"
                style={{ height: `${(d.cost / max) * 100}%` }}
              />
              <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 rounded-xs bg-foreground px-1.5 py-0.5 font-mono text-[10px] text-background opacity-0 transition-opacity group-hover:opacity-100">
                {fmtMoney(d.cost, status)}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {data.map((d) => (
          <span
            key={d.day}
            className="flex-1 text-center font-mono text-[10px] text-muted-foreground"
          >
            {d.day}
          </span>
        ))}
      </div>
    </div>
  );
}

function RangeTabs() {
  return (
    <Tabs defaultValue="7d">
      <TabsList>
        <TabsTrigger value="24h">24h</TabsTrigger>
        <TabsTrigger value="7d">7d</TabsTrigger>
        <TabsTrigger value="30d">30d</TabsTrigger>
        <TabsTrigger value="90d">90d</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
