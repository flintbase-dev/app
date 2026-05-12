import type { DisplayContext } from "@/lib/console/format";

export type PageInfo<T> = {
  page: number;
  page_size: number;
  total: number;
  items: T[];
};

export type ConsoleStatus = DisplayContext & {
  systemName: string;
  serverAddress: string;
  docsLink: string;
  siteCreditsPerPriceUnit: number;
  currencySymbol: string;
  quotaDisplayType: string;
  stripeUnitPrice: number;
  setup: boolean;
  checkinEnabled: boolean;
  apiInfoEnabled: boolean;
  faqEnabled: boolean;
  apiInfo: { label: string; url: string }[];
  faq: { q: string; a: string }[];
  chats: ChatClient[];
};

export type ConsoleUser = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  workosId: string;
  workosOrganizationId: string;
  authMethod: string;
  role: number;
  roleLabel: "user" | "admin" | "root";
  group: string;
  balance: number;
  used: number;
  requestCount: number;
  language: string;
  quotaWarningThreshold: number;
  upstreamModelUpdateNotifyEnabled: boolean;
  acceptUnsetModelPriceModel: boolean;
  recordIpLog: boolean;
  accessToken: string;
  affCode: string;
  affCount: number;
  affQuota: number;
  affHistoryQuota: number;
};

export type Token = {
  id: string;
  name: string;
  status: number;
  group: string;
  crossGroupRetry: boolean;
  expiredAt: number;
  createdAt: number;
  remainAmount: number;
  remainCredits: number;
  unlimitedQuota: boolean;
  used: number;
  usedCredits: number;
  lastUsedAt: number;
  modelLimits: string[];
  allowIps: string[];
  keyPreview: string;
};

export type UserGroup = {
  name: string;
  ratio: string;
  label: string;
};

export type LogEntry = {
  id: string;
  category: "usage" | "error" | "security" | "activity" | "audit" | "internal";
  ts: number;
  tokenName: string;
  model: string;
  group: string;
  endpoint: string;
  requestId: string;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  cost: number;
  latencyMs: number;
  channel: string;
  status: "ok" | "fail" | "warn";
  message?: string;
  ip?: string;
};

export type InboxItem = {
  id: string;
  itemType: "message" | "broadcast";
  title: string;
  preview: string;
  content: string;
  createdAt: number;
  readAt: number | null;
};

export type PricingModel = {
  id: string;
  vendor: string;
  endpoints: string[];
  context: number;
  input: number;
  output: number;
  groups: string[];
  tags: string[];
  desc: string;
  ratio: number;
};

export type TopupInfo = {
  enableStripeTopup: boolean;
  stripeMinTopup: number;
  stripePublishableKey: string;
  stripeUnitPrice: number;
  topupGroupRatio: number;
  amountOptions: number[];
  discount: Record<string, number>;
  topupLink: string;
};

export type InvoiceRecord = {
  id: string;
  reference: string;
  type: "topup" | "subscription" | "redemption";
  method: string;
  status: "completed" | "pending" | "failed" | "expired";
  ts: number;
  amount: number;
  money: number;
  creditUnits: number;
  topupUnits: number;
  currency: string;
  hostedInvoiceUrl: string;
  invoicePdf: string;
  receiptUrl: string;
  invoiceNumber: string;
};

export type CheckoutResult = {
  paymentOrderId: string;
  checkoutSessionId: string;
  invoiceId: string;
  paymentIntentId: string;
  tradeNo: string;
  kind: string;
  status: "completed" | "failed" | "expired" | "pending";
  amount: number;
  money: number;
  creditUnits: number;
  topupUnits: number;
  currency: string;
  paymentMethod: string;
  invoiceNumber: string;
  hostedInvoiceUrl: string;
  invoicePdf: string;
  receiptUrl: string;
  createdAt: number;
  completedAt: number;
};

export type SubscriptionPlan = {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  total: number;
  reset: string;
  duration: string;
  maxPurchasePerUser: number;
  upgradeGroup: string;
  enabled: boolean;
};

export type SubscriptionState = {
  billingPreference: string;
  subscriptions: ActiveSubscription[];
  allSubscriptions: ActiveSubscription[];
};

export type ActiveSubscription = {
  id: string;
  planId: string;
  planTitle: string;
  total: number;
  remaining: number;
  nextRenewalAt: number;
};

export type ChatClient = {
  id: string;
  name: string;
  description: string;
  template: string;
};
