"use client";

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { ArrowLeft, CreditCard, Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { createStripeTopupSessionAction } from "@/lib/console/actions";
import { fmtMoney } from "@/lib/console/format";
import type {
  ConsoleStatus,
  ConsoleUser,
  TopupInfo,
} from "@/lib/console/types";
import { cn } from "@/lib/utils";

type PaymentMethodType = "card" | "alipay" | "wechat_pay";

type StripePaymentSession = {
  publishable_key?: string;
  client_secret?: string;
  customer_session_client_secret?: string;
  invoice_id?: string;
  invoice_number?: string;
  hosted_invoice_url?: string;
  invoice_pdf?: string;
  amount?: number;
  currency?: string;
};

export function CheckoutClient({
  amount,
  charge,
  discount,
  newBalance,
  status,
  topupInfo,
  user,
}: {
  amount: number;
  charge: number;
  discount: number;
  newBalance: number;
  status: ConsoleStatus;
  topupInfo: TopupInfo;
  user: ConsoleUser;
}) {
  const [method, setMethod] = useState<PaymentMethodType>("card");
  const [session, setSession] = useState<StripePaymentSession | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setError("");
    setSession(null);
    startTransition(async () => {
      try {
        const nextSession = await createStripeTopupSessionAction({
          amount,
          paymentMethodType: method,
        });
        setSession(nextSession as StripePaymentSession);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Payment setup failed");
      }
    });
  }, [amount, method]);

  const publishableKey =
    session?.publishable_key || topupInfo.stripePublishableKey;
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  );
  const elementsOptions = useMemo(
    () =>
      session?.client_secret
        ? {
            clientSecret: session.client_secret,
            customerSessionClientSecret:
              method === "card"
                ? session.customer_session_client_secret || undefined
                : undefined,
            appearance: {
              theme: "stripe" as const,
            },
          }
        : null,
    [method, session],
  );

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
            Top up wallet
          </p>
          <h1 className="mt-1 font-heading text-3xl font-medium tracking-tight">
            Checkout
          </h1>
          <p className="mt-2 max-w-[60ch] text-sm text-muted-foreground">
            Adding {fmtMoney(amount, status)} to your Flint wallet. Credit posts
            immediately on success.
          </p>
        </div>

        {stripePromise && elementsOptions ? (
          <Elements
            key={`${method}:${session?.client_secret}`}
            options={elementsOptions}
            stripe={stripePromise}
          >
            <CheckoutBody
              amount={amount}
              charge={charge}
              discount={discount}
              error={error}
              method={method}
              newBalance={newBalance}
              pending={pending}
              ready
              session={session}
              setMethod={setMethod}
              status={status}
              user={user}
            />
          </Elements>
        ) : (
          <CheckoutBody
            amount={amount}
            charge={charge}
            discount={discount}
            error={error}
            method={method}
            newBalance={newBalance}
            pending={pending}
            ready={false}
            session={session}
            setMethod={setMethod}
            status={status}
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
  discount,
  error,
  method,
  newBalance,
  pending,
  ready,
  session,
  setMethod,
  status,
  user,
}: {
  amount: number;
  charge: number;
  discount: number;
  error: string;
  method: PaymentMethodType;
  newBalance: number;
  pending: boolean;
  ready: boolean;
  session: StripePaymentSession | null;
  setMethod: (method: PaymentMethodType) => void;
  status: ConsoleStatus;
  user: ConsoleUser;
}) {
  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
      <div className="flex min-w-0 flex-col gap-8">
        <Section title="Payment method">
          <PaymentMethodBlock method={method} setMethod={setMethod} />
        </Section>
        <Section title="Payment details">
          <PaymentDetailsBlock
            error={error}
            loading={pending || !ready}
            method={method}
          />
        </Section>
        <Section title="Billing">
          <div className="flex flex-col gap-3">
            <BillingAddressBlock user={user} />
            <Separator className="my-1" />
            <BusinessToggle />
            <BusinessFieldsBlock />
          </div>
        </Section>
      </div>

      <aside className="lg:sticky lg:top-16 lg:self-start">
        <div className="rounded-2xl bg-foreground text-background">
          <div className="flex items-center gap-2 rounded-t-2xl bg-brand px-6 py-3 text-brand-foreground">
            <CreditCard aria-hidden="true" className="size-4" />
            <p className="font-mono text-[11px] font-semibold tracking-[0.18em] uppercase">
              Flint · Top up
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
                    "Preparing"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] tracking-[0.18em] text-background/60 uppercase">
                  Method
                </p>
                <p className="font-mono text-xs tabular-nums">
                  {methodLabel(method)}
                </p>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium tracking-[0.12em] text-background/60 uppercase">
                Total
              </p>
              <p className="mt-0.5 font-mono text-5xl font-medium tabular-nums">
                {fmtMoney(charge, status)}
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
              <StubRow label="Credit added" value={fmtMoney(amount, status)} />
              {discount ? (
                <StubRow
                  label="Discount"
                  value={`-${fmtMoney(amount - charge, status)}`}
                  valueClassName="text-success"
                />
              ) : null}
              <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-dashed border-background/30 pt-2">
                <dt className="font-sans text-xs font-medium text-background">
                  You pay
                </dt>
                <dd className="font-mono text-base font-medium tabular-nums">
                  {fmtMoney(charge, status)}
                </dd>
              </div>
              <StubRow
                label="Wallet after"
                value={fmtMoney(newBalance, status)}
              />
            </dl>
            {ready ? (
              <ConfirmPaymentButton
                disabled={!session?.client_secret || pending}
                label={`Pay ${fmtMoney(charge, status)}`}
              />
            ) : (
              <Button
                disabled
                size="lg"
                className="w-full bg-background text-foreground hover:bg-background/90"
                type="button"
              >
                <Lock aria-hidden="true" />
                {pending ? "Preparing..." : `Pay ${fmtMoney(charge, status)}`}
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

function PaymentDetailsBlock({
  error,
  loading,
  method,
}: {
  error: string;
  loading: boolean;
  method: PaymentMethodType;
}) {
  if (error) {
    return (
      <div className="rounded-md border-l-2 border-danger bg-danger-bg p-3 text-sm text-danger-dark">
        {error}
      </div>
    );
  }
  if (loading) {
    return (
      <div className="rounded-md border border-border bg-muted p-4 text-sm text-muted-foreground">
        Preparing secure {methodLabel(method)} payment...
      </div>
    );
  }
  return (
    <div className="grid gap-3">
      <PaymentElement options={{ layout: "accordion" }} />
      {method === "card" ? (
        <p className="text-xs text-muted-foreground">
          Saved cards are available only for card payments.
        </p>
      ) : null}
    </div>
  );
}

function ConfirmPaymentButton({
  disabled,
  label,
}: {
  disabled: boolean;
  label: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <div className="flex flex-col gap-2">
      <Button
        disabled={disabled || pending || !stripe || !elements}
        size="lg"
        className="w-full bg-background text-foreground hover:bg-background/90"
        onClick={() => {
          setError("");
          startTransition(async () => {
            if (!stripe || !elements) return;
            const result = await stripe.confirmPayment({
              elements,
              confirmParams: {
                return_url: `${window.location.origin}/console/topup/checkout/success`,
              },
            });
            if (result.error) {
              setError(result.error.message || "Payment confirmation failed");
            }
          });
        }}
        type="button"
      >
        <Lock aria-hidden="true" />
        {pending ? "Confirming..." : label}
      </Button>
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

function PaymentMethodBlock({
  method,
  setMethod,
}: {
  method: PaymentMethodType;
  setMethod: (method: PaymentMethodType) => void;
}) {
  return (
    <RadioGroup
      className="grid gap-2 sm:grid-cols-3"
      onValueChange={(value) => setMethod(value as PaymentMethodType)}
      value={method}
    >
      <FieldLabel htmlFor="pm-card">
        <Field orientation="horizontal">
          <RadioGroupItem id="pm-card" value="card" />
          <FieldContent>
            <FieldTitle>
              <CreditCard aria-hidden="true" className="mr-1.5 size-4" />
              Card
            </FieldTitle>
            <FieldDescription>Visa, MC, Amex</FieldDescription>
          </FieldContent>
        </Field>
      </FieldLabel>
      <FieldLabel htmlFor="pm-alipay">
        <Field orientation="horizontal">
          <RadioGroupItem id="pm-alipay" value="alipay" />
          <FieldContent>
            <FieldTitle>
              <BrandBadge brand="alipay" />
              Alipay
            </FieldTitle>
            <FieldDescription>QR or Alipay app</FieldDescription>
          </FieldContent>
        </Field>
      </FieldLabel>
      <FieldLabel htmlFor="pm-wechat">
        <Field orientation="horizontal">
          <RadioGroupItem id="pm-wechat" value="wechat_pay" />
          <FieldContent>
            <FieldTitle>
              <BrandBadge brand="wechat" />
              WeChat Pay
            </FieldTitle>
            <FieldDescription>Scan in WeChat</FieldDescription>
          </FieldContent>
        </Field>
      </FieldLabel>
    </RadioGroup>
  );
}

function BillingAddressBlock({ user }: { user: ConsoleUser }) {
  return (
    <div className="grid gap-3">
      <FormRow id="bill-name" label="Full name">
        <Input
          id="bill-name"
          defaultValue={user.displayName}
          autoComplete="name"
        />
      </FormRow>
      <FormRow id="bill-email" label="Receipt email">
        <Input
          id="bill-email"
          type="email"
          defaultValue={user.email}
          autoComplete="email"
        />
      </FormRow>
      <FormRow id="bill-country" label="Country / region">
        <NativeSelect
          id="bill-country"
          defaultValue="US"
          autoComplete="country"
          className="w-full"
        >
          <option value="US">United States</option>
          <option value="CN">China (mainland)</option>
          <option value="HK">Hong Kong SAR</option>
          <option value="TW">Taiwan</option>
          <option value="JP">Japan</option>
          <option value="SG">Singapore</option>
          <option value="GB">United Kingdom</option>
          <option value="DE">Germany</option>
          <option value="FR">France</option>
          <option value="CA">Canada</option>
          <option value="AU">Australia</option>
        </NativeSelect>
      </FormRow>
      <FormRow id="bill-line1" label="Address line 1">
        <Input
          id="bill-line1"
          placeholder="Street address"
          autoComplete="address-line1"
        />
      </FormRow>
      <FormRow id="bill-line2" label="Address line 2" optional>
        <Input
          id="bill-line2"
          placeholder="Apt, suite, unit (optional)"
          autoComplete="address-line2"
        />
      </FormRow>
      <div className="grid gap-3 sm:grid-cols-3">
        <FormRow id="bill-city" label="City">
          <Input id="bill-city" autoComplete="address-level2" />
        </FormRow>
        <FormRow id="bill-state" label="State / region">
          <Input id="bill-state" autoComplete="address-level1" />
        </FormRow>
        <FormRow id="bill-postal" label="Postal code">
          <Input
            id="bill-postal"
            autoComplete="postal-code"
            className="font-mono tabular-nums"
          />
        </FormRow>
      </div>
    </div>
  );
}

function BusinessToggle() {
  return (
    <FieldLabel htmlFor="biz-toggle">
      <Field orientation="horizontal">
        <Checkbox id="biz-toggle" defaultChecked />
        <FieldContent>
          <FieldTitle>Purchasing as a business</FieldTitle>
          <FieldDescription>
            Add your business name and tax ID to invoices.
          </FieldDescription>
        </FieldContent>
      </Field>
    </FieldLabel>
  );
}

function BusinessFieldsBlock() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <FormRow id="biz-name" label="Business name">
        <Input
          id="biz-name"
          placeholder="Nordherd Labs Pte. Ltd."
          autoComplete="organization"
        />
      </FormRow>
      <FormRow id="biz-tax" label="Tax ID / VAT number">
        <Input
          id="biz-tax"
          placeholder="e.g. EU VAT, US EIN, CN USCC"
          className="font-mono tabular-nums"
        />
      </FormRow>
    </div>
  );
}

function FormRow({
  id,
  label,
  optional,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-foreground">
        {label}
        {optional ? (
          <span className="ml-1 font-normal text-muted-foreground">
            (optional)
          </span>
        ) : null}
      </Label>
      {children}
    </div>
  );
}

function BrandBadge({ brand }: { brand: "alipay" | "wechat" }) {
  if (brand === "alipay") {
    return (
      <span
        aria-hidden="true"
        className="mr-1.5 inline-flex size-4 shrink-0 items-center justify-center rounded-[3px] bg-[#1677ff] text-[9px] font-semibold text-white"
      >
        支
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="mr-1.5 inline-flex size-4 shrink-0 items-center justify-center rounded-[3px] bg-[#07c160] text-[9px] font-semibold text-white"
    >
      微
    </span>
  );
}

function methodLabel(method: PaymentMethodType): string {
  if (method === "alipay") return "Alipay";
  if (method === "wechat_pay") return "WeChat Pay";
  return "Card";
}
