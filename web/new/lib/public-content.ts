export type Broadcast = {
  id: number;
  title: string;
  content: string;
  sent_at: string;
};

export const BROADCASTS: Broadcast[] = [
  {
    id: 5012,
    title: "Scheduled maintenance · 2026-05-15",
    sent_at: "2026-05-09T16:00:00Z",
    content: `We will perform a rolling restart of the inference fleet on **2026-05-15 from 02:00–02:30 UTC**.

Requests in-flight will be retried up to 3 times. No action required on your part.

Affected surfaces:
- Inference data plane (\`/v1/chat/completions\`, \`/v1/messages\`, \`/v1/responses\`)
- Image generation (\`/v1/images\`) — paused 02:05–02:20 UTC

If you have questions, reach out via the support channel.`,
  },
  {
    id: 5009,
    title: "New model: claude-opus-4-7 is now generally available",
    sent_at: "2026-05-02T12:00:00Z",
    content: `Anthropic's \`claude-opus-4-7\` is now GA on Flint.

**Pricing**
- Input: $15.00 per 1M tokens
- Output: $75.00 per 1M tokens
- Context window: 200K tokens

See the [pricing page](/pricing) for the full catalog.`,
  },
  {
    id: 4998,
    title: "API change: /v1/responses/compact is now stable",
    sent_at: "2026-04-15T18:00:00Z",
    content: `The compact responses preview ended on 2026-04-15. The endpoint is now stable.

Existing client behavior is unchanged. Compact responses remain opt-in via the \`response_format: "compact"\` field.`,
  },
  {
    id: 4982,
    title: "Region expansion: eu-west-1 available for premium group",
    sent_at: "2026-03-28T10:30:00Z",
    content: `EU-west-1 is now available for tokens in the **premium** group.

To use it, set the \`X-Flint-Region: eu-west-1\` header on requests. Latency from Frankfurt is 18ms median.`,
  },
  {
    id: 4965,
    title: "Deprecation: legacy /v0/* endpoints retire 2026-06-30",
    sent_at: "2026-03-12T15:00:00Z",
    content: `The legacy \`/v0/*\` endpoints will be removed on **2026-06-30**.

Migrate to the \`/v1/*\` family. Most calls are drop-in compatible; see the [migration guide](https://docs.flint.dev/migrate).`,
  },
  {
    id: 4940,
    title: "Welcome to Flint",
    sent_at: "2026-02-01T09:00:00Z",
    content: `Flint is live. One base URL, one API key, every modern model.

To get started:
1. Issue an API key from \`/console/token\`.
2. Point your client at \`https://api.flint.dev\`.
3. Call any supported endpoint.

The API is OpenAI-compatible — no client changes required.`,
  },
];

export const ABOUT_CONTENT = `Flint is a developer-first AI inference platform. We route requests across the major model vendors — Anthropic, OpenAI, Google, Meta, Mistral, DeepSeek — through a single OpenAI-compatible base URL.

We exist because shipping a product against three different SDKs, three different billing systems, and three different uptime guarantees is no way to build software. Flint is the layer that makes the upstream identity not your problem.

## What we run

- An OpenAI-compatible data plane at \`api.flint.dev\`.
- A control plane for keys, wallets, logs, and routing groups.
- A playground for testing models and parameters interactively.
- Per-request billing in USD with no minimum commitment.

## What we don't do

We do not train models. We do not store your prompts beyond the retention window required for debugging and abuse mitigation. We do not sell, rent, or trade the contents of your requests.

## Open source

The Flint web console is open source under the MIT license. Bug reports and pull requests are welcome at \`github.com/flint-dev/flint\`.

## Contact

For account, billing, and technical questions: \`support@flint.dev\`.
For security disclosures: \`security@flint.dev\` (PGP available on request).
For press and partnerships: \`hello@flint.dev\`.`;

