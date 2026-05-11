import { ArrowLeft, CreditCard, Lock } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
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
import { CURRENT_USER, fmtMoney } from "@/lib/console/mock";
import { cn } from "@/lib/utils";

const CHECKOUT_AMOUNT = 100;
const CHECKOUT_DISCOUNTS: Record<number, number> = {
  100: 0.05,
  250: 0.08,
  500: 0.12,
};
const CHECKOUT_DATE = "May 10, 2026";
const CHECKOUT_REF = "TUP-2026-30417";

export default function CheckoutPage() {
  const amount = CHECKOUT_AMOUNT;
  const discount = CHECKOUT_DISCOUNTS[amount] ?? 0;
  const charge = amount * (1 - discount);
  const newBalance = CURRENT_USER.balance + amount;

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
            Adding {fmtMoney(amount)} to your Flint wallet. Credit posts
            immediately on success.
          </p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
          <div className="flex min-w-0 flex-col gap-8">
            <Section title="Payment method">
              <PaymentMethodBlock />
            </Section>
            <Section title="Card details">
              <CardDetailsBlock />
            </Section>
            <Section title="Billing">
              <div className="flex flex-col gap-3">
                <BillingAddressBlock />
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
                      {CHECKOUT_REF}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] tracking-[0.18em] text-background/60 uppercase">
                      Date
                    </p>
                    <p className="font-mono text-xs tabular-nums">
                      {CHECKOUT_DATE}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-medium tracking-[0.12em] text-background/60 uppercase">
                    Total
                  </p>
                  <p className="mt-0.5 font-mono text-5xl font-medium tabular-nums">
                    {fmtMoney(charge)}
                  </p>
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                  <dt className="text-background/60 uppercase tracking-[0.08em]">
                    From
                  </dt>
                  <dd className="font-mono tabular-nums text-background">
                    {CURRENT_USER.email}
                  </dd>
                  <dt className="text-background/60 uppercase tracking-[0.08em]">
                    To
                  </dt>
                  <dd className="font-mono tabular-nums text-background">
                    Wallet · {CURRENT_USER.username}
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
                  <StubRow
                    label="Credit added"
                    value={fmtMoney(amount)}
                  />
                  {discount ? (
                    <StubRow
                      label="Discount"
                      value={`−${fmtMoney(amount - charge)}`}
                      valueClassName="text-success"
                    />
                  ) : null}
                  <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-dashed border-background/30 pt-2">
                    <dt className="font-sans text-xs font-medium text-background">
                      You pay
                    </dt>
                    <dd className="font-mono text-base font-medium tabular-nums">
                      {fmtMoney(charge)}
                    </dd>
                  </div>
                  <StubRow
                    label="Wallet after"
                    value={fmtMoney(newBalance)}
                  />
                </dl>
                <Link
                  href="/console/topup/checkout/success"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "w-full bg-background text-foreground hover:bg-background/90",
                  )}
                >
                  <Lock aria-hidden="true" />
                  Pay {fmtMoney(charge)}
                </Link>
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
      </div>
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

function PaymentMethodBlock() {
  return (
    <RadioGroup defaultValue="card" className="grid gap-2 sm:grid-cols-3">
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
          <RadioGroupItem id="pm-wechat" value="wechat" />
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

function CardDetailsBlock() {
  return (
    <div className="grid gap-3">
      <FormRow id="card-number" label="Card number">
        <Input
          id="card-number"
          placeholder="1234 1234 1234 1234"
          autoComplete="cc-number"
          className="font-mono tabular-nums"
        />
      </FormRow>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormRow id="card-exp" label="Expiry">
          <Input
            id="card-exp"
            placeholder="MM / YY"
            autoComplete="cc-exp"
            className="font-mono tabular-nums"
          />
        </FormRow>
        <FormRow id="card-cvc" label="CVC">
          <Input
            id="card-cvc"
            placeholder="123"
            autoComplete="cc-csc"
            className="font-mono tabular-nums"
          />
        </FormRow>
      </div>
      <FormRow id="card-name" label="Cardholder name">
        <Input
          id="card-name"
          defaultValue={CURRENT_USER.display_name}
          autoComplete="cc-name"
        />
      </FormRow>
    </div>
  );
}

function BillingAddressBlock() {
  return (
    <div className="grid gap-3">
      <FormRow id="bill-name" label="Full name">
        <Input
          id="bill-name"
          defaultValue={CURRENT_USER.display_name}
          autoComplete="name"
        />
      </FormRow>
      <FormRow id="bill-email" label="Receipt email">
        <Input
          id="bill-email"
          type="email"
          defaultValue={CURRENT_USER.email}
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
