import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = new URL("..", import.meta.url).pathname;

test("runtime pages do not import console mock data", () => {
  const files = walk(join(ROOT, "app"))
    .concat(walk(join(ROOT, "components")))
    .filter((file) => file.endsWith(".tsx") || file.endsWith(".ts"));
  const offenders = files.filter((file) =>
    readFileSync(file, "utf8").includes("@/lib/console/mock"),
  );
  assert.deepEqual(offenders, []);
});

test("global search is backed by documented GraphQL operations", () => {
  const data = read("lib/console/data.ts");
  const docs = read("docs/global-search.md");
  for (const operation of [
    "pricing",
    "userLogs",
    "userTopups",
    "searchTokens",
  ]) {
    assert.match(data, new RegExp(`operation: "${operation}"`));
    assert.match(docs, new RegExp(operation));
  }
});

test("checkout uses Stripe Checkout Elements instead of mock checkout links", () => {
  const checkout = read("components/console/checkout-client.tsx");
  const classicCheckout = readRepo(
    "web/classic/src/components/topup/StripePaymentElement.jsx",
  );
  const newConfirmBlock = checkout.slice(
    checkout.indexOf("checkoutState.checkout.confirm"),
    checkout.indexOf("if (result.type"),
  );
  const classicConfirmBlock = classicCheckout.slice(
    classicCheckout.indexOf("actionsRef.current.confirm"),
    classicCheckout.indexOf("if (result?.type"),
  );
  const actions = read("components/console/payment-actions.tsx");
  assert.match(checkout, /CheckoutElementsProvider/);
  assert.match(checkout, /useCheckoutElements/);
  assert.match(checkout, /PaymentElement/);
  assert.match(checkout, /createStripeTopupSessionAction/);
  assert.match(checkout, /createSubscriptionStripeSessionAction/);
  assert.match(checkout, /const returnUrl = stripeReturnUrl\(\)/);
  assert.doesNotMatch(checkout, /confirmPayment/);
  assert.doesNotMatch(checkout, /paymentMethodType/);
  assert.match(checkout, /ContactDetailsElement/);
  assert.match(checkout, /BillingAddressElement/);
  assert.match(checkout, /display:\s*{\s*name:\s*"full"\s*}/);
  assert.match(classicCheckout, /createContactDetailsElement/);
  assert.match(classicCheckout, /createBillingAddressElement/);
  assert.match(classicCheckout, /display:\s*{\s*name:\s*'full'\s*}/);
  assert.match(checkout, /requires_customer_details/);
  assert.match(classicCheckout, /requires_customer_details/);
  assert.match(checkout, /!session\?\.customer_email/);
  assert.match(classicCheckout, /!session\?\.customer_email/);
  assert.doesNotMatch(checkout, /defaultValues:\s*{\s*email:/s);
  assert.doesNotMatch(classicCheckout, /defaultValues:\s*{\s*email:/s);
  assert.match(checkout, /onCompleteChange={setPaymentComplete}/);
  assert.match(checkout, /!paymentComplete/);
  assert.doesNotMatch(checkout, /customerEmail={user\.email}/);
  assert.doesNotMatch(checkout, /confirmArgs\.email/);
  assert.doesNotMatch(newConfirmBlock, /returnUrl:/);
  assert.doesNotMatch(classicCheckout, /confirmArgs\.email/);
  assert.doesNotMatch(classicConfirmBlock, /returnUrl:/);
  assert.doesNotMatch(checkout, /CURRENT_USER|CHECKOUT_REF|SUCCESS_REF/);
  assert.match(actions, /\/console\/topup\/checkout\?/);
  assert.doesNotMatch(actions, /createStripeTopupSessionAction/);
  assert.doesNotMatch(actions, /createSubscriptionStripeSessionAction/);
});

test("stripe checkout binds local payment orders before invoice fulfillment", () => {
  const topup = readRepo("controller/topup_stripe.go");
  const subscription = readRepo("controller/subscription_payment_stripe.go");
  const orderModel = readRepo("model/stripe_payment_order.go");
  const goMod = readRepo("go.mod");
  const schema = readRepo("migrations/001_initial_schema.sql");

  assert.match(orderModel, /type StripePaymentOrder struct/);
  assert.match(schema, /CREATE TABLE stripe_payment_orders/);
  assert.match(schema, /stripe_checkout_session_id VARCHAR\(128\)/);
  assert.match(schema, /stripe_invoice_id VARCHAR\(128\)/);

  assert.match(topup, /new_api_payment_order_id/);
  assert.match(topup, /stripe-go\/v85/);
  assert.match(topup, /CreatePendingStripePaymentOrder/);
  assert.match(topup, /UpdateStripePaymentOrderCheckoutRefs/);
  assert.match(topup, /InvoiceCreation/);
  assert.match(topup, /CompleteStripeInvoiceTopUp/);
  assert.match(topup, /data\.payments\.data\.payment/);
  assert.doesNotMatch(
    topup,
    /data\.payments\.data\.payment\.payment_intent\.latest_charge/,
  );
  assert.match(goMod, /github\.com\/stripe\/stripe-go\/v85 v85\.1\.0/);
  assert.match(
    readRepo("setting/payment_stripe.go"),
    /StripeAPIVersion = "2026-04-22\.dahlia"/,
  );

  assert.match(subscription, /CreatePendingStripePaymentOrder/);
  assert.match(subscription, /UpdateSubscriptionOrderStripeRefs/);
  assert.match(subscription, /payment_order_id/);

  const checkoutBackend = `${topup}\n${subscription}`;
  const checkoutCreate = topup.slice(
    topup.indexOf("func createStripeCheckoutPayment"),
    topup.indexOf("func ensureStripeCustomer"),
  );
  assert.match(checkoutBackend, /CheckoutSessionModePayment/);
  assert.match(checkoutCreate, /resolveStripeCheckoutCustomer/);
  assert.match(checkoutCreate, /Customer:\s*stripe\.String/);
  assert.match(checkoutCreate, /CustomerUpdate:/);
  assert.match(
    checkoutCreate,
    /CheckoutSessionBillingAddressCollectionRequired/,
  );
  assert.match(checkoutCreate, /RequiresCustomerDetails/);
  assert.doesNotMatch(checkoutCreate, /NameCollection/);
  assert.doesNotMatch(checkoutCreate, /name_collection/);
  assert.doesNotMatch(checkoutCreate, /CustomerCreation:/);
  assert.doesNotMatch(checkoutCreate, /ReceiptEmail:/);
  assert.doesNotMatch(checkoutBackend, /CheckoutSessionModeSubscription/);
  assert.doesNotMatch(checkoutBackend, /PaymentMethodTypes:/);
  assert.doesNotMatch(checkoutBackend, /SavedPaymentMethodOptions:/);
  assert.doesNotMatch(checkoutBackend, /SetupFutureUsage:/);
  assert.doesNotMatch(checkoutBackend, /SubmitType:/);
});

test("dev and prod can proxy GraphQL and data-plane API requests", () => {
  const config = read("next.config.ts");
  assert.match(config, /FLINT_BACKEND_BASE_URL/);
  assert.match(config, /FLINT_API_BASE_URL/);
  assert.match(config, /NEXT_PUBLIC_FLINT_API_BASE_URL/);
  assert.match(config, /\/api\/:path\*/);
  assert.match(config, /\/v1\/:path\*/);
});

test("server GraphQL client accepts the private backend base env", () => {
  const graphql = read("lib/api/graphql.ts");
  assert.match(graphql, /FLINT_BACKEND_BASE_URL/);
  assert.match(graphql, /FLINT_API_BASE_URL/);
  assert.match(graphql, /NEXT_PUBLIC_FLINT_API_BASE_URL/);
});

test("console layout redirects unauthenticated sessions to login", () => {
  const layout = read("app/console/layout.tsx");
  assert.match(layout, /from "next\/navigation"/);
  assert.match(layout, /redirect\(`\/login\?return_to=/);
  assert.match(layout, /isUnauthorizedConsoleError/);
  assert.match(layout, /no access token provided/);
});

test("admin sidebar links leave Next routing for classic-only pages", () => {
  const layout = read("app/console/layout.tsx");
  for (const path of [
    "/console/channel",
    "/console/models",
    "/console/redemption",
    "/console/user",
    "/console/subscription",
    "/console/message-management",
    "/console/setting",
  ]) {
    assert.match(layout, new RegExp(`href: "${path}"`));
  }
  const adminBlock = layout.slice(layout.indexOf("{adminItems.length"));
  assert.match(adminBlock, /<a\s+href={it\.href}/);
  assert.doesNotMatch(adminBlock, /<Link\s+href={it\.href}/);
});

test("WorkOS frontend callback forwards authorization code to backend callback", () => {
  const callback = read("app/workos/callback/page.tsx");
  assert.match(callback, /URLSearchParams\(\{ code, state \}\)/);
  assert.match(
    callback,
    /redirect\(`\/api\/workos\/callback\?\$\{params\.toString\(\)\}`\)/,
  );
  assert.match(callback, /redirect\("\/console"\)/);
});

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function readRepo(path) {
  return readFileSync(join(ROOT, "../..", path), "utf8");
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === ".next" || name === "node_modules") return [];
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