export const USER_AGREEMENT = `_Last updated: 2026-03-12_

These Terms of Service ("Terms") govern your access to and use of Flint. By creating an account or making a request against the Flint API, you agree to these Terms.

## 1. The service

Flint provides programmatic access to third-party language and image models through a unified API. You are responsible for the prompts you send and the outputs you receive. Flint does not own or control upstream model behavior.

## 2. Your account

You must provide accurate registration information and keep your API keys secret. You are liable for all activity under your account, including requests made by tokens you have issued.

## 3. Acceptable use

You may not use Flint to:
- Generate or distribute illegal content, including CSAM and content that violates intellectual property law.
- Build systems that meaningfully impersonate a real person without their explicit consent.
- Attempt to extract model weights, training data, or other proprietary information from upstream providers.
- Circumvent rate limits, billing, or access controls.

Violations may result in immediate suspension. Repeated or severe violations result in termination.

## 4. Fees and billing

Fees are denominated in USD and deducted from your wallet balance per request. Pricing is published at \`/pricing\` and may change with 30 days notice for existing customers.

Wallet top-ups are non-refundable except as required by applicable law. Disputed charges should be raised within 60 days of the transaction.

## 5. Service availability

Flint targets 99.9% monthly uptime on the data plane. We do not guarantee availability and do not provide SLA credits except under enterprise agreements.

## 6. Termination

You may terminate your account at any time. We may terminate or suspend your account for breach of these Terms, for non-payment, or to comply with applicable law.

## 7. Disclaimers

Flint is provided "as is" without warranties of any kind. We are not liable for indirect, incidental, or consequential damages.

## 8. Governing law

These Terms are governed by the laws of the State of Delaware. Disputes will be resolved by binding arbitration in San Francisco, California.

## 9. Changes

We may update these Terms from time to time. Material changes will be announced via the broadcast channel and email at least 30 days before they take effect.`;

export const PRIVACY_POLICY = `_Last updated: 2026-03-12_

This Privacy Policy describes what information Flint collects, how we use it, and the choices you have.

## What we collect

**Account data.** Your email, display name, and authentication provider identity (via WorkOS). We do not store passwords directly.

**Request metadata.** Token id, model name, endpoint, prompt and completion token counts, latency, status, and the IP address the request came from. This is retained for 90 days for debugging, abuse prevention, and billing.

**Request bodies.** Prompts and completions are retained only when required for abuse mitigation (up to 30 days) or when you opt in to longer retention. Bodies are not used for model training.

**Billing data.** Payment metadata (last 4 digits of card, billing country) is held by our payment processor (Stripe). We do not store full card numbers.

## How we use it

- To operate the service: routing requests, deducting wallet balance, sending operational notices.
- To prevent abuse: detecting credential stuffing, prompt-injection attacks, and policy violations.
- To improve the service: aggregated, de-identified metrics on latency, error rates, and model performance.

We do not sell your data. We do not share request bodies with third parties except the upstream model provider necessary to fulfill your request.

## Your choices

You can:
- Disable IP logging in \`/console/personal\`.
- Request export or deletion of your account data via \`support@flint.dev\`.
- Opt out of operational email by toggling the corresponding preference in your account.

## Data residency

Default routing is in \`us-east-1\`. Premium-group customers can pin requests to \`eu-west-1\`. We do not currently offer data residency guarantees in other regions.

## Third parties

We rely on:
- **WorkOS** for authentication.
- **Stripe** for payment processing.
- Upstream model vendors (Anthropic, OpenAI, Google, Meta, Mistral, DeepSeek) to fulfill inference requests.

Each operates under their own privacy policy.

## Security disclosure

Report vulnerabilities to \`security@flint.dev\`. We acknowledge in-scope reports within 72 hours and credit reporters in our public security log.

## Changes

We will notify you of material changes via the broadcast channel and email at least 30 days before they take effect.`;

export const PROJECT_LINKS = {
  github: "https://github.com/flint-dev/flint",
  license: "MIT",
  copyright: `© ${new Date().getFullYear()} Flint Labs, Inc.`,
};
