import { ArrowRight, CheckCircle2, Download } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { loadTopupData } from "@/lib/console/data";
import { fmtAbsDate, fmtMoney } from "@/lib/console/format";
import { cn } from "@/lib/utils";

export default async function CheckoutSuccessPage() {
  const { invoices, status, user } = await loadTopupData();
  const invoice = invoices.items[0];
  const isSubscription = invoice?.type === "subscription";
  const creditAmount = invoice?.amount ?? 0;
  const paidAmount = invoice?.money || creditAmount;

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
          Paid {fmtMoney(paidAmount, status)}
        </p>
        <h1 className="mt-2 text-center font-heading text-4xl font-medium tracking-tight text-balance">
          {isSubscription
            ? "Subscription payment received"
            : "Payment received"}
        </h1>
        <p className="mx-auto mt-3 max-w-[44ch] text-center text-sm text-muted-foreground text-pretty">
          {isSubscription ? (
            "Your subscription is being updated. A receipt was emailed to "
          ) : (
            <>
              Your Flint wallet now holds{" "}
              <span className="font-mono tabular-nums text-foreground">
                {fmtMoney(user.balance, status)}
              </span>
              . A receipt was emailed to{" "}
            </>
          )}
          <span className="text-foreground">{user.email}</span>.
        </p>

        <div className="mt-8 rounded-xl border border-border bg-card">
          <dl className="flex flex-col divide-y divide-border text-sm">
            <SummaryRow
              label="Paid"
              value={fmtMoney(paidAmount, status)}
              mono
            />
            {isSubscription ? (
              <SummaryRow
                label="Subscription"
                value={fmtMoney(paidAmount, status)}
                mono
              />
            ) : (
              <SummaryRow
                label="Credit added"
                value={fmtMoney(creditAmount, status)}
                mono
              />
            )}
            <SummaryRow
              label="Method"
              value={invoice?.method || "stripe"}
              mono
            />
            <SummaryRow
              label="Ticket"
              value={
                invoice?.invoiceNumber ||
                invoice?.reference ||
                invoice?.id ||
                "pending"
              }
              mono
            />
            <SummaryRow
              label="Date"
              value={invoice ? fmtAbsDate(invoice.ts) : "pending"}
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
          {invoice?.invoicePdf ? (
            <Link
              href={invoice.invoicePdf}
              target="_blank"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "w-full",
              )}
            >
              <Download aria-hidden="true" />
              Download PDF receipt
            </Link>
          ) : null}
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
