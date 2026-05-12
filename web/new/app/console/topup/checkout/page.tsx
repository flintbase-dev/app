import { notFound } from "next/navigation";
import { CheckoutClient } from "@/components/console/checkout-client";
import { loadTopupData } from "@/lib/console/data";

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
  const { plans, status, subscription, topupInfo, user } =
    await loadTopupData();
  const {
    amount: rawAmount = "",
    from_subscription_id: fromSubscriptionId = "",
    mode: rawMode = "purchase",
    plan_id: planId = "",
  } = await searchParams;
  const selectedPlan = planId ? plans.find((plan) => plan.id === planId) : null;
  if (planId && !selectedPlan) notFound();
  const checkoutMode = selectedPlan ? "subscription" : "topup";
  const minTopup = Math.max(1, Math.trunc(topupInfo.stripeMinTopup || 1));
  const amount = Math.max(Math.trunc(Number(rawAmount)) || minTopup, minTopup);
  const discount = discountMultiplier(topupInfo.discount, amount);
  const creditAmount = amount * topupInfo.topupGroupRatio;
  const topupSubtotal =
    amount * topupInfo.stripeUnitPrice * topupInfo.topupGroupRatio;
  const charge =
    checkoutMode === "subscription"
      ? subscriptionCharge(
          selectedPlan?.price ?? 0,
          plans,
          subscription.subscriptions,
          fromSubscriptionId,
          rawMode,
        )
      : topupSubtotal * discount;
  const discountAmount =
    checkoutMode === "topup" ? Math.max(0, topupSubtotal - charge) : 0;
  const newBalance = user.balance + creditAmount;
  const purchaseMode = rawMode === "switch" ? "switch" : "purchase";

  return (
    <CheckoutClient
      amount={amount}
      charge={charge}
      creditAmount={creditAmount}
      checkoutMode={checkoutMode}
      discountAmount={discountAmount}
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

function discountMultiplier(
  discount: Record<string, number>,
  amount: number,
): number {
  const value = discount[String(Math.trunc(amount))];
  return value > 0 ? value : 1;
}

function subscriptionCharge(
  selectedPlanPrice: number,
  plans: Awaited<ReturnType<typeof loadTopupData>>["plans"],
  subscriptions: Awaited<
    ReturnType<typeof loadTopupData>
  >["subscription"]["subscriptions"],
  fromSubscriptionId: string,
  rawMode: string,
): number {
  if (rawMode !== "switch" || !fromSubscriptionId) return selectedPlanPrice;
  const currentSubscription = subscriptions.find(
    (item) => item.id === fromSubscriptionId,
  );
  const currentPlan = plans.find(
    (plan) => plan.id === currentSubscription?.planId,
  );
  if (!currentPlan) return selectedPlanPrice;
  return Math.max(selectedPlanPrice - currentPlan.price, 0);
}
