import { TeamBillingClient } from "@/components/console/team-billing-client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { loadTeamBillingData } from "@/lib/console/data";
import { fmtMoney, fmtRelative } from "@/lib/console/format";

export default async function TeamBillingPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const { status, summary, topups } = await loadTeamBillingData(teamId);
  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <div>
          <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
            Team admin
          </p>
          <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight">
            Team billing
          </h1>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-[22rem_1fr]">
          <Card>
            <CardContent className="py-5">
              <p className="text-[10px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
                Balance
              </p>
              <p className="mt-1 font-mono text-2xl font-medium">
                {fmtMoney(summary.quota, status)}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Used {fmtMoney(summary.used, status)}
              </p>
              {summary.stripeCustomer ? (
                <Badge variant="outline" className="mt-3">
                  Stripe customer
                </Badge>
              ) : null}
            </CardContent>
          </Card>
          <TeamBillingClient teamId={teamId} status={status} />
        </div>
        <Card className="mt-6 overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Credits</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topups.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <code className="font-mono text-xs">
                      {invoice.reference || invoice.id}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        invoice.status === "completed" ? "success" : "outline"
                      }
                    >
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {fmtMoney(invoice.creditUnits, status)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {fmtMoney(invoice.money, status)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {invoice.ts ? fmtRelative(invoice.ts) : "new"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
