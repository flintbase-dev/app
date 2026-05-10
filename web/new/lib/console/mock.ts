export type ConsoleUser = {
  id: number;
  username: string;
  display_name: string;
  email: string;
  workos_id: string;
  workos_org_id: string;
  auth_method: "Google · Workspace" | "Email" | "GitHub";
  role: "user" | "admin" | "root";
  group: string;
  balance: number; // USD
  used: number; // USD lifetime
  request_count: number;
  language: "en" | "zh-CN" | "zh-TW" | "fr" | "ru" | "ja" | "vi";
  quota_warning_threshold: number;
  upstream_model_update_notify_enabled: boolean;
  accept_unset_model_price_model: boolean;
  record_ip_log: boolean;
  app_access_token: string;
};

export const CURRENT_USER: ConsoleUser = {
  id: 1042,
  username: "kai_n",
  display_name: "Kai Nordherd",
  email: "kai@nordherd.dev",
  workos_id: "user_01HQM3RZ7EJ5NCXR4VQK9B8WY2",
  workos_org_id: "org_01HQM3KQXB2TD9N5YPK7C2ZJVM",
  auth_method: "Google · Workspace",
  role: "user",
  group: "default",
  balance: 124.7813,
  used: 482.6212,
  request_count: 18_429,
  language: "en",
  quota_warning_threshold: 5,
  upstream_model_update_notify_enabled: true,
  accept_unset_model_price_model: false,
  record_ip_log: true,
  app_access_token: "flint_at_5fH3kQzPwYvNxJrLgMtBcD",
};

export type Token = {
  id: number;
  name: string;
  status: 1 | 2; // 1 enabled, 2 disabled
  group: string;
  cross_group_retry: boolean;
  expired_at: string | null; // ISO or null = never
  created_at: string;
  remain_amount: number;
  unlimited_quota: boolean;
  used: number;
  last_used_at: string | null;
  model_limits: string[]; // model ids
  allow_ips: string[];
  key_preview: string; // last chars
  key_full: string; // mock secret
};

export const TOKENS: Token[] = [
  {
    id: 81,
    name: "production-api",
    status: 1,
    group: "default",
    cross_group_retry: true,
    expired_at: null,
    created_at: "2026-02-12T09:14:00Z",
    remain_amount: 250.0,
    unlimited_quota: false,
    used: 187.42,
    last_used_at: "2026-05-10T11:32:14Z",
    model_limits: [],
    allow_ips: ["10.0.0.0/8", "172.16.0.0/12"],
    key_preview: "•••• 7c4f",
    key_full: "sk-FlntKai9pLqXrYz3M7TbU2WvN5BcD8eF1gHj4kRsA6t7c4f",
  },
  {
    id: 80,
    name: "staging",
    status: 1,
    group: "default",
    cross_group_retry: true,
    expired_at: "2026-09-01T00:00:00Z",
    created_at: "2026-03-04T14:02:00Z",
    remain_amount: 50.0,
    unlimited_quota: false,
    used: 23.18,
    last_used_at: "2026-05-09T22:48:00Z",
    model_limits: ["claude-haiku-4-5", "gpt-5-mini"],
    allow_ips: [],
    key_preview: "•••• a91e",
    key_full: "sk-FlntKai2bC8dE7fG4hJ1kL5mN3pQ6rS9tU0vW2xY8zAa91e",
  },
  {
    id: 78,
    name: "dev-laptop",
    status: 1,
    group: "default",
    cross_group_retry: false,
    expired_at: null,
    created_at: "2026-04-16T08:30:00Z",
    remain_amount: 0,
    unlimited_quota: true,
    used: 4.81,
    last_used_at: "2026-05-10T08:51:11Z",
    model_limits: [],
    allow_ips: [],
    key_preview: "•••• 1b23",
    key_full: "sk-FlntKaiZ9yW8vU7tS6rP5qO4nM3lK2jI1hG0fE9dC8bA1b23",
  },
  {
    id: 75,
    name: "ci-runner",
    status: 2,
    group: "default",
    cross_group_retry: false,
    expired_at: "2026-04-30T00:00:00Z",
    created_at: "2026-02-01T00:00:00Z",
    remain_amount: 0,
    unlimited_quota: false,
    used: 12.05,
    last_used_at: "2026-04-29T19:00:00Z",
    model_limits: [],
    allow_ips: [],
    key_preview: "•••• d4e2",
    key_full: "sk-FlntKaiM3nB2vC1xZ9yW8aQ7sE6rT5dF4gH3jK2lP0iO9d4e2",
  },
];

export const GROUPS = [
  { name: "default", ratio: 1.0, label: "Default" },
  { name: "premium", ratio: 0.85, label: "Premium" },
  { name: "fast", ratio: 1.1, label: "Fast" },
  { name: "open", ratio: 1.0, label: "Open weights" },
];

