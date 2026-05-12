"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CurrencyAmountInput } from "@/components/console/currency-amount-input";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { fmtMoney } from "@/lib/console/format";
import type { ConsoleStatus, TopupInfo } from "@/lib/console/types";
import { cn } from "@/lib/utils";

export function AddCreditsDialog({
  balance,
  status,
  topupInfo,
}: {
  balance: number;
  status: ConsoleStatus;
  topupInfo: TopupInfo;
}) {
  const minTopup = Math.max(1, Math.trunc(topupInfo.stripeMinTopup || 1));
  const presets = useMemo(
    () => normalizePresets(topupInfo.amountOptions, minTopup),
    [minTopup, topupInfo.amountOptions],
  );
  const defaultAmount = presets[0] ?? minTopup;
  const [amountInput, setAmountInput] = useState(String(defaultAmount));
  const parsedAmount = Math.trunc(Number(amountInput));
  const amount =
    Number.isFinite(parsedAmount) && parsedAmount > 0
      ? Math.max(parsedAmount, minTopup)
      : defaultAmount;
  const selectedPreset = presets.includes(amount) ? [String(amount)] : [];
  const discount = discountMultiplier(topupInfo.discount, amount);
  const creditAdded = amount * topupInfo.topupGroupRatio;
  const subtotal =
    amount * topupInfo.stripeUnitPrice * topupInfo.topupGroupRatio;
  const charge = subtotal * discount;
  const discountAmount = Math.max(0, subtotal - charge);
  const newBalance = balance + creditAdded;
  const checkoutHref = `/console/topup/checkout?amount=${encodeURIComponent(
    String(amount),
  )}`;

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Add credits
      </DialogTrigger>
      <DialogContent className="w-full max-w-2xl gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Add credit</DialogTitle>
          <DialogDescription>
            Charges processed by Stripe. Credit posts to your wallet
            immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="grid border-t border-border md:grid-cols-[minmax(0,1fr)_minmax(0,260px)]">
          <div className="flex flex-col gap-5 px-6 py-5">
            <div>
              <p className="text-xs font-medium text-foreground">
                Amount ({status.quotaDisplayType})
              </p>
              <ToggleGroup
                value={selectedPreset}
                variant="outline"
                spacing={2}
                className="mt-2 grid grid-cols-3 gap-2"
                onValueChange={(values) => {
                  const next = values.at(-1);
                  if (next) setAmountInput(next);
                }}
              >
                {presets.map((value) => {
                  const presetDiscount = discountMultiplier(
                    topupInfo.discount,
                    value,
                  );
                  return (
                    <ToggleGroupItem
                      key={value}
                      value={String(value)}
                      className="h-11"
                    >
                      {fmtMoney(value, status)}
                      {presetDiscount < 1 ? (
                        <span className="ml-1 font-mono text-[10px] tabular-nums text-success-dark">
                          -{Math.round((1 - presetDiscount) * 100)}%
                        </span>
                      ) : null}
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
              <div className="mt-2.5 flex items-center gap-2">
                <CurrencyAmountInput
                  status={status}
                  value={amountInput}
                  min={minTopup}
                  step={1}
                  className="max-w-32"
                  onChange={(event) => setAmountInput(event.target.value)}
                />
                <span className="text-xs text-muted-foreground">
                  Custom, {fmtMoney(minTopup, status)} minimum.
                </span>
              </div>
            </div>
          </div>
          <div className="border-t border-border bg-muted/30 px-6 py-5 md:border-t-0 md:border-l">
            <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
              Receipt preview
            </p>
            <dl className="mt-4 flex flex-col gap-2 font-mono text-sm tabular-nums">
              <PreviewRow
                label="Credit added"
                value={fmtMoney(creditAdded, status)}
              />
              {discountAmount > 0 ? (
                <PreviewRow
                  label="Volume discount"
                  value={`-${fmtMoney(discountAmount, status)}`}
                  valueClassName="text-success-dark"
                />
              ) : null}
              <div className="border-t border-dashed border-border pt-2" />
              <PreviewRow
                label="You pay"
                value={fmtMoney(charge, status)}
                labelClassName="font-medium text-foreground"
                valueClassName="text-base font-medium text-foreground"
              />
              <div className="border-t border-dashed border-border pt-2" />
              <PreviewRow
                label="New balance"
                value={fmtMoney(newBalance, status)}
              />
            </dl>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-border px-6 py-5">
          {topupInfo.enableStripeTopup ? (
            <Link
              href={checkoutHref}
              className={cn(
                buttonVariants({ variant: "brand", size: "lg" }),
                "w-full",
              )}
            >
              Continue to checkout
              <ArrowRight aria-hidden="true" />
            </Link>
          ) : (
            <Button disabled size="lg" className="w-full">
              Stripe top up is disabled
            </Button>
          )}
          <p className="text-center text-xs text-muted-foreground">
            Payment methods are shown by Stripe at checkout.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewRow({
  label,
  value,
  labelClassName,
  valueClassName,
}: {
  label: string;
  value: string;
  labelClassName?: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt
        className={cn(
          "font-sans text-xs text-muted-foreground",
          labelClassName,
        )}
      >
        {label}
      </dt>
      <dd className={cn("text-foreground", valueClassName)}>{value}</dd>
    </div>
  );
}

function normalizePresets(values: number[], minTopup: number): number[] {
  const result = [...new Set(values.map((value) => Math.trunc(value)))]
    .filter((value) => value >= minTopup)
    .sort((a, b) => a - b);
  return result.length ? result : [minTopup];
}

function discountMultiplier(
  discount: Record<string, number>,
  amount: number,
): number {
  const value = discount[String(Math.trunc(amount))];
  return value > 0 ? value : 1;
}
