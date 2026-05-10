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
import { Input } from "@/components/ui/input";
import { BILLS, fmtMoney, fmtRelative } from "@/lib/console/mock";
import { cn } from "@/lib/utils";

export default function HistoryPage() {
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
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1.5",
            )}
          >
            <Download aria-hidden="true" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <div className="relative min-w-64 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input placeholder="Search by reference…" className="pl-8" />
          </div>
          <FilterButton label="Type" />
          <FilterButton label="Status" />
          <FilterButton label="Date range" />
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
                  Type
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
                  Reference
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
                  Method
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
                  Status
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
                  When
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
                  Amount
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
                  Receipt
                </th>
              </tr>
            </thead>
            <tbody>
              {BILLS.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
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
                  </td>
                  <td className="px-4 py-3">
                    <code className="font-mono text-xs text-foreground">
                      {b.reference}
                    </code>
                    <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      bill {b.id}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {b.method}
                  </td>
                  <td className="px-4 py-3">
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
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {fmtRelative(b.ts)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        "font-mono tabular-nums",
                        b.status === "failed"
                          ? "text-muted-foreground line-through"
                          : "text-foreground",
                      )}
                    >
                      {fmtMoney(b.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {b.status === "completed" ? (
                      <button
                        type="button"
                        aria-label="Download receipt"
                        className={cn(
                          buttonVariants({
                            variant: "ghost",
                            size: "icon-sm",
                          }),
                        )}
                      >
                        <Download aria-hidden="true" />
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FilterButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "gap-1.5",
      )}
    >
      {label}
      <ChevronDown aria-hidden="true" className="size-3 text-muted-foreground" />
    </button>
  );
}