export const USER_MODELS = [
  "claude-opus-4-7",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
  "gpt-5",
  "gpt-5-mini",
  "gpt-5-nano",
  "gemini-2-pro",
  "gemini-2-flash",
  "llama-4-405b",
  "llama-4-70b",
  "mistral-large-2",
  "deepseek-v3",
];

export type LogCategory = "usage" | "error" | "security" | "activity";

export type LogEntry = {
  id: number;
  category: LogCategory;
  ts: string;
  token_name: string;
  model: string;
  group: string;
  endpoint: string;
  request_id: string;
  prompt_tokens: number;
  completion_tokens: number;
  cached_tokens: number;
  cost: number; // USD
  latency_ms: number;
  channel: string;
  status: "ok" | "fail" | "warn";
  message?: string;
  ip?: string;
};

export const LOGS: LogEntry[] = [
  {
    id: 90123,
    category: "usage",
    ts: "2026-05-10T11:32:14Z",
    token_name: "production-api",
    model: "claude-sonnet-4-6",
    group: "default",
    endpoint: "/v1/messages",
    request_id: "req_01HXM7KZQA3R2B5VPN8C6T9YDF",
    prompt_tokens: 1247,
    completion_tokens: 318,
    cached_tokens: 800,
    cost: 0.00891,
    latency_ms: 1820,
    channel: "anthropic-prod-2",
    status: "ok",
    ip: "10.0.4.18",
  },
  {
    id: 90122,
    category: "usage",
    ts: "2026-05-10T11:31:51Z",
    token_name: "production-api",
    model: "gpt-5",
    group: "default",
    endpoint: "/v1/chat/completions",
    request_id: "req_01HXM7KKE9T7B3X5VNR6P2Q8AC",
    prompt_tokens: 412,
    completion_tokens: 1604,
    cached_tokens: 0,
    cost: 0.02612,
    latency_ms: 6210,
    channel: "openai-prod",
    status: "ok",
    ip: "10.0.4.18",
  },
  {
    id: 90121,
    category: "error",
    ts: "2026-05-10T11:30:02Z",
    token_name: "staging",
    model: "claude-opus-4-7",
    group: "default",
    endpoint: "/v1/messages",
    request_id: "req_01HXM7JQR6V4W3T2P0X8B5N9KL",
    prompt_tokens: 0,
    completion_tokens: 0,
    cached_tokens: 0,
    cost: 0,
    latency_ms: 412,
    channel: "anthropic-prod-1",
    status: "fail",
    message: "rate_limit_exceeded: 429 from upstream after 3 retries",
    ip: "10.0.4.18",
  },
  {
    id: 90120,
    category: "usage",
    ts: "2026-05-10T11:28:44Z",
    token_name: "production-api",
    model: "claude-haiku-4-5",
    group: "default",
    endpoint: "/v1/messages",
    request_id: "req_01HXM7HZT5MA1NV9X4P7C8R3DE",
    prompt_tokens: 86,
    completion_tokens: 240,
    cached_tokens: 0,
    cost: 0.00103,
    latency_ms: 312,
    channel: "anthropic-prod-2",
    status: "ok",
    ip: "10.0.4.18",
  },
  {
    id: 90119,
    category: "usage",
    ts: "2026-05-10T11:27:12Z",
    token_name: "dev-laptop",
    model: "gemini-2-flash",
    group: "default",
    endpoint: "/v1/chat/completions",
    request_id: "req_01HXM7H6X3K2P5N8B1V4T6QYZA",
    prompt_tokens: 220,
    completion_tokens: 410,
    cached_tokens: 0,
    cost: 0.00056,
    latency_ms: 1050,
    channel: "google-prod",
    status: "ok",
    ip: "192.168.1.24",
  },
  {
    id: 90118,
    category: "usage",
    ts: "2026-05-10T11:24:01Z",
    token_name: "production-api",
    model: "deepseek-v3",
    group: "default",
    endpoint: "/v1/chat/completions",
    request_id: "req_01HXM7G2Y8R4D1WP3MT9NV5LQ6",
    prompt_tokens: 3804,
    completion_tokens: 980,
    cached_tokens: 0,
    cost: 0.00211,
    latency_ms: 4140,
    channel: "deepseek-prod",
    status: "ok",
    ip: "10.0.4.18",
  },
  {
    id: 90117,
    category: "security",
    ts: "2026-05-10T11:18:33Z",
    token_name: "—",
    model: "—",
    group: "—",
    endpoint: "/v1/chat/completions",
    request_id: "req_01HXM7EHA9D2X6P5BV3KQ8C1WT",
    prompt_tokens: 0,
    completion_tokens: 0,
    cached_tokens: 0,
    cost: 0,
    latency_ms: 22,
    channel: "—",
    status: "warn",
    message: "blocked: ip 203.0.113.41 not in token allowlist",
    ip: "203.0.113.41",
  },
  {
    id: 90116,
    category: "activity",
    ts: "2026-05-10T10:02:00Z",
    token_name: "—",
    model: "—",
    group: "—",
    endpoint: "—",
    request_id: "—",
    prompt_tokens: 0,
    completion_tokens: 0,
    cached_tokens: 0,
    cost: 0,
    latency_ms: 0,
    channel: "—",
    status: "ok",
    message: "logged in via Google · Workspace from 10.0.4.18",
    ip: "10.0.4.18",
  },
];

