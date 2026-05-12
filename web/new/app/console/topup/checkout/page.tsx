import { notFound } from "next/navigation";
import { CheckoutClient } from "@/components/console/checkout-client";
import { loadTopupData } from "@/lib/console/data";

const CHECKOUT_AMOUNT = 100;
const CHECKOUT_DISCOUNTS: Record<number, number> = {
  100: 0.05,
  250: 0.08,
  500: 0.12,
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    amount?: string;
    from_subscription_id?: string;
    mode?: string;
    plan_id?: string;
  }>;
}) {
  const { plans, status, topupInfo, user } = await loadTopupData();
  const {
    amount: rawAmount = "",
    from_subscription_id: fromSubscriptionId = "",
    mode: rawMode = "purchase",
    plan_id: planId = "",
  } = await searchParams;
  const selectedPlan = planId ? plans.find((plan) => plan.id === planId) : null;
  if (planId && !selectedPlan) notFound();
  const checkoutMode = selectedPlan ? "subscription" : "topup";
  const amount = Math.max(Number(rawAmount) || CHECKOUT_AMOUNT, 1);
  const discount = CHECKOUT_DISCOUNTS[amount] ?? 0;
  const charge =
    checkoutMode === "subscription"
      ? Number(selectedPlan?.price || 0)
      : amount * (1 - discount);
  const newBalance = user.balance + amount;
  const purchaseMode = rawMode === "switch" ? "switch" : "purchase";

  return (
    <CheckoutClient
      amount={amount}
      charge={charge}
      checkoutMode={checkoutMode}
      discount={discount}
      newBalance={newBalance}
      status={status}
      subscription={
        selectedPlan
          ? {
              fromSubscriptionId,
              planId: selectedPlan.id,
              planTitle: selectedPlan.title,
              planTotal: selectedPlan.total,
              purchaseMode,
            }
          : undefined
      }
      topupInfo={topupInfo}
      user={user}
    />
  );
}
