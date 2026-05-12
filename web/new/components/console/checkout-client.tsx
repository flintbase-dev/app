"use client";

import {
  BillingAddressElement,
  CheckoutElementsProvider,
  ContactDetailsElement,
  PaymentElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout";
import { loadStripe } from "@stripe/stripe-js";
import { ArrowLeft, CreditCard, Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  createStripeTopupSessionAction,
  createSubscriptionStripeSessionAction,
} from "@/lib/console/actions";
import { fmtMoney } from "@/lib/console/format";
import type {
  ConsoleStatus,
  ConsoleUser,
  TopupInfo,
} from "@/lib/console/types";
import { cn } from "@/lib/utils";

type StripeCheckoutSession = {
  publishable_key?: string;
  client_secret?: string;
  payment_order_id?: string;
  checkout_session_id?: string;
  invoice_id?: string;
  invoice_number?: string;
  return_url?: string;
  customer_email?: string;
  customer_id?: string;
  requires_customer_details?: boolean;
  amount?: number;
  currency?: string;
};

type CheckoutMode = "topup" | "subscription";

type SubscriptionCheckoutTarget = {
  planId: string;
  planTitle: string;
  planTotal: number;
  purchaseMode: "purchase" | "switch";
  fromSubscriptionId?: string;
};

export function CheckoutClient({
  amount,
  charge,
  checkoutMode,
  discount,
  newBalance,
  status,
  subscription,
  topupInfo,
  user,
}: {
  amount: number;
  charge: number;
  checkoutMode: CheckoutMode;
  discount: number;
  newBalance: number;
  status: ConsoleStatus;
  subscription?: SubscriptionCheckoutTarget;
  topupInfo: TopupInfo;
  user: ConsoleUser;
}) {
  const [session, setSession] = useState<StripeCheckoutSession | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setError("");
    setSession(null);
    startTransition(async () => {
      try {
        const returnUrl = stripeReturnUrl();
        const nextSession =
          checkoutMode === "subscription"
            ? await createSubscriptionStripeSessionAction({
                fromSubscriptionId: subscription?.fromSubscriptionId,
                mode: subscription?.purchaseMode || "purchase",
                planId: subscription?.planId || "",
                returnUrl,
              })
            : await createStripeTopupSessionAction({
                amount,
                returnUrl,
              });
        if (!cancelled) setSession(nextSession as StripeCheckoutSession);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Payment setup failed");
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    amount,
    checkoutMode,
    subscription?.fromSubscriptionId,
    subscription?.planId,
    subscription?.purchaseMode,
  ]);

  const publishableKey =
    session?.publishable_key || topupInfo.stripePublishableKey;
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  );
  const checkoutOptions = useMemo(
    () =>
      session?.client_secret
        ? {
            clientSecret: session.client_secret,
            elementsOptions: {
              appearance: {
                theme: "stripe" as const,
              },
            },
          }
        : null,
    [session?.client_secret],
  );
  const isSubscription = checkoutMode === "subscription";

  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-5xl">
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

        <div>
          <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
            {isSubscription ? "Subscription" : "Top up wallet"}
          </p>
          <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight">
            {isSubscription ? "Subscription checkout" : "Checkout"}
          </h1>
          <p className="mt-2 max-w-[60ch] text-sm text-muted-foreground">
            {isSubscription
              ? `Subscribe to ${subscription?.planTitle || "the selected plan"}.`
              : `Adding ${fmtMoney(amount, status)} to your Flint wallet.`}
          </p>
        </div>

        {stripePromise && checkoutOptions ? (
          <CheckoutElementsProvider
            key={session?.client_secret}
            options={checkoutOptions}
            stripe={stripePromise}
          >
            <CheckoutBody
              amount={amount}
              charge={charge}
              checkoutMode={checkoutMode}
              discount={discount}
              error={error}
              newBalance={newBalance}
              pending={pending}
              ready
              session={session}
              status={status}
              subscription={subscription}
              user={user}
            />
          </CheckoutElementsProvider>
        ) : (
          <CheckoutBody
            amount={amount}
            charge={charge}
            checkoutMode={checkoutMode}
            discount={discount}
            error={error}
            newBalance={newBalance}
            pending={pending}
            ready={false}
            session={session}
            status={status}
            subscription={subscription}
            user={user}
          />
        )}
      </div>
    </div>
  );
}

