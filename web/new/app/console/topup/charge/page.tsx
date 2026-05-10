import {
  ArrowLeft,
  Check,
  CreditCard,
  Lock,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { CURRENT_USER, fmtMoney } from "@/lib/console/mock";
import { cn } from "@/lib/utils";

const PRESETS = [10, 25, 50, 100, 250, 500];
const DISCOUNTS: Record<number, number> = {
  100: 0.05,
  250: 0.08,
  500: 0.12,
};

export default function ChargePage() {
  const amount = 100;
  const discount = DISCOUNTS[amount] ?? 0;
  const charge = amount * (1 - discount);

  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-3xl">
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

        <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
          Top up wallet
        </p>
        <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight">
          Add credit
        </h1>
        <p className="mt-2 max-w-[60ch] text-sm text-muted-foreground">
          Charges are processed by Stripe. The credit is added to your wallet
          immediately after the charge succeeds.
        </p>

        <Card className="mt-8">
          <CardContent className="flex flex-col gap-6 py-6">
            <div>
              <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
                Current balance
              </p>
              <p className="mt-1 font-mono text-2xl font-medium tabular-nums">
                {fmtMoney(CURRENT_USER.balance)}
              </p>
            </div>

            <Separator />

            <div>
              <label className="text-sm font-medium text-foreground">
                Amount (USD)
              </label>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {PRESETS.map((v) => {
                  const active = v === amount;
                  return (
                    <button
                      key={v}
                      type="button"
                      className={cn(
                        "flex h-12 items-center justify-center rounded-md border text-sm font-medium transition-colors",
                        active
                          ? "border-2 border-brand bg-brand-subtle text-brand-emphasis"
                          : "border-border bg-background text-foreground hover:border-border-emphasis",
                      )}
                    >
                      ${v}
                      {DISCOUNTS[v] ? (
                        <span className="ml-1 font-mono text-[10px] tabular-nums text-success-dark">
                          -{Math.round(DISCOUNTS[v] * 100)}%
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Input
                  type="number"
                  defaultValue={amount}
                  min={5}
                  step={1}
                  className="max-w-32"
                />
                <span className="text-xs text-muted-foreground">
                  Custom amount, $5 minimum.
                </span>
              </div>
            </div>

            <Separator />

            <div>
              <label className="text-sm font-medium text-foreground">
                Pay with
              </label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-md border-2 border-brand bg-brand-subtle p-3">
                  <input
                    type="radio"
                    name="method"
                    defaultChecked
                    className="accent-brand"
                  />
                  <CreditCard
                    aria-hidden="true"
                    className="size-4 text-brand-emphasis"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Stripe
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Card, Apple Pay, Google Pay
                    </p>
                  </div>
                </label>
                <label className="flex cursor-not-allowed items-center gap-3 rounded-md border border-border p-3 opacity-50">
                  <input type="radio" name="method" disabled />
                  <Sparkles aria-hidden="true" className="size-4" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Wire transfer
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Available on Scale plan
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <Separator />

            {/* Summary */}
            <div className="rounded-lg bg-muted p-4">
              <dl className="flex flex-col gap-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Credit added</dt>
                  <dd className="font-mono tabular-nums text-foreground">
                    {fmtMoney(amount)}
                  </dd>
                </div>
                {discount ? (
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">
                      Volume discount ({Math.round(discount * 100)}%)
                    </dt>
                    <dd className="font-mono tabular-nums text-success-dark">
                      −{fmtMoney(amount - charge)}
                    </dd>
                  </div>
                ) : null}
                <Separator className="my-2" />
                <div className="flex items-center justify-between">
                  <dt className="font-medium text-foreground">You pay</dt>
                  <dd className="font-mono text-lg font-medium tabular-nums text-foreground">
                    {fmtMoney(charge)}
                  </dd>
                </div>
              </dl>
            </div>

            <button
              type="submit"
              className={cn(
                buttonVariants({ variant: "brand", size: "lg" }),
                "w-full",
              )}
            >
              <Lock aria-hidden="true" />
              Pay {fmtMoney(charge)} with Stripe
            </button>
            <p className="text-center text-xs text-muted-foreground">
              By continuing you accept the{" "}
              <Link
                href="/user-agreement"
                className="text-foreground underline-offset-4 hover:underline"
              >
                user agreement
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
