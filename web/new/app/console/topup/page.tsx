import { ReceiptText } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { openBillingPortalAction } from "@/lib/console/actions";
import { loadTopupData } from "@/lib/console/data";
import { fmtAbsDate, fmtMoney } from "@/lib/console/format";

export default async function TopupPage() {
  const { user, status, invoices, monthlyUsage, usageMonthLabel } =
    await loadTopupData();
  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
              Personal billing
            </p>
            <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight">
              Quota and usage
            </h1>
          </div>
          <form action={openBillingPortalAction}>
            <Button variant="outline">Billing portal</Button>
          </form>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <Metric label="Balance" value={fmtMoney(user.balance, status)} />
          <Metric label="Total used" value={fmtMoney(user.used, status)} />
          <Metric
            label={usageMonthLabel}
            value={fmtMoney(monthlyUsage, status)}
          />
        </div>

        <Card className="mt-6 overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-4 text-right">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-0">
                    <Empty className="border-0 py-10">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <ReceiptText aria-hidden="true" />
                        </EmptyMedia>
                        <EmptyTitle>No invoices yet</EmptyTitle>
                        <EmptyDescription>
                          Personal billing records will appear here.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </TableCell>
                </TableRow>
              ) : null}
              {invoices.items.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="pl-4">
                    <code className="font-mono text-xs">
                      {invoice.invoiceNumber || invoice.reference || invoice.id}
                    </code>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {fmtAbsDate(invoice.ts)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {fmtMoney(invoice.creditUnits || invoice.amount, status)}
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
                  <TableCell className="pr-4 text-right">
                    {invoice.hostedInvoiceUrl ? (
                      <Link
                        href={invoice.hostedInvoiceUrl}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        View
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
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

function Metric({ label, value }: { label: string; value: string }) {
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