function CheckoutBody({
  amount,
  charge,
  checkoutMode,
  discount,
  error,
  newBalance,
  pending,
  ready,
  session,
  status,
  subscription,
  user,
}: {
  amount: number;
  charge: number;
  checkoutMode: CheckoutMode;
  discount: number;
  error: string;
  newBalance: number;
  pending: boolean;
  ready: boolean;
  session: StripeCheckoutSession | null;
  status: ConsoleStatus;
  subscription?: SubscriptionCheckoutTarget;
  user: ConsoleUser;
}) {
  const isSubscription = checkoutMode === "subscription";
  const totalDue = session?.amount ?? charge;
  const [paymentComplete, setPaymentComplete] = useState(false);

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
      <div className="flex min-w-0 flex-col gap-8">
        <Section title="Payment details">
          {ready ? (
            <PaymentDetailsBlock
              error={error}
              onCompleteChange={setPaymentComplete}
              requiresBillingDetails={Boolean(
                session?.requires_customer_details,
              )}
              requiresContactDetails={Boolean(
                session?.requires_customer_details && !session?.customer_email,
              )}
            />
          ) : (
            <PaymentSetupState error={error} pending={pending} />
          )}
        </Section>
      </div>

      <aside className="lg:sticky lg:top-16 lg:self-start">
        <div className="rounded-2xl bg-foreground text-background">
          <div className="flex items-center gap-2 rounded-t-2xl bg-brand px-6 py-3 text-brand-foreground">
            <CreditCard aria-hidden="true" className="size-4" />
            <p className="font-mono text-[11px] font-semibold tracking-[0.18em] uppercase">
              {isSubscription ? "Flint · Plan" : "Flint · Top up"}
            </p>
          </div>
          <div className="flex flex-col gap-5 px-6 pt-5 pb-7">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-[10px] tracking-[0.18em] text-background/60 uppercase">
                  Ticket
                </p>
                <p className="font-mono text-xs tabular-nums">
                  {session?.invoice_number ||
                    session?.invoice_id ||
                    session?.payment_order_id ||
                    session?.checkout_session_id ||
                    "Preparing"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] tracking-[0.18em] text-background/60 uppercase">
                  Processor
                </p>
                <p className="font-mono text-xs tabular-nums">Stripe</p>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium tracking-[0.12em] text-background/60 uppercase">
                Total
              </p>
              <p className="mt-0.5 font-mono text-5xl font-medium tabular-nums">
                {fmtMoney(totalDue, status)}
              </p>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
              <dt className="text-background/60 uppercase tracking-[0.08em]">
                From
              </dt>
              <dd className="font-mono tabular-nums text-background">
                {user.email}
              </dd>
              <dt className="text-background/60 uppercase tracking-[0.08em]">
                To
              </dt>
              <dd className="font-mono tabular-nums text-background">
                Wallet · {user.username}
              </dd>
            </dl>
          </div>

          <div className="relative">
            <div className="border-t border-dashed border-background/30" />
            <div
              aria-hidden="true"
              className="absolute -left-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-background"
            />
            <div
              aria-hidden="true"
              className="absolute -right-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-background"
            />
          </div>

          <div className="flex flex-col gap-4 px-6 pt-6 pb-6">
            <p className="text-[10px] tracking-[0.18em] text-background/60 uppercase">
              Stub
            </p>
            <dl className="flex flex-col gap-1.5 font-mono text-sm tabular-nums">
              {isSubscription ? (
                <>
                  <StubRow
                    label="Plan"
                    value={subscription?.planTitle || "Selected plan"}
                  />
                  <StubRow
                    label="Plan credit"
                    value={
                      subscription?.planTotal
                        ? fmtMoney(subscription.planTotal, status)
                        : "Unlimited"
                    }
                  />
                  <StubRow
                    label="Action"
                    value={
                      subscription?.purchaseMode === "switch"
                        ? "Switch plan"
                        : "New subscription"
                    }
                  />
                </>
              ) : (
                <>
                  <StubRow
                    label="Credit added"
                    value={fmtMoney(amount, status)}
                  />
                  {discount ? (
                    <StubRow
                      label="Discount"
                      value={`-${fmtMoney(amount - charge, status)}`}
                      valueClassName="text-success"
                    />
                  ) : null}
                </>
              )}
              <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-dashed border-background/30 pt-2">
                <dt className="font-sans text-xs font-medium text-background">
                  You pay
                </dt>
                <dd className="font-mono text-base font-medium tabular-nums">
                  {fmtMoney(totalDue, status)}
                </dd>
              </div>
              {isSubscription ? null : (
                <StubRow
                  label="Wallet after"
                  value={fmtMoney(newBalance, status)}
                />
              )}
            </dl>
            {ready ? (
              <ConfirmPaymentButton
                disabled={
                  !session?.client_secret || pending || !paymentComplete
                }
                label={`Pay ${fmtMoney(totalDue, status)}`}
                session={session}
              />
            ) : (
              <Button
                disabled
                size="lg"
                className="w-full bg-background text-foreground hover:bg-background/90"
                type="button"
              >
                <Lock aria-hidden="true" />
                {pending ? "Preparing..." : `Pay ${fmtMoney(totalDue, status)}`}
              </Button>
            )}
            <div
              aria-hidden="true"
              className="h-7 [background:repeating-linear-gradient(90deg,_var(--color-background)_0_2px,_transparent_2px_4px,_var(--color-background)_4px_5px,_transparent_5px_9px,_var(--color-background)_9px_11px,_transparent_11px_14px)]"
            />
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          By continuing you accept the{" "}
          <Link
            href="/user-agreement"
            className="text-foreground underline-offset-4 hover:underline"
          >
            user agreement
          </Link>
          .
        </p>
      </aside>
    </div>
  );
}

