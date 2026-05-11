import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Download,
  Search,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { loadTopupHistory } from "@/lib/console/data";
import { fmtMoney, fmtRelative } from "@/lib/console/format";
import { cn } from "@/lib/utils";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    keyword?: string;
    status?: string;
    type?: string;
  }>;
}) {
  const {
    keyword = "",
    status: statusFilter = "",
    type = "",
  } = await searchParams;
  const { invoices, status } = await loadTopupHistory({
    keyword,
    status: statusFilter,
    type,
  });

  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1100px]">
        <div className="mb-6">
          <Link
            href="/console/topup"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "-ml-2 gap-1.5",
            )}
          >
            <ArrowLeft aria-hidden="true" />
            Wallet
          </Link>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
              Wallet · History
            </p>
            <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight">
              Billing history
            </h1>
          </div>
          <Link
            href="/console/topup/history/export"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Download aria-hidden="true" />
            Export CSV
          </Link>
        </div>

        {/* Filters */}
        <form className="mt-6 flex flex-wrap items-center gap-2">
          <InputGroup className="min-w-64 flex-1">
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              defaultValue={keyword}
              name="keyword"
              placeholder="Search by reference..."
            />
          </InputGroup>
          <FilterButton
            href="/console/topup/history?type=subscription"
            label="Type"
          />
          <FilterButton
            href="/console/topup/history?status=completed"
            label="Status"
          />
          <FilterButton href="/console/topup/history" label="All" />
        </form>

        <Card className="mt-4 overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>When</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="pr-4 text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.items.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="pl-4">
                    <Badge
                      variant={
                        b.type === "subscription"
                          ? "brand"
                          : b.type === "redemption"
                            ? "info"
                            : "secondary"
                      }
                      className="px-1.5 capitalize"
                    >
                      {b.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="font-mono text-xs text-foreground">
                      {b.reference}
                    </code>
                    <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      bill {b.id}
                    </p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {b.method}
                  </TableCell>
                  <TableCell>
                    {b.status === "completed" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-success-dark">
                        <CheckCircle2 aria-hidden="true" className="size-3" />
                        completed
                      </span>
                    ) : b.status === "failed" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-danger-dark">
                        <XCircle aria-hidden="true" className="size-3" />
                        failed
                      </span>
                    ) : (
                      <span className="text-xs text-warning-dark">pending</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {fmtRelative(b.ts)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "font-mono tabular-nums",
                        b.status === "failed"
                          ? "text-muted-foreground line-through"
                          : "text-foreground",
                      )}
                    >
                      {fmtMoney(b.amount, status)}
                    </span>
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    {b.status === "completed" &&
                    (b.invoicePdf || b.receiptUrl) ? (
                      <Link
                        href={b.invoicePdf || b.receiptUrl}
                        target="_blank"
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "icon-sm" }),
                        )}
                        aria-label="Download receipt"
                      >
                        <Download aria-hidden="true" />
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
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

function FilterButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
    >
      {label}
      <ChevronDown
        aria-hidden="true"
        data-icon="inline-end"
        className="size-3 text-muted-foreground"
      />
    </Link>
  );
}