export type Message = {
  id: number;
  item_type: "message" | "broadcast";
  title: string;
  content: string; // markdown
  created_at: string;
  read_at: string | null;
  preview: string;
};

export const MESSAGES: Message[] = [
  {
    id: 5012,
    item_type: "broadcast",
    title: "Scheduled maintenance · 2026-05-15",
    content:
      "We will perform a rolling restart of the inference fleet on **2026-05-15 from 02:00–02:30 UTC**. Requests in-flight will be retried up to 3 times. No action required on your part.\n\nIf you have questions, reach out via the support channel.",
    created_at: "2026-05-09T16:00:00Z",
    read_at: null,
    preview:
      "We will perform a rolling restart of the inference fleet on 2026-05-15 from 02:00–02:30 UTC…",
  },
  {
    id: 5011,
    item_type: "message",
    title: "Your balance dropped below $5.00",
    content:
      "Your **wallet balance** is now $4.82 — below your warning threshold of $5.00.\n\nTop up via [/console/topup/charge](/console/topup/charge) to avoid request failures.",
    created_at: "2026-05-08T03:11:00Z",
    read_at: "2026-05-08T07:40:00Z",
    preview:
      "Your wallet balance is now $4.82 — below your warning threshold of $5.00.",
  },
  {
    id: 5009,
    item_type: "broadcast",
    title: "New model: claude-opus-4-7 is now generally available",
    content:
      "Anthropic's `claude-opus-4-7` is now GA on Flint. Pricing is $15.00 / $75.00 per 1M input/output tokens.\n\nSee the [pricing page](/pricing) for details.",
    created_at: "2026-05-02T12:00:00Z",
    read_at: "2026-05-02T13:14:00Z",
    preview:
      "Anthropic's claude-opus-4-7 is now GA on Flint. Pricing is $15.00 / $75.00 per 1M tokens…",
  },
  {
    id: 5004,
    item_type: "message",
    title: "Your subscription renewed",
    content:
      "Your **Builder** subscription renewed on 2026-04-28. The next billing date is 2026-05-28.",
    created_at: "2026-04-28T10:00:00Z",
    read_at: "2026-04-28T11:30:00Z",
    preview: "Your Builder subscription renewed on 2026-04-28.",
  },
  {
    id: 4998,
    item_type: "broadcast",
    title: "API change: /v1/responses/compact preview ended",
    content:
      "The compact responses preview ended on 2026-04-15. The endpoint is now stable; existing client behavior is unchanged.",
    created_at: "2026-04-15T18:00:00Z",
    read_at: "2026-04-16T09:00:00Z",
    preview: "The compact responses preview ended on 2026-04-15…",
  },
];

export type SubPlan = {
  id: number;
  title: string;
  subtitle: string;
  price: number; // monthly USD
  total: number; // included USD credit
  duration: string; // human readable
  reset: string;
  upgrade_group: string;
};

export const SUB_PLANS: SubPlan[] = [
  {
    id: 1,
    title: "Builder",
    subtitle: "For solo developers and weekend projects.",
    price: 20,
    total: 25,
    duration: "month",
    reset: "monthly",
    upgrade_group: "default",
  },
  {
    id: 2,
    title: "Team",
    subtitle: "Shared credit pool. Cross-group retries enabled.",
    price: 100,
    total: 130,
    duration: "month",
    reset: "monthly",
    upgrade_group: "premium",
  },
  {
    id: 3,
    title: "Scale",
    subtitle: "Reserved capacity. Priority routing.",
    price: 500,
    total: 700,
    duration: "month",
    reset: "monthly",
    upgrade_group: "premium",
  },
];

export const ACTIVE_SUBSCRIPTION = {
  id: 778,
  plan_id: 1,
  title: "Builder",
  started_at: "2026-04-28T10:00:00Z",
  next_renewal_at: "2026-05-28T10:00:00Z",
  remaining: 8.42,
  total: 25.0,
};

export type Bill = {
  id: number;
  type: "topup" | "subscription" | "redemption";
  status: "completed" | "pending" | "failed";
  ts: string;
  method: "Stripe" | "Code";
  amount: number;
  reference: string;
};

