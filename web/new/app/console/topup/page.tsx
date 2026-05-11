import {
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  Minus,
  Sparkles,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ACTIVE_SUBSCRIPTION,
  BILLS,
  CURRENT_USER,
  fmtMoney,
  fmtNum,
  SUB_PLANS,
  TOKENS,
} from "@/lib/console/mock";
import { cn } from "@/lib/utils";

const ACTIVE_PLAN =
  SUB_PLANS.find((p) => p.id === ACTIVE_SUBSCRIPTION.plan_id) ?? SUB_PLANS[0];

const REQUEST_LIMIT = 50_000;
const KEY_LIMIT = 10;
const MAY_USAGE = 38.42;

const BILLING_PREFERENCE_ITEMS = {
  wallet_first: "Wallet first, then subscription",
  subscription_first: "Subscription first, then wallet",
  subscription_only: "Subscription only",
};

export default function TopupPage() {
  const planUsed = ACTIVE_SUBSCRIPTION.total - ACTIVE_SUBSCRIPTION.remaining;
  const activeKeys = TOKENS.filter((t) => t.status === 1).length;
  const renewalDays = daysUntil(ACTIVE_SUBSCRIPTION.next_renewal_at);

  return (
    <div className="flex-1 px-4 py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <h1 className="font-heading text-3xl font-medium tracking-tight">
              Billing
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your plan, usage, and invoices.
            </p>

            <section className="mt-10">
              <h2 className="text-sm font-medium text-foreground">
                Current period usage
              </h2>
              <div className="mt-6 flex flex-col gap-7">
                <UsageBar
                  label="Plan credit"
                  display={`${fmtMoney(planUsed)} / ${fmtMoney(ACTIVE_SUBSCRIPTION.total)}`}
                  percent={(planUsed / ACTIVE_SUBSCRIPTION.total) * 100}
                  resets={`Resets in ${renewalDays} days`}
                />
                <UsageBar
                  label="Requests"
                  display={`${fmtNum(CURRENT_USER.request_count)} / ${fmtNum(REQUEST_LIMIT)}`}
                  percent={(CURRENT_USER.request_count / REQUEST_LIMIT) * 100}
                  resets={`Resets in ${renewalDays} days`}
                />
                <UsageBar
                  label="Active API keys"
                  display={`${activeKeys} / ${KEY_LIMIT}`}
                  percent={(activeKeys / KEY_LIMIT) * 100}
                  resets="Plan limit"
                />
              </div>
            </section>

            <section className="mt-12">
              <h2 className="text-sm font-medium text-foreground">Invoices</h2>
              <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-4 text-right">View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {BILLS.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="pl-4">
                          <code className="font-mono text-xs text-foreground">
                            INV-{String(b.id).padStart(7, "0")}
                          </code>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {fmtAbsDate(b.ts)}
                        </TableCell>
                        <TableCell className="text-right">
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
                        </TableCell>
                        <TableCell>
                          <InvoiceStatus status={b.status} />
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          {b.status === "failed" ? (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          ) : (
                            <Link
                              href={`/console/topup/history#${b.id}`}
                              className="text-xs text-muted-foreground hover:text-foreground"
                            >
                              View
                            </Link>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </div>

          <aside className="flex flex-col gap-6 lg:sticky lg:top-16 lg:self-start">
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  Subscription
                </p>
                <Badge variant="brand">{ACTIVE_PLAN.title}</Badge>
              </div>
              <p className="mt-3 font-mono text-3xl font-medium tabular-nums">
                ${ACTIVE_PLAN.price}
                <span className="ml-1 font-sans text-sm font-normal text-muted-foreground">
                  /mo
                </span>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Renews on {fmtAbsDate(ACTIVE_SUBSCRIPTION.next_renewal_at)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <PlansDialog />
                <Button variant="ghost" size="sm">
                  Cancel
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium text-foreground">
                Pay-as-you-go credits
              </p>
              <p className="mt-3 font-mono text-3xl font-medium tabular-nums">
                {fmtMoney(CURRENT_USER.balance)}
                <span className="ml-1 font-sans text-sm font-normal text-muted-foreground">
                  remaining
                </span>
              </p>
              <dl className="mt-3 flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Used in May 2026</dt>
                  <dd className="font-mono tabular-nums text-foreground">
                    {fmtMoney(MAY_USAGE)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Lifetime</dt>
                  <dd className="font-mono tabular-nums text-foreground">
                    {fmtMoney(CURRENT_USER.used)}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <AddCreditsDialog />
                <Button variant="outline" size="sm">
                  Auto-reload
                </Button>
                <Link
                  href="/console/topup/redeem"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                  )}
                >
                  Redeem code
                </Link>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium text-foreground">
                Payment method
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted">
                  <CreditCard
                    aria-hidden="true"
                    className="size-4 text-muted-foreground"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-foreground">Visa •••• 4242</p>
                  <p className="font-mono text-xs tabular-nums text-muted-foreground">
                    Expires 08/2028
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-4">
                Update card
              </Button>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium text-foreground">
                Billing portal
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Manage invoices, tax IDs, and billing details through our
                self-service portal.
              </p>
              <Button variant="outline" size="sm" className="mt-4">
                Open portal
              </Button>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium text-foreground">
                Spending preferences
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Choose which balance is charged first for usage.
              </p>
              <Select
                defaultValue="wallet_first"
                items={BILLING_PREFERENCE_ITEMS}
              >
                <SelectTrigger
                  aria-label="Billing preference"
                  className="mt-4 w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BILLING_PREFERENCE_ITEMS).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function UsageBar({
  label,
  display,
  percent,
  resets,
}: {
  label: string;
  display: string;
  percent: number;
  resets?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="font-mono text-xs tabular-nums text-muted-foreground">
          {display}
        </p>
      </div>
      <Progress value={percent} className="mt-2" />
      {resets ? (
        <p className="mt-2 text-xs text-muted-foreground">{resets}</p>
      ) : null}
    </div>
  );
}

function InvoiceStatus({ status }: { status: "completed" | "pending" | "failed" }) {
  if (status === "completed") {
    return (
      <Badge variant="success" className="px-1.5">
        <CheckCircle2 aria-hidden="true" />
        paid
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge variant="destructive" className="px-1.5">
        <XCircle aria-hidden="true" />
        failed
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="px-1.5">
      upcoming
    </Badge>
  );
}

type FeatureRow = {
  label: string;
  values: [React.ReactNode, React.ReactNode, React.ReactNode];
};

const FEATURE_MATRIX: FeatureRow[] = [
  { label: "Monthly credit", values: ["$25", "$130", "$700"] },
  { label: "API keys", values: ["5", "25", "Unlimited"] },
  {
    label: "Routing",
    values: ["Default", "Premium + retries", "Reserved + priority"],
  },
  {
    label: "Support",
    values: ["Email", "Priority email", "Dedicated Slack"],
  },
  { label: "Latency", values: ["Standard", "Lower", "Lowest"] },
  { label: "Team workspace", values: [false, true, true] },
  { label: "SLA", values: [false, false, "99.9%"] },
];

function PlansDialog() {
  const currentIdx = SUB_PLANS.findIndex(
    (p) => p.id === ACTIVE_SUBSCRIPTION.plan_id,
  );
  const recommendedId = SUB_PLANS[currentIdx + 1]?.id ?? null;

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Change plan
      </DialogTrigger>
      <DialogContent className="w-full max-w-3xl gap-0 p-0 sm:max-w-3xl">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Compare plans</DialogTitle>
          <DialogDescription>
            Switch anytime — unused credit rolls over to your wallet.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="w-1/4 px-6 py-4 text-left text-xs font-medium text-muted-foreground">
                  Plan
                </th>
                {SUB_PLANS.map((p) => {
                  const isCurrent = p.id === ACTIVE_SUBSCRIPTION.plan_id;
                  const isRecommended = p.id === recommendedId;
                  return (
                    <th
                      key={p.id}
                      className={cn(
                        "w-1/4 px-4 py-4 text-left align-top",
                        isCurrent && "bg-brand-subtle/40",
                      )}
                    >
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {p.title}
                          </span>
                          {isCurrent ? (
                            <Badge variant="brand" className="px-1.5">
                              Current
                            </Badge>
                          ) : isRecommended ? (
                            <Badge variant="info" className="px-1.5">
                              Recommended
                            </Badge>
                          ) : null}
                        </div>
                        <p className="font-mono text-xl font-medium tabular-nums text-foreground">
                          ${p.price}
                          <span className="ml-1 font-sans text-xs font-normal text-muted-foreground">
                            /mo
                          </span>
                        </p>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {FEATURE_MATRIX.map((row, i) => (
                <tr
                  key={row.label}
                  className={cn(i > 0 && "border-t border-border/60")}
                >
                  <td className="px-6 py-3 text-xs text-muted-foreground">
                    {row.label}
                  </td>
                  {row.values.map((v, j) => {
                    const planId = SUB_PLANS[j].id;
                    const isCurrent = planId === ACTIVE_SUBSCRIPTION.plan_id;
                    return (
                      <td
                        key={j}
                        className={cn(
                          "px-4 py-3 text-foreground",
                          isCurrent && "bg-brand-subtle/40",
                        )}
                      >
                        <FeatureCell value={v} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border">
                <td className="px-6 py-4" />
                {SUB_PLANS.map((p) => {
                  const isCurrent = p.id === ACTIVE_SUBSCRIPTION.plan_id;
                  const isRecommended = p.id === recommendedId;
                  return (
                    <td
                      key={p.id}
                      className={cn(
                        "px-4 py-4",
                        isCurrent && "bg-brand-subtle/40",
                      )}
                    >
                      {isCurrent ? (
                        <Button
                          disabled
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          Current plan
                        </Button>
                      ) : (
                        <Button
                          variant={isRecommended ? "brand" : "outline"}
                          size="sm"
                          className="w-full"
                        >
                          Switch
                        </Button>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FeatureCell({ value }: { value: React.ReactNode }) {
  if (value === true) {
    return (
      <Check
        aria-label="Included"
        className="size-3.5 text-success-dark"
      />
    );
  }
  if (value === false) {
    return (
      <Minus
        aria-label="Not included"
        className="size-3.5 text-muted-foreground/60"
      />
    );
  }
  return <span className="font-mono text-sm tabular-nums">{value}</span>;
}

const TOPUP_PRESETS = [10, 25, 50, 100, 250, 500];
const TOPUP_DISCOUNTS: Record<number, number> = {
  100: 0.05,
  250: 0.08,
  500: 0.12,
};
const TOPUP_DEFAULT = 100;

function discountFor(amount: number): number {
  let bestKey = 0;
  for (const key of Object.keys(TOPUP_DISCOUNTS).map(Number)) {
    if (amount >= key && key > bestKey) bestKey = key;
  }
  return TOPUP_DISCOUNTS[bestKey] ?? 0;
}

function AddCreditsDialog() {
  const amount = TOPUP_DEFAULT;
  const discount = discountFor(amount);
  const charge = amount * (1 - discount);
  const newBalance = CURRENT_USER.balance + amount;

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Add credits
      </DialogTrigger>
      <DialogContent className="w-full max-w-2xl gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Add credit</DialogTitle>
          <DialogDescription>
            Charges processed by Stripe. Credit posts to your wallet immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="grid border-t border-border md:grid-cols-[minmax(0,1fr)_minmax(0,260px)]">
          <div className="flex flex-col gap-5 px-6 py-5">
            <div>
              <p className="text-xs font-medium text-foreground">Amount (USD)</p>
              <ToggleGroup
                defaultValue={[String(amount)]}
                variant="outline"
                spacing={2}
                className="mt-2 grid grid-cols-3 gap-2"
              >
                {TOPUP_PRESETS.map((v) => (
                  <ToggleGroupItem key={v} value={String(v)} className="h-11">
                    ${v}
                    {TOPUP_DISCOUNTS[v] ? (
                      <span className="ml-1 font-mono text-[10px] tabular-nums text-success-dark">
                        −{Math.round(TOPUP_DISCOUNTS[v] * 100)}%
                      </span>
                    ) : null}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <div className="mt-2.5 flex items-center gap-2">
                <Input
                  type="number"
                  defaultValue={amount}
                  min={5}
                  step={1}
                  className="max-w-32"
                />
                <span className="text-xs text-muted-foreground">
                  Custom, $5 minimum.
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">Pay with</p>
              <RadioGroup defaultValue="stripe" className="mt-2 flex flex-col gap-2">
                <FieldLabel htmlFor="receipt-stripe">
                  <Field orientation="horizontal">
                    <RadioGroupItem id="receipt-stripe" value="stripe" />
                    <FieldContent>
                      <FieldTitle>
                        <CreditCard
                          aria-hidden="true"
                          className="mr-1.5 size-4"
                        />
                        Stripe — Visa •••• 4242
                      </FieldTitle>
                    </FieldContent>
                  </Field>
                </FieldLabel>
                <FieldLabel htmlFor="receipt-wire" data-disabled="true">
                  <Field orientation="horizontal">
                    <RadioGroupItem id="receipt-wire" value="wire" disabled />
                    <FieldContent>
                      <FieldTitle>
                        <Sparkles
                          aria-hidden="true"
                          className="mr-1.5 size-4"
                        />
                        Wire transfer
                      </FieldTitle>
                      <FieldDescription>Scale plan only</FieldDescription>
                    </FieldContent>
                  </Field>
                </FieldLabel>
              </RadioGroup>
            </div>
          </div>
          <div className="border-t border-border bg-muted/30 px-6 py-5 md:border-t-0 md:border-l">
            <p className="text-[11px] font-medium tracking-[0.07em] text-muted-foreground uppercase">
              Receipt preview
            </p>
            <dl className="mt-4 flex flex-col gap-2 font-mono text-sm tabular-nums">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="font-sans text-xs text-muted-foreground">
                  Credit added
                </dt>
                <dd className="text-foreground">{fmtMoney(amount)}</dd>
              </div>
              {discount ? (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="font-sans text-xs text-muted-foreground">
                    Volume discount
                  </dt>
                  <dd className="text-success-dark">
                    −{fmtMoney(amount - charge)}
                  </dd>
                </div>
              ) : null}
              <div className="border-t border-dashed border-border pt-2" />
              <div className="flex items-baseline justify-between gap-3">
                <dt className="font-sans text-xs font-medium text-foreground">
                  You pay
                </dt>
                <dd className="text-base font-medium text-foreground">
                  {fmtMoney(charge)}
                </dd>
              </div>
              <div className="border-t border-dashed border-border pt-2" />
              <div className="flex items-baseline justify-between gap-3">
                <dt className="font-sans text-xs text-muted-foreground">
                  New balance
                </dt>
                <dd className="text-foreground">{fmtMoney(newBalance)}</dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-border px-6 py-5">
          <Link
            href="/console/topup/checkout"
            className={cn(
              buttonVariants({ variant: "brand", size: "lg" }),
              "w-full",
            )}
          >
            Continue to checkout
            <ArrowRight aria-hidden="true" />
          </Link>
          <p className="text-center text-xs text-muted-foreground">
            You&rsquo;ll choose Card, Alipay, or WeChat Pay on the next step.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function fmtAbsDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(iso: string): number {
  const now = new Date("2026-05-10T12:00:00Z").getTime();
  const t = new Date(iso).getTime();
  return Math.max(0, Math.ceil((t - now) / 86_400_000));
}
