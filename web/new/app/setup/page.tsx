import { Database, Flame, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { loadSetupStatus } from "@/lib/console/data";
import { SYSTEM_NAME } from "@/lib/site";

export default async function SetupPage() {
  const setup = await loadSetupStatus();
  const rows = [
    {
      label: "Database",
      value: String(setup.database_type || "postgres"),
      badge: { kind: "success" as const, text: "configured" },
    },
    {
      label: "Application setup",
      value: setup.status ? "Initialized" : "Not initialized",
      badge: {
        kind: setup.status ? ("success" as const) : ("warning" as const),
        text: setup.status ? "ready" : "pending",
      },
    },
    {
      label: "Root account",
      value: setup.root_init ? "Initialized" : "Waiting for root user",
      badge: {
        kind: setup.root_init ? ("success" as const) : ("warning" as const),
        text: setup.root_init ? "ready" : "pending",
      },
    },
  ];
  const overallDone = rows.every((r) => r.badge.kind !== "warning");

  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-muted/30">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Homepage"
            className="inline-flex size-10 items-center justify-center rounded-lg bg-brand-subtle text-brand-emphasis"
          >
            <Flame aria-hidden="true" className="size-5" />
          </Link>
          <div>
            <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
              {SYSTEM_NAME} · System status
            </p>
            <h1 className="font-heading text-2xl font-medium tracking-tight">
              Initialization diagnostic
            </h1>
          </div>
          <Badge
            variant={overallDone ? "success" : "warning"}
            className="ml-auto"
          >
            {overallDone ? "ready" : "preparing"}
          </Badge>
        </div>

        <Card className="mt-8 p-0">
          <CardContent className="p-0">
            <dl className="divide-y divide-border">
              {rows.map((r) => (
                <div
                  key={r.label}
                  className="grid grid-cols-[10rem_1fr_auto] items-center gap-4 px-5 py-3"
                >
                  <dt className="flex items-center gap-2 text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
                    <Database aria-hidden="true" className="size-3" />
                    {r.label}
                  </dt>
                  <dd className="font-mono text-sm text-foreground">
                    {r.value}
                  </dd>
                  <Badge
                    variant={
                      r.badge.kind === "success"
                        ? "success"
                        : r.badge.kind === "warning"
                          ? "warning"
                          : "outline"
                    }
                  >
                    {r.badge.text}
                  </Badge>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <div className="mt-6 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
          <ShieldCheck aria-hidden="true" className="size-3.5 text-success" />
          <span className="text-muted-foreground">
            The web app does not perform migrations. Run the external migrator
            before checking again.
          </span>
          <Button variant="ghost" size="sm" className="ml-auto">
            <RefreshCw aria-hidden="true" />
            Re-check
          </Button>
        </div>
      </div>
    </main>
  );
}