export const BILLS: Bill[] = [
  {
    id: 30412,
    type: "subscription",
    status: "completed",
    ts: "2026-04-28T10:00:01Z",
    method: "Stripe",
    amount: 20.0,
    reference: "sub_renew_778",
  },
  {
    id: 30401,
    type: "topup",
    status: "completed",
    ts: "2026-04-22T17:40:33Z",
    method: "Stripe",
    amount: 100.0,
    reference: "ch_3PwSdK7yZ",
  },
  {
    id: 30387,
    type: "redemption",
    status: "completed",
    ts: "2026-04-08T09:14:00Z",
    method: "Code",
    amount: 25.0,
    reference: "FLINT-LAUNCH-25",
  },
  {
    id: 30354,
    type: "topup",
    status: "completed",
    ts: "2026-03-30T11:02:08Z",
    method: "Stripe",
    amount: 50.0,
    reference: "ch_3OwLpA1tH",
  },
  {
    id: 30350,
    type: "topup",
    status: "failed",
    ts: "2026-03-30T10:58:22Z",
    method: "Stripe",
    amount: 50.0,
    reference: "ch_3OwLkB6vX",
  },
];

export const AFF = {
  code: "KAI-NORDHERD",
  link: "https://flint.dev/?ref=KAI-NORDHERD",
  signups: 14,
  paying: 6,
  earnings: 23.42,
  pending: 4.18,
};

export const USAGE_TIMESERIES = [
  { day: "May 04", cost: 11.42, requests: 2104 },
  { day: "May 05", cost: 9.31, requests: 1820 },
  { day: "May 06", cost: 14.07, requests: 2412 },
  { day: "May 07", cost: 22.18, requests: 3010 },
  { day: "May 08", cost: 18.92, requests: 2756 },
  { day: "May 09", cost: 15.61, requests: 2340 },
  { day: "May 10", cost: 7.04, requests: 1102 },
];

export const MODEL_USAGE = [
  { model: "claude-sonnet-4-6", requests: 6240, share: 0.34, cost: 41.18 },
  { model: "gpt-5", requests: 4180, share: 0.23, cost: 33.94 },
  { model: "claude-haiku-4-5", requests: 3300, share: 0.18, cost: 4.62 },
  { model: "deepseek-v3", requests: 2640, share: 0.14, cost: 1.41 },
  { model: "gemini-2-flash", requests: 1280, share: 0.07, cost: 0.81 },
  { model: "claude-opus-4-7", requests: 789, share: 0.04, cost: 12.4 },
];

export const CHAT_CLIENTS = [
  {
    id: 0,
    name: "Cherry Studio",
    description: "Cross-platform chat client with multi-model support.",
    template: "cherry://...{address}...{key}",
  },
  {
    id: 1,
    name: "Lobe Chat",
    description: "Open-source chat UI with plugins.",
    template: "https://chat-preview.lobehub.com/?baseUrl={address}&key={key}",
  },
  {
    id: 2,
    name: "OpenCat",
    description: "Native macOS / iOS chat client.",
    template: "opencat://config?host={address}&apiKey={key}",
  },
  {
    id: 3,
    name: "AI as Workspace",
    description: "Chat-driven workspace for research and writing.",
    template: "https://aiaw.app/connect?base={address}&token={key}",
  },
];

export const API_INFO = [
  {
    label: "Service base",
    url: "https://api.flint.dev",
    description: "OpenAI-compatible base URL. Use this for SDK clients.",
    color: "brand",
  },
  {
    label: "Region",
    url: "us-east-1",
    description: "Primary inference region for your group.",
    color: "info",
  },
];

export const FAQ = [
  {
    q: "How do I get started?",
    a: "Issue an API key from /console/token, then point your existing client at https://api.flint.dev. The API is OpenAI-compatible.",
  },
  {
    q: "How is billing calculated?",
    a: "Per-million-token pricing is shown on the pricing page. Charges are deducted from your wallet balance after each successful request.",
  },
  {
    q: "Can I limit a key to specific models?",
    a: "Yes. When creating or editing a key, set Model limits to the exact model ids the key is allowed to call.",
  },
];

export const UPTIME = [
  { name: "Inference (us-east)", status: "operational" as const, uptime: 99.99 },
  { name: "Control plane", status: "operational" as const, uptime: 99.98 },
  { name: "Webhooks", status: "operational" as const, uptime: 99.97 },
  {
    name: "Stripe billing",
    status: "degraded" as const,
    uptime: 99.21,
  },
];

export function fmtMoney(n: number, currency: "USD" | "CNY" = "USD"): string {
  const sym = currency === "USD" ? "$" : "¥";
  const v = currency === "USD" ? n : n * 7.18;
  return `${sym}${v.toFixed(v < 1 ? 4 : 2)}`;
}

export function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}

export function fmtRelative(iso: string): string {
  const now = new Date("2026-05-10T12:00:00Z").getTime();
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}
