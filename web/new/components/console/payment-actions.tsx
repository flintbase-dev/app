import { Lock } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TopupPayButton({
  amount,
  label,
  className,
}: {
  amount: number;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={`/console/topup/checkout?amount=${encodeURIComponent(String(amount))}`}
      className={cn(
        buttonVariants({ variant: "brand", size: "lg" }),
        className,
      )}
    >
      <Lock aria-hidden="true" />
      {label}
    </Link>
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
  return (
    <Link
      href={subscriptionCheckoutHref({ fromSubscriptionId, mode, planId })}
      className={cn(
        buttonVariants({
          variant: recommended ? "brand" : "outline",
          size: "sm",
        }),
        "w-full",
      )}
    >
      {mode === "switch" ? "Switch" : "Buy"}
    </Link>
  );
}

function subscriptionCheckoutHref({
  fromSubscriptionId,
  mode = "purchase",
  planId,
}: {
  fromSubscriptionId?: string;
  mode?: "purchase" | "switch";
  planId: string;
}) {
  const params = new URLSearchParams({
    mode,
    plan_id: planId,
  });
  if (fromSubscriptionId)
    params.set("from_subscription_id", fromSubscriptionId);
  return `/console/topup/checkout?${params.toString()}`;
}
