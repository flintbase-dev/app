"use client";

import { loadStripe } from "@stripe/stripe-js";
import { CreditCard, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  teamStripeAmountAction,
  teamStripeBillingPortalAction,
  teamStripePayAction,
} from "@/lib/console/actions";
import { fmtMoney } from "@/lib/console/format";
import type { ConsoleStatus } from "@/lib/console/types";

type CheckoutSession = {
  publishable_key?: string;
  client_secret?: string;
  payment_order_id?: string;
  checkout_session_id?: string;
  requires_customer_details?: boolean;
  customer_email?: string;
};

type CheckoutSdk = {
  loadActions: () => Promise<
    | { type: "error"; error?: { message?: string } }
    | {
        type: "success";
        actions: {
          confirm: (args: { redirect: "if_required" }) => Promise<unknown>;
        };
      }
  >;
  createPaymentElement: (options: Record<string, unknown>) => {
    mount: (target: HTMLElement | null) => void;
    destroy: () => void;
    on: (
      event: "change",
      handler: (payload: { complete?: boolean }) => void,
    ) => void;
  };
};

const stripeCache = new Map<string, ReturnType<typeof loadStripe>>();

function getStripe(key: string) {
  if (!stripeCache.has(key)) stripeCache.set(key, loadStripe(key));
  return stripeCache.get(key);
}

export function TeamBillingClient({
  teamId,
  status,
}: {
  teamId: string;
  status: ConsoleStatus;
}) {
  const [amount, setAmount] = useState("5");
  const [charge, setCharge] = useState(0);
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [message, setMessage] = useState("");
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [pending, startTransition] = useTransition();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const elementRef = useRef<ReturnType<
    CheckoutSdk["createPaymentElement"]
  > | null>(null);
  const actionsRef = useRef<{
    confirm: (args: { redirect: "if_required" }) => Promise<unknown>;
  } | null>(null);

  useEffect(() => {
    const numeric = Number(amount || 0);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    startTransition(async () => {
      try {
        setCharge(await teamStripeAmountAction(teamId, numeric));
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Unable to calculate charge",
        );
      }
    });
  }, [amount, teamId]);

  useEffect(() => {
    let cancelled = false;
    async function mount() {
      if (!session?.publishable_key || !session?.client_secret) return;
      const stripe = await getStripe(session.publishable_key);
      if (!stripe || cancelled) return;
      const checkout = stripe.initCheckoutElementsSdk({
        clientSecret: session.client_secret,
        elementsOptions: { appearance: { theme: "stripe" } },
      }) as CheckoutSdk;
      const loaded = await checkout.loadActions();
      if (cancelled) return;
      if (loaded.type === "error") {
        setMessage(
          loaded.error?.message || "Stripe checkout failed to initialize",
        );
        return;
      }
      const element = checkout.createPaymentElement({ layout: "accordion" });
      element.on("change", (event) =>
        setPaymentComplete(Boolean(event.complete)),
      );
      element.mount(mountRef.current);
      elementRef.current = element;
      actionsRef.current = loaded.actions;
    }
    mount();
    return () => {
      cancelled = true;
      elementRef.current?.destroy();
      elementRef.current = null;
      actionsRef.current = null;
    };
  }, [session?.client_secret, session?.publishable_key]);

  const startPayment = () => {
    startTransition(async () => {
      setMessage("");
      setPaymentComplete(false);
      const numeric = Number(amount || 0);
      if (!Number.isFinite(numeric) || numeric <= 0) {
        setMessage("Enter a valid amount greater than 0.");
        return;
      }
      try {
        const next = await teamStripePayAction(
          teamId,
          numeric,
          `${globalThis.location.origin}/teams/${teamId}/console/settings?session_id={CHECKOUT_SESSION_ID}`,
        );
        setSession(next || null);
      } catch (error) {
        setSession(null);
        setMessage(
          error instanceof Error ? error.message : "Unable to start payment",
        );
      }
    });
  };

  const confirmPayment = () => {
    startTransition(async () => {
      try {
        if (!actionsRef.current) {
          setMessage("Payment form is not ready.");
          return;
        }
        const result = await actionsRef.current.confirm({
          redirect: "if_required",
        });
        setMessage(
          result
            ? "Payment submitted. Billing will refresh after Stripe confirms it."
            : "Payment was not submitted.",
        );
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Payment confirmation failed",
        );
      }
    });
  };

  const openPortal = () => {
    startTransition(async () => {
      try {
        const url = await teamStripeBillingPortalAction(
          teamId,
          globalThis.location.href,
        );
        if (url) {
          globalThis.location.assign(url);
          return;
        }
        setMessage("Billing portal is not available.");
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to open billing portal",
        );
      }
    });
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Add Team credits</p>
            <p className="font-mono text-xs text-muted-foreground">
              Estimated charge {fmtMoney(charge, status)}
            </p>
          </div>
          <Button variant="outline" type="button" onClick={openPortal}>
            <ExternalLink aria-hidden="true" />
            Stripe portal
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="w-40"
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <Button
            type="button"
            variant="brand"
            disabled={pending}
            onClick={startPayment}
          >
            <CreditCard aria-hidden="true" />
            Pay with Stripe
          </Button>
        </div>
        {session ? (
          <div ref={mountRef} className="rounded-md border border-border p-3" />
        ) : null}
        {session ? (
          <Button
            type="button"
            variant="brand"
            disabled={pending || !paymentComplete}
            onClick={confirmPayment}
          >
            Confirm payment
          </Button>
        ) : null}
        {message ? (
          <p className="text-sm text-muted-foreground">{message}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
