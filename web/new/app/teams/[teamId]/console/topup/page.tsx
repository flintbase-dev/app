import { Card, CardContent } from "@/components/ui/card";
import { loadTeamBillingData } from "@/lib/console/data";
import { fmtMoney } from "@/lib/console/format";

export default async function TeamBillingPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const { status, summary } = await loadTeamBillingData(teamId);
  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <div>
          <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
            Team account
          </p>
          <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight">
            Team billing
          </h1>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <BillingMetric
            label="Available balance"
            value={fmtMoney(summary.quota, status)}
          />
          <BillingMetric
            label="Used credit"
            value={fmtMoney(summary.used, status)}
          />
          <BillingMetric
            label="Total credit"
            value={fmtMoney(summary.total, status)}
          />
        </div>
      </div>
    </div>
  );
}

function BillingMetric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-5">
        <p className="truncate text-[10px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
          {label}
        </p>
        <p className="mt-1 font-mono text-2xl font-medium tabular-nums">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
