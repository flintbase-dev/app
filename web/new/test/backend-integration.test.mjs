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

test("checkout uses Stripe Elements instead of a mock checkout link", () => {
  const checkout = read("components/console/checkout-client.tsx");
  assert.match(checkout, /PaymentElement/);
  assert.match(checkout, /createStripeTopupSessionAction/);
  assert.doesNotMatch(checkout, /CURRENT_USER|CHECKOUT_REF|SUCCESS_REF/);
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

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === ".next" || name === "node_modules") return [];
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
