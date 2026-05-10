import {
  CheckCircle2,
  CreditCard,
  Gift,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ACTIVE_SUBSCRIPTION,
  BILLS,
  CURRENT_USER,
  fmtMoney,
  fmtNum,
  fmtRelative,
  SUB_PLANS,
} from "@/lib/console/mock";
import { cn } from "@/lib/utils";

export default function TopupPage() {
  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-3xl">
        <div>
          <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
            Account · Wallet
          </p>
          <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight">
            Wallet
          </h1>
          <p className="mt-1 max-w-[60ch] text-sm text-muted-foreground">
            Top up with Stripe, redeem a code, or pick a subscription. Charges
            are deducted as your keys make calls.
          </p>
        </div>

        <div className="mt-6 border-t border-b border-border py-8">
          <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
            Balance
          </p>
          <p className="mt-2 font-mono text-5xl font-medium tabular-nums">
            {fmtMoney(CURRENT_USER.balance)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-mono tabular-nums text-foreground">
              {fmtMoney(CURRENT_USER.used)}
            </span>{" "}
            spent ·{" "}
            <span className="font-mono tabular-nums text-foreground">
              {fmtNum(CURRENT_USER.request_count)}
            </span>{" "}
            requests · plan{" "}
            <span className="font-mono text-foreground">
              {ACTIVE_SUBSCRIPTION.title}
            </span>
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/console/topup/charge"
              className={cn(buttonVariants({ variant: "brand" }))}
            >
              <CreditCard aria-hidden="true" />
              Top up
            </Link>
            <Link
              href="/console/topup/redeem"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <Gift aria-hidden="true" />
              Redeem code
            </Link>
            <Link
              href="/console/topup/invite"
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              <Users aria-hidden="true" />
              Refer
            </Link>
          </div>
        </div>

        <section className="mt-8">
          <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
            Billing preference
          </p>
          <BillingPreferenceRadio />
        </section>

        <Separator className="my-8" />

        <section>
          <div className="mb-3 flex items-end justify-between">
            <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
              Activity
            </p>
            <Link
              href="/console/topup/history"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              full history
            </Link>
          </div>
          <BillTable bills={BILLS.slice(0, 5)} />
        </section>

        <Separator className="my-8" />

        <section>
          <p className="mb-3 text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
            Available plans
          </p>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {SUB_PLANS.map((p) => (
              <li key={p.id} className="flex items-center gap-4 px-4 py-4">
                <div className="flex-1">
                  <p className="font-medium text-foreground">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.subtitle}</p>
                </div>
                <span className="font-mono text-sm tabular-nums text-foreground">
                  ${p.price}/mo
                </span>
                {p.id === ACTIVE_SUBSCRIPTION.plan_id ? (
                  <Badge variant="brand">current</Badge>
                ) : (
                  <Link
                    href={`/console/topup/charge?plan=${p.id}`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                    )}
                  >
                    Choose
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function BillingPreferenceRadio() {
  const options = [
    {
      id: "wallet_first",
      label: "Wallet first",
      desc: "Use balance, fall back to subscription credits when empty.",
    },
    {
      id: "subscription_first",
      label: "Subscription first",
      desc: "Use plan credits first, then wallet.",
    },
    {
      id: "subscription_only",
      label: "Subscription only",
      desc: "Never charge the wallet — fail fast when credits run out.",
    },
  ];
  return (
    <div className="mt-2 grid gap-2 md:grid-cols-3">
      {options.map((o, i) => (
        <label
          key={o.id}
          className={cn(
            "flex cursor-pointer flex-col rounded-md border p-3 hover:border-border-emphasis",
            i === 0 ? "border-2 border-brand" : "border-border",
          )}
        >
          <span className="flex items-center gap-2">
            <input
              type="radio"
              name="billing-pref"
              defaultChecked={i === 0}
              className="accent-brand"
            />
            <span className="text-sm font-medium text-foreground">
              {o.label}
            </span>
          </span>
          <span className="mt-1 ml-5 text-xs text-muted-foreground">
            {o.desc}
          </span>
        </label>
      ))}
    </div>
  );
}

function BillTable({ bills }: { bills: typeof BILLS }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="border-b border-border">
            <th className="px-3 py-2 text-left text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
              Type
            </th>
            <th className="px-3 py-2 text-left text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
              Reference
            </th>
            <th className="px-3 py-2 text-left text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
              Method
            </th>
            <th className="px-3 py-2 text-left text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
              Status
            </th>
            <th className="px-3 py-2 text-left text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
              When
            </th>
            <th className="px-3 py-2 text-right text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {bills.map((b) => (
            <tr key={b.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2.5">
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
              <td className="px-3 py-2.5">
                <code className="font-mono text-xs text-foreground">
                  {b.reference}
                </code>
              </td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground">
                {b.method}
              </td>
              <td className="px-3 py-2.5">
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
                  <span className="inline-flex items-center gap-1 text-xs text-warning-dark">
                    pending
                  </span>
                )}
              </td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground">
                {fmtRelative(b.ts)}
              </td>
              <td className="px-3 py-2.5 text-right">
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