function PaymentSetupState({
  error,
  pending,
}: {
  error: string;
  pending: boolean;
}) {
  if (error) {
    return (
      <div className="rounded-md border-l-2 border-danger bg-danger-bg p-3 text-sm text-danger-dark">
        {error}
      </div>
    );
  }
  return (
    <div className="rounded-md border border-border bg-muted p-4 text-sm text-muted-foreground">
      {pending ? "Preparing secure payment..." : "Preparing payment..."}
    </div>
  );
}

function PaymentDetailsBlock({
  error,
  onCompleteChange,
  requiresBillingDetails,
  requiresContactDetails,
}: {
  error: string;
  onCompleteChange: (complete: boolean) => void;
  requiresBillingDetails: boolean;
  requiresContactDetails: boolean;
}) {
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [contactComplete, setContactComplete] = useState(
    !requiresContactDetails,
  );
  const [billingComplete, setBillingComplete] = useState(
    !requiresBillingDetails,
  );

  useEffect(() => {
    setPaymentComplete(false);
    setContactComplete(!requiresContactDetails);
    setBillingComplete(!requiresBillingDetails);
  }, [requiresBillingDetails, requiresContactDetails]);

  useEffect(() => {
    onCompleteChange(paymentComplete && contactComplete && billingComplete);
  }, [billingComplete, contactComplete, onCompleteChange, paymentComplete]);

  if (error) {
    return (
      <div className="rounded-md border-l-2 border-danger bg-danger-bg p-3 text-sm text-danger-dark">
        {error}
      </div>
    );
  }
  return (
    <div className="grid gap-5">
      {requiresContactDetails ? (
        <div className="grid gap-2">
          <p className="text-sm font-medium text-foreground">Contact</p>
          <ContactDetailsElement
            onChange={(event) => setContactComplete(event.complete)}
          />
        </div>
      ) : null}
      {requiresBillingDetails ? (
        <div className="grid gap-2">
          <p className="text-sm font-medium text-foreground">Billing address</p>
          <BillingAddressElement
            onChange={(event) => setBillingComplete(event.complete)}
            options={{ display: { name: "full" } }}
          />
        </div>
      ) : null}
      <div className="grid gap-2">
        <p className="text-sm font-medium text-foreground">Payment method</p>
        <PaymentElement
          onChange={(event) => setPaymentComplete(event.complete)}
          options={{ layout: "accordion" }}
        />
      </div>
    </div>
  );
}

function ConfirmPaymentButton({
  disabled,
  label,
  session,
}: {
  disabled: boolean;
  label: string;
  session: StripeCheckoutSession | null;
}) {
  const checkoutState = useCheckoutElements();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const checkoutReady = checkoutState.type === "success";

  return (
    <div className="flex flex-col gap-2">
      <Button
        disabled={disabled || pending || !checkoutReady}
        size="lg"
        className="w-full bg-background text-foreground hover:bg-background/90"
        onClick={() => {
          setError("");
          startTransition(async () => {
            if (checkoutState.type !== "success") return;
            const confirmArgs = {
              redirect: "if_required",
            } as const;
            const result = await checkoutState.checkout.confirm(confirmArgs);
            if (result.type === "error") {
              setError(result.error.message || "Payment confirmation failed");
              return;
            }
            const sessionStatus = result.session.status;
            if (
              sessionStatus.type !== "complete" ||
              (sessionStatus.paymentStatus !== "paid" &&
                sessionStatus.paymentStatus !== "no_payment_required")
            ) {
              setError(
                "Payment is not complete yet. Please finish payment first.",
              );
              return;
            }
            window.location.assign(stripeSuccessPath(session));
          });
        }}
        type="button"
      >
        <Lock aria-hidden="true" />
        {pending ? "Confirming..." : label}
      </Button>
      {checkoutState.type === "error" ? (
        <p className="text-xs text-danger-bg">{checkoutState.error.message}</p>
      ) : null}
      {error ? <p className="text-xs text-danger-bg">{error}</p> : null}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-6 first:border-t-0 first:pt-0">
      <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
        {title}
      </p>
      {children}
    </section>
  );
}

function StubRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="font-sans text-xs text-background/60">{label}</dt>
      <dd className={cn("text-background", valueClassName)}>{value}</dd>
    </div>
  );
}

function stripeReturnUrl() {
  return `${window.location.origin}/console/topup/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
}

function stripeSuccessPath(session: StripeCheckoutSession | null) {
  const sessionId = session?.checkout_session_id || "";
  return `/console/topup/checkout/success?session_id=${encodeURIComponent(
    sessionId,
  )}`;
}
