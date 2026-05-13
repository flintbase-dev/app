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
  assert.match(actions, /plan_id: planId/);
  assert.doesNotMatch(actions, /createStripeTopupSessionAction/);
  assert.doesNotMatch(actions, /createSubscriptionStripeSessionAction/);
});

test("wallet topup uses backend amounts, discounts, and site currency", () => {
  const page = read("app/console/topup/page.tsx");
  const dialog = read("components/console/add-credits-dialog.tsx");
  const checkoutPage = read("app/console/topup/checkout/page.tsx");
  const actions = read("lib/console/actions.ts");
  const data = read("lib/console/data.ts");
  const successPage = read("app/console/topup/checkout/success/page.tsx");
  const topupBackend = readRepo("controller/topup.go");
  const stripeBackend = readRepo("controller/topup_stripe.go");
  const router = readRepo("router/graphql_api.go");
  const classicOperations = readRepo(
    "web/classic/src/helpers/apiOperations.js",
  );

  assert.match(page, /topupInfo=\{topupInfo\}/);
  assert.match(page, /monthlyUsage/);
  assert.match(page, /usageMonthLabel/);
  assert.doesNotMatch(page, /MAY_USAGE|38\.42|Used in May 2026/);
  assert.match(dialog, /topupInfo\.amountOptions/);
  assert.match(dialog, /topupInfo\.discount/);
  assert.match(dialog, /topupInfo\.stripeUnitPrice/);
  assert.match(dialog, /topupInfo\.topupGroupRatio/);
  assert.match(dialog, /status\.quotaDisplayType/);
  assert.doesNotMatch(page, /TOPUP_PRESETS|TOPUP_DISCOUNTS|Amount \(USD\)/);
  assert.doesNotMatch(dialog, /Custom, \$5 minimum|\$\{value\}/);

  assert.match(checkoutPage, /topupInfo\.discount/);
  assert.match(checkoutPage, /topupInfo\.stripeUnitPrice/);
  assert.match(checkoutPage, /topupInfo\.topupGroupRatio/);
  assert.match(checkoutPage, /creditAmount=\{creditAmount\}/);
  assert.doesNotMatch(checkoutPage, /CHECKOUT_AMOUNT|CHECKOUT_DISCOUNTS/);

  assert.match(data, /stripeUnitPrice: toNumber\(item\.stripe_unit_price, 1\)/);
  assert.match(data, /topupGroupRatio: toNumber\(item\.topup_group_ratio, 1\)/);
  assert.match(
    data,
    /amount: toNumber\(item\.credit_units \|\| item\.amount\)/,
  );
  assert.match(data, /operation: "logsSelfStat"[\s\S]*alias: "monthlyUsage"/);
  assert.match(data, /loadStripeCheckoutResult/);
  assert.match(successPage, /RESULT_REFRESH_DELAY_MS = 2000/);
  assert.match(successPage, /loadStripeCheckoutResult\(sessionId\)/);
  assert.match(successPage, /Payment not completed/);
  assert.match(successPage, /Payment is processing/);
  assert.doesNotMatch(successPage, /invoices\.items\[0\]/);
  assert.match(topupBackend, /"stripe_unit_price":\s+setting\.StripeUnitPrice/);
  assert.match(topupBackend, /"topup_group_ratio":\s+topupGroupRatio/);
  assert.match(stripeBackend, /RequestStripeCheckoutResult/);
  assert.match(stripeBackend, /stripeCheckoutSessionResolvedStatus/);
  assert.match(router, /apiQuery\("stripeCheckoutResult"/);
  assert.match(classicOperations, /stripeCheckoutResult: 'query'/);
  assert.match(actions, /stripeBillingPortal[\s\S]*return_url: returnUrl/);
  assert.match(page, /type="submit"[\s\S]*Open portal/);
  assert.match(page, /type="submit"[\s\S]*Save preference/);
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
  assert.match(checkoutCreate, /UnitAmountDecimal/);
  assert.match(checkoutCreate, /Quantity:\s+stripe\.Int64\(quantity\)/);
  assert.match(checkoutCreate, /renderStripeCheckoutText/);
  assert.match(checkoutCreate, /StripeLineItemTemplate/);
  assert.match(checkoutCreate, /StripeMemoTemplate/);
  assert.match(checkoutCreate, /Description:\s+stripe\.String\(memo\)/);
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

test("classic admin exposes configurable Stripe line item and memo text", () => {
  const setting = readRepo("setting/payment_stripe.go");
  const optionModel = readRepo("model/option.go");
  const stripeSettings = readRepo(
    "web/classic/src/pages/Setting/Payment/SettingsPaymentGatewayStripe.jsx",
  );

  assert.match(setting, /StripeLineItemTemplate = "\{line_item\}"/);
  assert.match(setting, /StripeMemoTemplate = "\{description\}"/);
  assert.match(optionModel, /OptionMap\["StripeLineItemTemplate"\]/);
  assert.match(optionModel, /OptionMap\["StripeMemoTemplate"\]/);
  assert.match(optionModel, /case "StripeLineItemTemplate":/);
  assert.match(optionModel, /case "StripeMemoTemplate":/);
  assert.match(stripeSettings, /field='StripeLineItemTemplate'/);
  assert.match(stripeSettings, /field='StripeMemoTemplate'/);
  assert.match(stripeSettings, /key: 'StripeLineItemTemplate'/);
  assert.match(stripeSettings, /key: 'StripeMemoTemplate'/);
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
  assert.match(layout, /未登录/);
  assert.match(layout, /未登入/);
});

test("playground uses the cookie-authenticated playground endpoint", () => {
  const newPlayground = read("components/console/playground-client.tsx");
  const classicConstants = readRepo(
    "web/classic/src/constants/playground.constants.js",
  );
  const classicHook = readRepo(
    "web/classic/src/hooks/playground/useApiRequest.jsx",
  );
  const apiRouter = readRepo("router/api-router.go");
  const playgroundController = readRepo("controller/playground.go");

  assert.match(
    newPlayground,
    /PLAYGROUND_CHAT_COMPLETIONS_ENDPOINT\s*=\s*"\/api\/playground\/chat\/completions"/,
  );
  assert.doesNotMatch(newPlayground, /fetch\("\/v1\/chat\/completions"/);
  assert.doesNotMatch(newPlayground, /New-Api-User/);
  assert.match(newPlayground, /credentials:\s*"same-origin"/);

  assert.match(
    classicConstants,
    /CHAT_COMPLETIONS:\s*'\/api\/playground\/chat\/completions'/,
  );
  assert.doesNotMatch(
    classicConstants,
    /CHAT_COMPLETIONS:\s*'\/v1\/chat\/completions'/,
  );
  assert.doesNotMatch(classicHook, /New-Api-User/);
  assert.match(classicHook, /credentials:\s*'same-origin'/);
  assert.match(classicHook, /withCredentials:\s*true/);

  assert.match(apiRouter, /"\/playground\/chat\/completions"/);
  assert.match(apiRouter, /middleware\.UserAuth\(\)/);
  assert.match(apiRouter, /middleware\.SetupPlaygroundContext\(\)/);
  assert.match(
    apiRouter,
    /WithExcludedPaths\(\[]string\{"\/api\/playground\/chat\/completions"\}\)/,
  );
  assert.match(apiRouter, /controller\.Playground/);
  assert.match(playgroundController, /ContextKeyPlayground/);
  assert.match(playgroundController, /"\/v1\/chat\/completions"/);
});

test("protected POST forms use route-handler redirects after mutation", () => {
  const createPage = read("app/console/token/new/page.tsx");
  const tokenPage = read("app/console/token/page.tsx");
  const tokenEditPage = read("app/console/token/[id]/page.tsx");
  const redeemPage = read("app/console/topup/redeem/page.tsx");
  const actions = read("lib/console/actions.ts");
  const graphql = read("lib/api/graphql.ts");
  const redirects = read("lib/console/route-redirect.ts");

  assert.match(createPage, /action="\/console\/token\/actions\/create"/);
  assert.doesNotMatch(createPage, /createTokenAction/);
  assert.match(tokenPage, /action="\/console\/token\/actions\/delete-batch"/);
  assert.doesNotMatch(tokenPage, /deleteTokensAction/);
  assert.match(tokenPage, /action="\/console\/token\/actions\/toggle"/);
  assert.doesNotMatch(tokenPage, /toggleTokenStatusAction/);
  assert.match(tokenPage, /action="\/console\/token\/actions\/delete"/);
  assert.doesNotMatch(tokenPage, /deleteTokenAction/);
  assert.match(tokenEditPage, /action="\/console\/token\/actions\/update"/);
  assert.doesNotMatch(tokenEditPage, /updateTokenAction/);
  assert.match(tokenEditPage, /action="\/console\/token\/actions\/toggle"/);
  assert.doesNotMatch(tokenEditPage, /toggleTokenStatusAction/);
  assert.match(tokenEditPage, /action="\/console\/token\/actions\/delete"/);
  assert.doesNotMatch(tokenEditPage, /deleteTokenAction/);
  assert.match(redeemPage, /action="\/console\/topup\/redeem\/actions"/);
  assert.doesNotMatch(redeemPage, /redeemCodeAction/);
  assert.doesNotMatch(actions, /createTokenAction|updateTokenAction/);
  assert.doesNotMatch(
    actions,
    /toggleTokenStatusAction|deleteTokenAction|deleteTokensAction/,
  );
  assert.doesNotMatch(actions, /redeemCodeAction/);

  for (const route of [
    "app/console/token/actions/create/route.ts",
    "app/console/token/actions/delete/route.ts",
    "app/console/token/actions/delete-batch/route.ts",
    "app/console/token/actions/toggle/route.ts",
    "app/console/token/actions/update/route.ts",
    "app/console/topup/redeem/actions/route.ts",
  ]) {
    const source = read(route);
    assert.match(source, /graphqlMutationFromRequest/);
    assert.match(source, /redirect(?:To|Back)\(request,/);
  }
  assert.match(graphql, /graphqlMutationFromRequest/);
  assert.match(graphql, /request\.headers/);
  assert.match(redirects, /NextResponse\.redirect/);
  assert.match(redirects, /, 303\)/);
  assert.match(redirects, /x-forwarded-host/);
  assert.match(redirects, /x-forwarded-proto/);
  assert.doesNotMatch(redirects, /new URL\(path,\s*request\.url\)/);
  assert.doesNotMatch(redirects, /new URL\(fallbackPath,\s*request\.url\)/);
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

test("classic route guards restore session-cookie users before login redirect", () => {
  const auth = readRepo("web/classic/src/helpers/auth.jsx");
  assert.match(
    auth,
    /API\.query\('self', \{\}, \{ skipErrorHandler: true \}\)/,
  );
  assert.match(
    auth,
    /localStorage\.setItem\('user', JSON\.stringify\(data\)\)/,
  );
  assert.match(auth, /userDispatch\(\{ type: 'login', payload: data \}\)/);
  assert.match(auth, /setLoading\(true\)/);
  assert.match(auth, /<Navigate to='\/login'/);
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
