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
  searchParams: Promise<{ amount?: string }>;
}) {
  const { status, topupInfo, user } = await loadTopupData();
  const { amount: rawAmount = "" } = await searchParams;
  const amount = Math.max(Number(rawAmount) || CHECKOUT_AMOUNT, 1);
  const discount = CHECKOUT_DISCOUNTS[amount] ?? 0;
  const charge = amount * (1 - discount);
  const newBalance = user.balance + amount;

  return (
    <CheckoutClient
      amount={amount}
      charge={charge}
      discount={discount}
      newBalance={newBalance}
      status={status}
      topupInfo={topupInfo}
      user={user}
    />
  );
}
