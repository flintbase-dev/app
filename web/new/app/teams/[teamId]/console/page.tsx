import { CreditCard, KeyRound, ScrollText, Settings } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { loadTeamDashboardData } from "@/lib/console/data";
import { fmtMoney, fmtRelative } from "@/lib/console/format";
import { cn } from "@/lib/utils";

export default async function TeamDashboardPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const { team, tokens, usage, status } = await loadTeamDashboardData(teamId);
  const base = `/teams/${teamId}/console`;
  const isTeamAdmin = team.role === "admin";
  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
              Team console
            </p>
            <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight">
              {team.name}
            </h1>
          </div>
          <Badge variant="outline">{team.status}</Badge>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <MiniStat label="Balance" value={fmtMoney(team.balance, status)} />
          <MiniStat label="Used" value={fmtMoney(team.used, status)} />
          <MiniStat label="API keys" value={String(tokens.total)} />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <QuickLink href={`${base}/token`} icon={KeyRound} label="API keys" />
          <QuickLink href={`${base}/log`} icon={ScrollText} label="Usage" />
          {isTeamAdmin ? (
            <>
              <QuickLink
                href={`${base}/topup`}
                icon={CreditCard}
                label="Billing"
              />
              <QuickLink
                href={`${base}/settings`}
                icon={Settings}
                label="Settings"
              />
            </>
          ) : null}
        </div>

        <Card className="mt-6">
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
                Recent usage
              </p>
              <Link
                href={`${base}/log`}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                view all
              </Link>
            </div>
            <div className="mt-3 grid gap-2">
              {usage.items.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-md border border-border p-2"
                >
                  <code className="min-w-0 flex-1 truncate font-mono text-sm">
                    {entry.model}
                  </code>
                  <span className="font-mono text-xs text-muted-foreground">
                    {fmtMoney(entry.cost, status)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {entry.ts ? fmtRelative(entry.ts) : "new"}
                  </span>
                </div>
              ))}
              {usage.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No Team usage yet.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-[10px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
          {label}
        </p>
        <p className="mt-1 font-mono text-lg font-medium tabular-nums">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(buttonVariants({ variant: "outline" }), "justify-start")}
    >
      <Icon aria-hidden="true" />
      {label}
    </Link>
  );
}
