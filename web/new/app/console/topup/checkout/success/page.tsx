import { ArrowRight, CheckCircle2, Download } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { CURRENT_USER, fmtMoney } from "@/lib/console/mock";
import { cn } from "@/lib/utils";

const SUCCESS_AMOUNT = 100;
const SUCCESS_DISCOUNT = 0.05;
const SUCCESS_CHARGE = SUCCESS_AMOUNT * (1 - SUCCESS_DISCOUNT);
const SUCCESS_SAVED = SUCCESS_AMOUNT - SUCCESS_CHARGE;
const SUCCESS_NEW_BALANCE = CURRENT_USER.balance + SUCCESS_AMOUNT;
const SUCCESS_DATE = "May 11, 2026";
const SUCCESS_TIME = "08:42 AM";
const SUCCESS_REF = "TUP-2026-30417";
const SUCCESS_METHOD = "Visa •••• 4242";

export default function CheckoutSuccessPage() {
  return (
    <div className="flex-1 px-4 py-12 lg:px-6 lg:py-20">
      <div className="mx-auto w-full max-w-md">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success-bg">
          <CheckCircle2
            aria-hidden="true"
            className="size-8 text-success-dark"
          />
        </div>
        <p className="mt-6 text-center font-mono text-[11px] font-medium tracking-[0.18em] text-success-dark uppercase">
          Paid {fmtMoney(SUCCESS_CHARGE)} · saved {fmtMoney(SUCCESS_SAVED)}
        </p>
        <h1 className="mt-2 text-center font-heading text-4xl font-medium tracking-tight text-balance">
          {fmtMoney(SUCCESS_AMOUNT)} credit added
        </h1>
        <p className="mx-auto mt-3 max-w-[44ch] text-center text-sm text-muted-foreground text-pretty">
          Your Flint wallet now holds{" "}
          <span className="font-mono tabular-nums text-foreground">
            {fmtMoney(SUCCESS_NEW_BALANCE)}
          </span>
          . A receipt was emailed to{" "}
          <span className="text-foreground">{CURRENT_USER.email}</span>.
        </p>

        <div className="mt-8 rounded-xl border border-border bg-card">
          <dl className="flex flex-col divide-y divide-border text-sm">
            <SummaryRow label="Paid" value={fmtMoney(SUCCESS_CHARGE)} mono />
            <SummaryRow
              label="Credit added"
              value={fmtMoney(SUCCESS_AMOUNT)}
              mono
            />
            <SummaryRow
              label="Volume discount"
              value={`−${fmtMoney(SUCCESS_SAVED)}`}
              mono
              valueClassName="text-success-dark"
            />
            <SummaryRow label="Method" value={SUCCESS_METHOD} mono />
            <SummaryRow label="Ticket" value={SUCCESS_REF} mono />
            <SummaryRow
              label="Date"
              value={`${SUCCESS_DATE} · ${SUCCESS_TIME}`}
            />
          </dl>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/console/topup"
            className={cn(
              buttonVariants({ variant: "brand", size: "lg" }),
              "w-full",
            )}
          >
            Back to wallet
            <ArrowRight aria-hidden="true" />
          </Link>
          <Button variant="outline" size="sm" className="w-full">
            <Download aria-hidden="true" />
            Download PDF receipt
          </Button>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  mono,
  valueClassName,
}: {
  label: string;
  value: string;
  mono?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          mono ? "font-mono tabular-nums" : "",
          "text-foreground",
          valueClassName,
        )}
      >
        {value}
      </dd>
    </div>
  );
}
