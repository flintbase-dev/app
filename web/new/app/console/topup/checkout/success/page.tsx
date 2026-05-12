import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { loadStripeCheckoutResult, loadTopupData } from "@/lib/console/data";
import { fmtAbsDate, fmtMoney } from "@/lib/console/format";
import type {
  CheckoutResult,
  ConsoleStatus,
  ConsoleUser,
} from "@/lib/console/types";
import { cn } from "@/lib/utils";

const RESULT_REFRESH_DELAY_MS = 2000;

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId = "" } = await searchParams;
  const data = sessionId
    ? await loadCheckoutResultAfterDelay(sessionId)
    : await loadTopupData();
  const checkout = "checkout" in data ? data.checkout : null;

  return (
    <CheckoutResultView
      checkout={checkout}
      status={data.status}
      user={data.user}
    />
  );
}

async function loadCheckoutResultAfterDelay(sessionId: string) {
  await new Promise((resolve) => setTimeout(resolve, RESULT_REFRESH_DELAY_MS));
  return loadStripeCheckoutResult(sessionId);
}

function CheckoutResultView({
  checkout,
  status,
  user,
}: {
  checkout: CheckoutResult | null;
  status: ConsoleStatus;
  user: ConsoleUser;
}) {
  const resultStatus = checkout?.status ?? "pending";
  const isSuccess = resultStatus === "completed";
  const isFailure = resultStatus === "failed" || resultStatus === "expired";
  const isSubscription = checkout?.kind.includes("subscription") ?? false;
  const paidAmount = checkout?.money ?? 0;
  const creditAmount = checkout?.amount ?? 0;
  const receiptHref = checkout?.invoicePdf || checkout?.receiptUrl || "";
  const copy = resultCopy(resultStatus, isSubscription, status, user, checkout);
  const Icon = isSuccess ? CheckCircle2 : isFailure ? XCircle : Clock;

  return (
    <div className="flex-1 px-4 py-12 lg:px-6 lg:py-20">
      <div className="mx-auto w-full max-w-md">
        <div
          className={cn(
            "mx-auto flex size-16 items-center justify-center rounded-full",
            isSuccess
              ? "bg-success-bg"
              : isFailure
                ? "bg-danger-bg"
                : "bg-info-bg",
          )}
        >
          <Icon
            aria-hidden="true"
            className={cn(
              "size-8",
              isSuccess
                ? "text-success-dark"
                : isFailure
                  ? "text-danger"
                  : "text-info",
            )}
          />
        </div>
        <p
          className={cn(
            "mt-6 text-center font-mono text-[11px] font-medium tracking-[0.18em] uppercase",
            isSuccess
              ? "text-success-dark"
              : isFailure
                ? "text-danger"
                : "text-info",
          )}
        >
          {copy.eyebrow}
        </p>
        <h1 className="mt-2 text-center font-heading text-4xl font-medium tracking-tight text-balance">
          {copy.title}
        </h1>
        <p className="mx-auto mt-3 max-w-[44ch] text-center text-sm text-muted-foreground text-pretty">
          {copy.body}
        </p>

        <div className="mt-8 rounded-xl border border-border bg-card">
          <dl className="flex flex-col divide-y divide-border text-sm">
            <SummaryRow label="Status" value={copy.statusLabel} mono />
            {paidAmount > 0 ? (
              <SummaryRow
                label={isSuccess ? "Paid" : "Amount"}
                value={fmtMoney(paidAmount, status)}
                mono
              />
            ) : null}
            {isSuccess && isSubscription ? (
              <SummaryRow
                label="Subscription"
                value={fmtMoney(paidAmount, status)}
                mono
              />
            ) : null}
            {isSuccess && !isSubscription ? (
              <SummaryRow
                label="Credit added"
                value={fmtMoney(creditAmount, status)}
                mono
              />
            ) : null}
            <SummaryRow
              label="Method"
              value={checkout?.paymentMethod || "stripe"}
              mono
            />
            <SummaryRow
              label="Ticket"
              value={
                checkout?.invoiceNumber ||
                checkout?.tradeNo ||
                checkout?.invoiceId ||
                checkout?.paymentOrderId ||
                "pending"
              }
              mono
            />
            <SummaryRow
              label="Date"
              value={
                checkout
                  ? fmtAbsDate(checkout.completedAt || checkout.createdAt)
                  : "pending"
              }
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
          {isSuccess && receiptHref ? (
            <Link
              href={receiptHref}
              target="_blank"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "w-full",
              )}
            >
              <Download aria-hidden="true" />
              Download receipt
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function resultCopy(
  status: CheckoutResult["status"],
  isSubscription: boolean,
  display: ConsoleStatus,
  user: ConsoleUser,
  checkout: CheckoutResult | null,
) {
  const paid = fmtMoney(checkout?.money ?? 0, display);
  const balance = fmtMoney(user.balance, display);
  if (status === "completed") {
    return {
      eyebrow: `Paid ${paid}`,
      title: isSubscription
        ? "Subscription payment received"
        : "Payment received",
      body: isSubscription
        ? `Your subscription is being updated. A receipt was emailed to ${user.email}.`
        : `Your Flint wallet now holds ${balance}. A receipt was emailed to ${user.email}.`,
      statusLabel: "Completed",
    };
  }
  if (status === "failed") {
    return {
      eyebrow: "Payment failed",
      title: "Payment not completed",
      body: `Your wallet balance remains ${balance}. No credit was added and no receipt was issued.`,
      statusLabel: "Failed",
    };
  }
  if (status === "expired") {
    return {
      eyebrow: "Payment expired",
      title: "Checkout expired",
      body: `Your wallet balance remains ${balance}. Start a new checkout when you are ready to pay.`,
      statusLabel: "Expired",
    };
  }
  return {
    eyebrow: "Checking payment",
    title: "Payment is processing",
    body: `Stripe has not confirmed the payment yet. Your wallet balance remains ${balance} until the payment succeeds.`,
    statusLabel: "Processing",
  };
}

function SummaryRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-right text-foreground",
          mono && "font-mono tabular-nums",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
