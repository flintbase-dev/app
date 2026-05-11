"use client";

import { Lock } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  createStripeTopupSessionAction,
  createSubscriptionStripeSessionAction,
} from "@/lib/console/actions";

export function TopupPayButton({
  amount,
  paymentMethodType,
  label,
  className,
}: {
  amount: number;
  paymentMethodType: "card" | "alipay" | "wechat_pay";
  label: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="lg"
      disabled={pending}
      className={className}
      onClick={() => {
        startTransition(async () => {
          const session = await createStripeTopupSessionAction({
            amount,
            paymentMethodType,
          });
          const url = String(session.hosted_invoice_url || "");
          window.location.assign(url || "/console/topup/checkout/success");
        });
      }}
    >
      <Lock aria-hidden="true" />
      {label}
    </Button>
  );
}

export function SubscriptionPayButton({
  fromSubscriptionId,
  mode = "purchase",
  planId,
  recommended,
}: {
  fromSubscriptionId?: string;
  mode?: "purchase" | "switch";
  planId: string;
  recommended?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant={recommended ? "brand" : "outline"}
      size="sm"
      className="w-full"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const session = await createSubscriptionStripeSessionAction({
            fromSubscriptionId,
            mode,
            planId,
            paymentMethodType: "card",
          });
          const url = String(session.hosted_invoice_url || "");
          window.location.assign(url || "/console/topup/checkout/success");
        });
      }}
    >
      Switch
    </Button>
  );
}
